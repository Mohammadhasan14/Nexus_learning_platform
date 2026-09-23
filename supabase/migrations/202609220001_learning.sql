-- Immutable content versions; answer keys are never exposed through the Data API.
create schema if not exists learning_private;
revoke all on schema learning_private from public, anon, authenticated;
create table public.course_versions (
 id text primary key,
 title text not null,
 summary text not null,
 version integer not null check(version > 0),
 review_status text not null check(review_status in ('preview','reviewed')),
 unique(title,version)
);
create table public.lessons (
 id text primary key,
 course_id text not null references public.course_versions(id),
 position integer not null check(position>0),
 title text not null,
 objective text not null,
 body text not null,
 example text not null,
 minutes integer not null check(minutes>0),
 unique(course_id,position)
);
create table public.exercises (
 id text primary key,
 lesson_id text not null references public.lessons(id),
 kind text not null check(kind in ('practice','diagnostic')),
 prompt text not null,
 options jsonb not null check(jsonb_typeof(options)='array'),
 unique(lesson_id,kind)
);
create table learning_private.answer_keys (
 exercise_id text primary key references public.exercises(id),
 answer text not null,
 hint text not null,
 explanation text not null
);
create table public.enrolments (
 user_id uuid not null references auth.users(id) on delete cascade,
 course_id text not null references public.course_versions(id),
 enrolled_at timestamptz not null default now(),
 primary key(user_id,course_id)
);
create table public.lesson_reads (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id text not null references public.lessons(id),
 read_at timestamptz not null default now(),
 primary key(user_id,lesson_id)
);
create table public.attempts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 exercise_id text not null references public.exercises(id),
 request_id uuid not null,
 answer text not null check(length(answer) between 1 and 100),
 correct boolean not null,
 feedback text not null,
 created_at timestamptz not null default now(),
 unique(user_id,request_id)
);
create index attempts_owner_exercise on public.attempts(user_id,exercise_id,created_at desc);

alter table public.course_versions enable row level security;
alter table public.lessons enable row level security;
alter table public.exercises enable row level security;
alter table public.enrolments enable row level security;
alter table public.lesson_reads enable row level security;
alter table public.attempts enable row level security;
alter table learning_private.answer_keys enable row level security;
revoke all on public.course_versions,public.lessons,public.exercises,public.enrolments,public.lesson_reads,public.attempts from anon,authenticated;
grant select on public.course_versions,public.lessons,public.exercises,public.enrolments,public.lesson_reads,public.attempts to authenticated;
create policy course_read on public.course_versions for select to authenticated using(true);
create policy lesson_read on public.lessons for select to authenticated using(true);
create policy exercise_read on public.exercises for select to authenticated using(true);
create policy own_enrolment on public.enrolments for select to authenticated using(user_id=(select auth.uid()));
create policy own_read on public.lesson_reads for select to authenticated using(user_id=(select auth.uid()));
create policy own_attempt on public.attempts for select to authenticated using(user_id=(select auth.uid()));

create function public.enrol_course(course text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if not exists(select 1 from public.profiles where user_id=auth.uid() and onboarding_completed_at is not null) then
  raise exception 'Complete onboarding first' using errcode='42501';
 end if;
 insert into public.enrolments(user_id,course_id) values(auth.uid(),course) on conflict do nothing;
end $$;

create function learning_private.can_practice(learner uuid, lesson text) returns boolean
language sql stable set search_path='' as $$
 select exists(select 1 from public.lessons l join public.enrolments n on n.course_id=l.course_id
  where l.id=lesson and n.user_id=learner)
 and not exists(
  select 1 from public.lessons earlier join public.lessons target on earlier.course_id=target.course_id
  where target.id=lesson and earlier.position<target.position
  and not exists(select 1 from public.attempts a join public.exercises e on e.id=a.exercise_id
   where a.user_id=learner and a.correct and e.kind='practice' and e.lesson_id=earlier.id)
 );
$$;
create function public.mark_lesson_read(lesson text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not learning_private.can_practice(auth.uid(),lesson) then
  raise exception 'Enrol and complete prerequisite practice first' using errcode='42501';
 end if;
 insert into public.lesson_reads(user_id,lesson_id) values(auth.uid(),lesson) on conflict do nothing;
end $$;

create function public.submit_attempt(exercise text, submitted text, request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid(); item public.exercises; old public.attempts; key learning_private.answer_keys; result public.attempts;
begin
 if learner is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if request is null or submitted is null or length(submitted) not between 1 and 100 then
  raise exception 'Invalid submission' using errcode='22023';
 end if;
 -- Serialize retries for a learner. A committed idempotency key always returns its original result.
 perform pg_advisory_xact_lock(hashtextextended(learner::text,0));
 select * into old from public.attempts where user_id=learner and request_id=request;
 if found then
  if old.exercise_id<>exercise or old.answer<>submitted then raise exception 'Submission key already used' using errcode='22023'; end if;
  return jsonb_build_object('id',old.id,'correct',old.correct,'feedback',old.feedback);
 end if;
 select * into item from public.exercises where id=exercise;
 if not found then raise exception 'Unknown exercise' using errcode='22023'; end if;
 if not exists(select 1 from public.enrolments n join public.lessons l on l.course_id=n.course_id where n.user_id=learner and l.id=item.lesson_id) then
  raise exception 'Enrol first' using errcode='42501';
 end if;
 if item.kind='practice' and not learning_private.can_practice(learner,item.lesson_id) then
  raise exception 'Complete prerequisite practice first' using errcode='42501';
 end if;
 if not exists(select 1 from jsonb_array_elements(item.options) o where o->>'id'=submitted) then
  raise exception 'Choose an available option' using errcode='22023';
 end if;
 select * into key from learning_private.answer_keys where exercise_id=exercise;
 if not found then raise exception 'Grading temporarily unavailable'; end if;
 insert into public.attempts(user_id,exercise_id,request_id,answer,correct,feedback)
 values(learner,exercise,request,submitted,submitted=key.answer,
  case when submitted=key.answer then key.explanation else key.hint end) returning * into result;
 return jsonb_build_object('id',result.id,'correct',result.correct,'feedback',result.feedback);
end $$;
revoke all on function public.enrol_course(text),public.mark_lesson_read(text),public.submit_attempt(text,text,uuid) from public,anon;
grant execute on function public.enrol_course(text),public.mark_lesson_read(text),public.submit_attempt(text,text,uuid) to authenticated;
revoke all on all functions in schema learning_private from public,anon,authenticated;
