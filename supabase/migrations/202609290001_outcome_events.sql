-- Forward-only, server-derived learning evidence. No answers, code, notes or chat payloads.
create table public.learning_outcome_events (
 attempt_id uuid primary key references public.attempts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 exercise_id text not null references public.exercises(id),
 lesson_id text not null references public.lessons(id),
 course_id text not null references public.course_versions(id),
 kind text not null check(kind in ('practice','diagnostic')),
 correct boolean not null,
 occurred_at timestamptz not null,
 prior_task_attempts integer not null check(prior_task_attempts>=0),
 prior_lesson_attempts integer not null check(prior_lesson_attempts>=0),
 recorded_tutor_use boolean not null,
 previous_correct boolean,
 elapsed_seconds bigint check(elapsed_seconds>=0),
 policy_version text not null default 'outcomes-v1' check(policy_version='outcomes-v1')
);
create index outcome_owner_time on public.learning_outcome_events(user_id,occurred_at desc);
alter table public.learning_outcome_events enable row level security;
revoke all on public.learning_outcome_events from public,anon,authenticated;
grant select on public.learning_outcome_events to authenticated;
create policy own_outcomes on public.learning_outcome_events for select to authenticated using(user_id=auth.uid());
create function learning_private.capture_outcome() returns trigger
language plpgsql security definer set search_path='' as $$
declare item public.exercises; course text; previous public.attempts; task_count integer; lesson_count integer;
begin
 select * into item from public.exercises where id=new.exercise_id;
 select course_id into course from public.lessons where id=item.lesson_id;
 select count(*) into task_count from public.attempts a where a.user_id=new.user_id and a.exercise_id=new.exercise_id and a.id<>new.id;
 select count(*) into lesson_count from public.attempts a join public.exercises e on e.id=a.exercise_id where a.user_id=new.user_id and e.lesson_id=item.lesson_id and a.id<>new.id;
 select * into previous from public.attempts a where a.user_id=new.user_id and a.exercise_id=new.exercise_id and a.id<>new.id order by a.created_at desc,a.id desc limit 1;
 insert into public.learning_outcome_events(attempt_id,user_id,exercise_id,lesson_id,course_id,kind,correct,occurred_at,prior_task_attempts,prior_lesson_attempts,recorded_tutor_use,previous_correct,elapsed_seconds)
 values(new.id,new.user_id,new.exercise_id,item.lesson_id,course,item.kind,new.correct,new.created_at,task_count,lesson_count,
 exists(select 1 from tutor_private.requests r where r.user_id=new.user_id and r.lesson_id=item.lesson_id),
 previous.correct,case when previous.id is not null then greatest(0,floor(extract(epoch from new.created_at-previous.created_at)))::bigint end);
 return new;
end $$;
revoke all on function learning_private.capture_outcome() from public,anon,authenticated;
create trigger capture_learning_outcome after insert on public.attempts for each row execute function learning_private.capture_outcome();

-- Aggregates see all of the caller's events, not only the recent-history limit.
create view public.learning_outcome_summary with(security_invoker=true) as
 select user_id,course_id,
 count(*) filter(where kind='practice') as practice_checks,
 count(*) filter(where kind='practice' and prior_lesson_attempts=0 and not recorded_tutor_use) as initial_checks,
 count(*) filter(where kind='practice' and prior_lesson_attempts=0 and not recorded_tutor_use and correct) as initial_passed,
 count(*) filter(where kind='practice' and previous_correct and elapsed_seconds>=86400 and not recorded_tutor_use) as delayed_checks,
 count(*) filter(where kind='practice' and previous_correct and elapsed_seconds>=86400 and not recorded_tutor_use and correct) as delayed_passed
 from public.learning_outcome_events group by user_id,course_id;
revoke all on public.learning_outcome_summary from public,anon,authenticated;
grant select on public.learning_outcome_summary to authenticated;
