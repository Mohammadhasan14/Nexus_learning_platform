-- Aggregate every attempt under the caller's RLS; recent-history pagination cannot erase skill evidence.
create view public.exercise_evidence with (security_invoker=true) as
 select user_id, exercise_id, bool_or(correct) as demonstrated,
 min(created_at) filter(where correct) as first_demonstrated_at,
 count(*) as attempt_count
 from public.attempts group by user_id,exercise_id;
revoke all on public.exercise_evidence from anon,authenticated;
grant select on public.exercise_evidence to authenticated;
