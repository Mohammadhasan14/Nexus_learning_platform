-- Review dates are derived on read in the learner's current timezone; no daily job.
create view public.review_schedule with (security_invoker=true) as
 with latest as (
  select distinct on (a.user_id,a.exercise_id) a.user_id,a.exercise_id,a.id as attempt_id,a.correct,a.created_at
  from public.attempts a join public.exercises e on e.id=a.exercise_id
  where e.kind='practice'
  order by a.user_id,a.exercise_id,a.created_at desc,a.id desc
 ), scheduled as (
  select a.*,e.lesson_id,l.course_id,l.title,p.timezone,
   (a.created_at at time zone p.timezone)::date + case when a.correct then 3 else 1 end as due_date,
   (statement_timestamp() at time zone p.timezone)::date as today
  from latest a join public.exercises e on e.id=a.exercise_id
  join public.lessons l on l.id=e.lesson_id join public.profiles p on p.user_id=a.user_id
  join public.enrolments n on n.user_id=a.user_id and n.course_id=l.course_id
 )
 select *,due_date<=today as due,'calendar-review-v1'::text as policy_version from scheduled;
revoke all on public.review_schedule from anon,authenticated;
grant select on public.review_schedule to authenticated;

create table public.project_versions (
 id text primary key,
 course_id text not null references public.course_versions(id),
 title text not null,
 version integer not null check(version>0),
 brief text not null,
 rubric jsonb not null check(jsonb_typeof(rubric)='array'),
 unique(course_id,version)
);
create table public.project_submissions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 project_id text not null references public.project_versions(id),
 revision integer not null check(revision>0),
 request_id uuid not null,
 base_revision integer not null check(base_revision>=0),
 milestones jsonb not null,
 feedback jsonb not null,
 feedback_version text not null default 'completeness-v1',
 created_at timestamptz not null default now(),
 unique(user_id,project_id,revision),
 unique(user_id,request_id)
);
create index project_submissions_owner on public.project_submissions(user_id,project_id,revision desc);
alter table public.project_versions enable row level security;
alter table public.project_submissions enable row level security;
revoke all on public.project_versions,public.project_submissions from anon,authenticated;
grant select on public.project_versions,public.project_submissions to authenticated;
create policy project_catalogue on public.project_versions for select to authenticated using(true);
create policy own_project_submissions on public.project_submissions for select to authenticated using(user_id=(select auth.uid()));
insert into public.project_versions(id,course_id,title,version,brief,rubric) values (
 'study-planner-v1','javascript-foundations-v2','Build a study planner',1,
 'Design a small JavaScript study planner. Choose a number of available minutes, use a condition to choose a short or longer study activity, and put the decision in a function that returns a recommendation. Submit code and an explanation for each milestone. Code is stored as text and never executed here.',
 '[{"id":"values","title":"Choose your values","prompt":"Show your available-minutes binding and explain its type and whether it changes."},{"id":"conditions","title":"Choose an activity","prompt":"Show your condition and both branches. Explain what happens at the boundary and give an example for each branch."},{"id":"functions","title":"Return a recommendation","prompt":"Show a function with a minutes parameter and a returned recommendation. Explain the difference between return and logging, and include two example calls."}]'
);

create function public.submit_project(project text, request uuid, base integer, work jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid(); item public.project_versions; old public.project_submissions;
 latest integer; criterion jsonb; feedback jsonb:='[]'; result public.project_submissions;
begin
 if learner is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if request is null or base is null or base<0 or work is null or jsonb_typeof(work)<>'object' then raise exception 'Invalid revision' using errcode='22023'; end if;
 if not exists(select 1 from public.profiles where user_id=learner and onboarding_completed_at is not null) then raise exception 'Complete onboarding first' using errcode='42501'; end if;
 select * into item from public.project_versions where id=project;
 if not found then raise exception 'Unknown project' using errcode='22023'; end if;
 if not exists(select 1 from public.enrolments where user_id=learner and course_id=item.course_id)
 or exists(select 1 from public.lessons l join public.exercises e on e.lesson_id=l.id and e.kind='practice'
  where l.course_id=item.course_id and not exists(select 1 from public.attempts a where a.user_id=learner and a.exercise_id=e.id and a.correct)) then
  raise exception 'Complete course practice first' using errcode='42501';
 end if;
 if (select count(*) from jsonb_object_keys(work))<>jsonb_array_length(item.rubric) then raise exception 'Use the current rubric fields' using errcode='22023'; end if;
 for criterion in select value from jsonb_array_elements(item.rubric) loop
  if not(work ? (criterion->>'id')) or jsonb_typeof(work->(criterion->>'id'))<>'string'
  or length(work->>(criterion->>'id'))>4000 then raise exception 'Each milestone must be text up to 4000 characters' using errcode='22023'; end if;
  feedback:=feedback || jsonb_build_array(jsonb_build_object('id',criterion->>'id','title',criterion->>'title','message',
   case when length(btrim(work->>(criterion->>'id'))) < 80
    then 'Add more detail: ' || (criterion->>'prompt')
    else 'Detail recorded. Compare your explanation and examples against this criterion; length does not verify correctness.' end));
 end loop;
 if not exists(select 1 from jsonb_each_text(work) where length(btrim(value))>0) then raise exception 'Add at least one milestone' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(learner::text,5));
 select * into old from public.project_submissions where user_id=learner and request_id=request;
 if found then
  if old.project_id<>project or old.milestones<>work or old.base_revision<>base then raise exception 'Revision key already used' using errcode='22023'; end if;
  return jsonb_build_object('revision',old.revision,'id',old.id);
 end if;
 select coalesce(max(revision),0) into latest from public.project_submissions where user_id=learner and project_id=project;
 if base<>latest then raise exception 'A newer revision exists. Reload before saving again.' using errcode='40001'; end if;
 insert into public.project_submissions(user_id,project_id,revision,request_id,base_revision,milestones,feedback)
 values(learner,project,latest+1,request,base,work,feedback) returning * into result;
 return jsonb_build_object('revision',result.revision,'id',result.id);
end $$;
revoke all on function public.submit_project(text,uuid,integer,jsonb) from public,anon;
grant execute on function public.submit_project(text,uuid,integer,jsonb) to authenticated;
