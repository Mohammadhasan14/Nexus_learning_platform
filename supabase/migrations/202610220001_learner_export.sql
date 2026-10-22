-- A single statement snapshot of explicitly selected learner records.
-- No owner argument, Auth internals, grading keys, staff notes or global usage.
create function public.export_learner_data() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare learner uuid:=auth.uid(); result jsonb;
begin
 if learner is null or not exists(select 1 from public.profiles where user_id=learner) then
  raise exception 'Sign in required' using errcode='42501';
 end if;
 result:=jsonb_build_object(
  'format','nexus-learner-export-v1',
  'exported_at',statement_timestamp(),
  'profile',(select to_jsonb(p) from (
   select user_id,display_name,goal,daily_minutes,locale,timezone,onboarding_completed_at,created_at,updated_at
   from public.profiles where user_id=learner
  ) p),
  'staff_role',(select role from public.staff_roles where user_id=learner),
  'enrolments',(select coalesce(jsonb_agg(to_jsonb(e) order by course_id),'[]'::jsonb) from (
   select course_id,enrolled_at from public.enrolments where user_id=learner
  ) e),
  'lesson_reads',(select coalesce(jsonb_agg(to_jsonb(r) order by lesson_id),'[]'::jsonb) from (
   select lesson_id,read_at from public.lesson_reads where user_id=learner
  ) r),
  'attempts',(select coalesce(jsonb_agg(to_jsonb(a) order by created_at,id),'[]'::jsonb) from (
   select id,exercise_id,request_id,answer,correct,feedback,created_at from public.attempts where user_id=learner
  ) a),
  'lesson_notes',(select coalesce(jsonb_agg(to_jsonb(n) order by lesson_id),'[]'::jsonb) from (
   select lesson_id,body,revision,request_id,updated_at from public.lesson_notes where user_id=learner
  ) n),
  'project_submissions',(select coalesce(jsonb_agg(to_jsonb(p) order by project_id,revision),'[]'::jsonb) from (
   select id,project_id,revision,request_id,base_revision,milestones,feedback,feedback_version,created_at
   from public.project_submissions where user_id=learner
  ) p),
  'outcome_events',(select coalesce(jsonb_agg(to_jsonb(e) order by occurred_at,attempt_id),'[]'::jsonb) from (
   select attempt_id,exercise_id,lesson_id,course_id,kind,correct,occurred_at,prior_task_attempts,
    prior_lesson_attempts,recorded_tutor_use,previous_correct,elapsed_seconds,policy_version
   from public.learning_outcome_events where user_id=learner
  ) e),
  'content_reports',(select coalesce(jsonb_agg(to_jsonb(r) order by created_at,id),'[]'::jsonb) from (
   select id,request_id,lesson_id,tutor_request,message,snapshot,status,created_at
   from public.content_reports where user_id=learner
  ) r),
  'tutor_requests',(select coalesce(jsonb_agg(to_jsonb(r) order by day,request_id),'[]'::jsonb) from (
   select request_id,day,lesson_id,intent,mode,reserved,actual,response_snapshot,completed_at,
    token_reserved,token_usage,token_finalized_at from tutor_private.requests where user_id=learner
  ) r),
  'daily_tutor_usage',(select coalesce(jsonb_agg(to_jsonb(b) order by day),'[]'::jsonb) from (
   select day,used from tutor_private.buckets where user_id=learner
  ) b),
  'daily_token_usage',(select coalesce(jsonb_agg(to_jsonb(b) order by day),'[]'::jsonb) from (
   select day,charged from tutor_private.token_buckets where user_id=learner
  ) b)
 );
 -- Fail the entire export rather than silently returning partial history.
 if octet_length(result::text)>8388608 then
  raise exception 'Export exceeds download limit' using errcode='54000';
 end if;
 return result;
end $$;
revoke all on function public.export_learner_data() from public,anon;
grant execute on function public.export_learner_data() to authenticated;
comment on function public.export_learner_data() is 'Owner-only learner export v1; explicit columns and a single database snapshot. No staff-wide access.';
