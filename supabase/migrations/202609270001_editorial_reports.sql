create function public.is_content_staff() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.staff_roles where user_id=auth.uid() and role in ('editor','admin'));
$$;
revoke all on function public.is_content_staff() from public,anon;
grant execute on function public.is_content_staff() to authenticated;
create table public.content_drafts (
 id uuid primary key,
 source_course text not null references public.course_versions(id),
 content jsonb not null,
 revision integer not null default 1,
 reviewed_revision integer,
 review_note text,
 reviewer uuid references auth.users(id) on delete set null,
 published_course text references public.course_versions(id),
 created_at timestamptz not null default now()
);
create table public.content_audit (
 id uuid primary key default gen_random_uuid(),
 actor uuid references auth.users(id) on delete set null,
 action text not null,
 draft_id uuid references public.content_drafts(id) on delete set null,
 before_state jsonb,
 after_state jsonb,
 created_at timestamptz not null default now()
);
alter table public.content_drafts enable row level security;
alter table public.content_audit enable row level security;
revoke all on public.content_drafts,public.content_audit from anon,authenticated;
grant select on public.content_drafts,public.content_audit to authenticated;
create policy staff_drafts on public.content_drafts for select to authenticated using((select public.is_content_staff()));
create policy staff_audit on public.content_audit for select to authenticated using((select public.is_content_staff()));

create function public.create_content_draft(source text, request uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare payload jsonb; old public.content_drafts;
begin
 if not public.is_content_staff() then raise exception 'Staff required' using errcode='42501'; end if;
 if request is null then raise exception 'Request required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(request::text,25));
 select * into old from public.content_drafts where id=request;
 if found then
  if old.source_course<>source then raise exception 'Draft key already used'; end if;
  return old.id;
 end if;
 if not exists(select 1 from public.course_versions where id=source and review_status='reviewed')
 or exists(select 1 from public.course_versions where supersedes_id=source) then raise exception 'Choose the current reviewed version'; end if;
 select jsonb_object_agg(id,jsonb_build_object('title',title,'objective',objective,'body',body,'example',example)) into payload from public.lessons where course_id=source;
 if payload is null then raise exception 'Course has no lessons'; end if;
 insert into public.content_drafts(id,source_course,content) values(request,source,payload);
 insert into public.content_audit(actor,action,draft_id,after_state) values(auth.uid(),'create',request,payload);
 return request;
end $$;
create function public.save_content_draft(draft uuid, expected integer, content jsonb) returns void language plpgsql security definer set search_path='' as $$
declare old public.content_drafts; item record; field text;
begin
 if not public.is_content_staff() then raise exception 'Staff required' using errcode='42501'; end if;
 select * into old from public.content_drafts where id=draft for update;
 if not found or old.published_course is not null then raise exception 'Draft unavailable'; end if;
 if expected is null or expected<>old.revision then raise exception 'Draft changed. Reload before saving.' using errcode='40001'; end if;
 if content is null or jsonb_typeof(content)<>'object' or (select count(*) from jsonb_object_keys(content))<>(select count(*) from jsonb_object_keys(old.content)) then raise exception 'Keep all lesson fields'; end if;
 for item in select key from jsonb_each(old.content) loop
  if not(content ? item.key) or jsonb_typeof(content->item.key)<>'object' or (select count(*) from jsonb_object_keys(content->item.key))<>4 then raise exception 'Keep all lesson fields'; end if;
  foreach field in array array['title','objective','body','example'] loop
   if jsonb_typeof(content->item.key->field) is distinct from 'string' or length(btrim(content->item.key->>field)) not between 1 and (case when field in ('body','example') then 12000 else 500 end) then raise exception 'Invalid lesson text'; end if;
  end loop;
 end loop;
 update public.content_drafts d set content=save_content_draft.content,revision=revision+1,reviewed_revision=null,reviewer=null,review_note=null where id=draft;
 insert into public.content_audit(actor,action,draft_id,before_state,after_state) values(auth.uid(),'edit',draft,old.content,content);
end $$;
create function public.review_content_draft(draft uuid, expected integer, note text) returns void language plpgsql security definer set search_path='' as $$
declare old public.content_drafts;
begin
 if not public.is_content_staff() then raise exception 'Staff required' using errcode='42501'; end if;
 select * into old from public.content_drafts where id=draft for update;
 if not found or old.published_course is not null then raise exception 'Draft unavailable'; end if;
 if expected is null or expected<>old.revision then raise exception 'Draft changed. Reload before reviewing.' using errcode='40001'; end if;
 if note is null or length(btrim(note)) not between 20 and 2000 then raise exception 'Record the review outcome'; end if;
 update public.content_drafts set reviewed_revision=revision,reviewer=auth.uid(),review_note=note where id=draft;
 insert into public.content_audit(actor,action,draft_id,after_state) values(auth.uid(),'review',draft,jsonb_build_object('revision',old.revision,'note',note));
end $$;
create function public.content_review_material(draft uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if not public.is_content_staff() then raise exception 'Staff required' using errcode='42501'; end if;
 select jsonb_agg(jsonb_build_object('lesson',l.title,'kind',e.kind,'prompt',e.prompt,'options',e.options,'answer',k.answer,'hint',k.hint,'explanation',k.explanation) order by l.position,e.kind)
 into result from public.content_drafts d join public.lessons l on l.course_id=d.source_course join public.exercises e on e.lesson_id=l.id join learning_private.answer_keys k on k.exercise_id=e.id where d.id=draft;
 return result;
end $$;
create function public.publish_content_draft(draft uuid, expected integer) returns text language plpgsql security definer set search_path='' as $$
declare d public.content_drafts; source public.course_versions; l public.lessons; e public.exercises; target text; new_lesson text; new_exercise text;
begin
 if not public.is_content_staff() then raise exception 'Staff required' using errcode='42501'; end if;
 select * into d from public.content_drafts where id=draft for update;
 if not found then raise exception 'Draft unavailable'; end if;
 if expected is null or d.revision<>expected then raise exception 'Draft changed. Reload before publishing.' using errcode='40001'; end if;
 if d.published_course is not null then return d.published_course; end if;
 if d.reviewed_revision is distinct from d.revision or d.reviewer is null then raise exception 'Review this revision before publishing'; end if;
 perform pg_advisory_xact_lock(hashtextextended(d.source_course,25));
 select * into source from public.course_versions where id=d.source_course;
 if exists(select 1 from public.course_versions where supersedes_id=d.source_course) then raise exception 'Source already superseded'; end if;
 if exists(select 1 from public.lessons x join public.exercises q on q.lesson_id=x.id left join learning_private.answer_keys k on k.exercise_id=q.id where x.course_id=d.source_course and k.exercise_id is null) then raise exception 'Source grading incomplete'; end if;
 target:='course-'||d.id::text;
 insert into public.course_versions(id,title,summary,version,review_status,supersedes_id,review_record)
 values(target,source.title,source.summary,source.version+1,'reviewed',source.id,'Staff review by '||d.reviewer::text||': '||d.review_note);
 for l in select * from public.lessons where course_id=source.id order by position loop
  new_lesson:='lesson-'||d.id::text||'-'||l.position;
  insert into public.lessons(id,course_id,position,title,objective,body,example,minutes)
  values(new_lesson,target,l.position,d.content->l.id->>'title',d.content->l.id->>'objective',d.content->l.id->>'body',d.content->l.id->>'example',l.minutes);
  for e in select * from public.exercises where public.exercises.lesson_id=l.id loop
   new_exercise:='exercise-'||d.id::text||'-'||l.position||'-'||e.kind;
   insert into public.exercises(id,lesson_id,kind,prompt,options) values(new_exercise,new_lesson,e.kind,e.prompt,e.options);
   insert into learning_private.answer_keys(exercise_id,answer,hint,explanation) select new_exercise,k.answer,k.hint,k.explanation from learning_private.answer_keys k where k.exercise_id=e.id;
  end loop;
 end loop;
 insert into public.project_versions(id,course_id,title,version,brief,rubric)
 select 'project-'||d.id::text||'-'||p.version,target,p.title,p.version+1,p.brief,p.rubric from public.project_versions p where p.course_id=source.id;
 update public.content_drafts set published_course=target where id=draft;
 insert into public.content_audit(actor,action,draft_id,after_state) values(auth.uid(),'publish',draft,jsonb_build_object('course',target,'source',source.id,'revision',d.revision,'reviewer',d.reviewer,'note',d.review_note));
 return target;
end $$;
revoke all on function public.create_content_draft(text,uuid),public.save_content_draft(uuid,integer,jsonb),public.review_content_draft(uuid,integer,text),public.content_review_material(uuid),public.publish_content_draft(uuid,integer) from public,anon;
grant execute on function public.create_content_draft(text,uuid),public.save_content_draft(uuid,integer,jsonb),public.review_content_draft(uuid,integer,text),public.content_review_material(uuid),public.publish_content_draft(uuid,integer) to authenticated;

create table public.content_reports (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete set null,
 request_id uuid not null,
 lesson_id text not null references public.lessons(id),
 tutor_request uuid,
 message text not null check(length(btrim(message)) between 10 and 2000),
 snapshot jsonb not null,
 status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')),
 staff_note text not null default '',
 revision integer not null default 1,
 created_at timestamptz not null default now(),
 unique(user_id,request_id)
);
create index content_reports_owner on public.content_reports(user_id,created_at desc);
create table public.report_audit (
 id uuid primary key default gen_random_uuid(),
 report_id uuid not null references public.content_reports(id),
 actor uuid references auth.users(id) on delete set null,
 status text not null,
 note text not null,
 created_at timestamptz not null default now()
);
alter table public.content_reports enable row level security;
alter table public.report_audit enable row level security;
revoke all on public.content_reports,public.report_audit from anon,authenticated;
grant select on public.content_reports,public.report_audit to authenticated;
create policy reports_visible on public.content_reports for select to authenticated using(user_id=(select auth.uid()) or (select public.is_content_staff()));
create policy report_audit_staff on public.report_audit for select to authenticated using((select public.is_content_staff()));
alter table tutor_private.requests add column response_snapshot jsonb;
create table tutor_private.script_releases (
 version text not null,lesson_id text not null references public.lessons(id),intent text not null,response text not null,
 primary key(version,lesson_id,intent)
);
alter table tutor_private.script_releases enable row level security;
revoke all on tutor_private.script_releases from public,anon,authenticated;

insert into tutor_private.script_releases(version,lesson_id,intent,response) values
('scripted-foundations-1','js-v2-values','hint','Trace each assignment in order. Write down the current value before moving to the next line; quotation marks matter when identifying a value’s type.'),
('scripted-foundations-1','js-v2-values','explain','A binding gives a value a name. A let binding can be assigned a new value. Numeric text inside quotes is a string, even when its characters look like digits. typeof describes the value’s type.'),
('scripted-foundations-1','js-v2-values','example','Try a different example: let apples = 4; apples = apples + 3; The new value is 7. Explain which value the right-hand side reads before the assignment happens.'),
('scripted-foundations-1','js-v2-values','reflect','Where did your value come from: the original assignment or the latest assignment? Explain that step before checking your practice answer. I cannot assess free-form reasoning in this scripted mode.'),
('scripted-foundations-1','js-v2-conditions','hint','Evaluate the condition first, then trace only the chosen branch. For strict equality, check both the type and the value.'),
('scripted-foundations-1','js-v2-conditions','explain','An if/else selects a branch from a condition. Strict equality (===) compares without converting different types; assignment (=) changes a binding. Keep those operations separate.'),
('scripted-foundations-1','js-v2-conditions','example','Try a different condition: if (8 > 4) { console.log("Warm up"); } else { console.log("Rest"); } It logs Warm up because 8 is greater than 4. Which branch would a false condition select?'),
('scripted-foundations-1','js-v2-conditions','reflect','State the condition’s result before naming a branch. If you are comparing values, state their types too. I cannot assess free-form reasoning in this scripted mode.'),
('scripted-foundations-1','js-v2-functions','hint','Follow the argument into the parameter, then find the return statement. Displaying something in the console and returning a value are different operations.'),
('scripted-foundations-1','js-v2-functions','explain','A function receives arguments through parameters. return sends a value back to its caller. An ordinary function that reaches its end without returning a value returns undefined; console output is a separate side effect.'),
('scripted-foundations-1','js-v2-functions','example','Try a different function: function double(n) { return n * 2; } double(6) returns 12. Which expression supplies the value to the caller?'),
('scripted-foundations-1','js-v2-functions','reflect','Point to the return statement and describe the value it sends to the caller. If you only found a log, revisit the distinction between output and a returned value. I cannot assess free-form reasoning in this scripted mode.');
alter function public.use_scripted_tutor(text,uuid,text) set schema tutor_private;
alter function tutor_private.use_scripted_tutor(text,uuid,text) rename to use_scripted_tutor_base;
revoke all on function tutor_private.use_scripted_tutor_base(text,uuid,text) from public,anon,authenticated;
create function public.use_scripted_tutor(lesson text, request uuid, intent text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; receipt jsonb; script text;
begin
 result:=tutor_private.use_scripted_tutor_base(lesson,request,intent);
 if not (result->>'allowed')::boolean then return result; end if;
 select response_snapshot into receipt from tutor_private.requests where user_id=auth.uid() and request_id=request;
 if receipt is null then
  select response into script from tutor_private.script_releases where version='scripted-foundations-1' and lesson_id=lesson and tutor_private.script_releases.intent=use_scripted_tutor.intent;
  if script is null then raise exception 'Script unavailable'; end if;
  receipt:=jsonb_build_object('text',script,'adapter','scripted-foundations-1','source',jsonb_build_object('title',result->>'title','href','/courses/'||(result->>'course')||'/'||lesson));
  update tutor_private.requests set response_snapshot=receipt where user_id=auth.uid() and request_id=request;
 end if;
 return result||jsonb_build_object('reply',receipt);
end $$;
revoke all on function public.use_scripted_tutor(text,uuid,text) from public,anon;
grant execute on function public.use_scripted_tutor(text,uuid,text) to authenticated;

create function public.report_content(lesson text, message text, request uuid, tutor_request uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid(); old public.content_reports; result uuid; context jsonb; response jsonb;
begin
 if learner is null or not learning_private.can_practice(learner,lesson) then raise exception 'Lesson access required' using errcode='42501'; end if;
 if request is null or message is null or length(btrim(message)) not between 10 and 2000 then raise exception 'Describe the issue in 10 to 2000 characters'; end if;
 perform pg_advisory_xact_lock(hashtextextended(learner::text,53));
 select * into old from public.content_reports where user_id=learner and request_id=request;
 if found then
  if old.lesson_id<>lesson or old.message<>message or old.tutor_request is distinct from report_content.tutor_request then raise exception 'Report key already used'; end if;
  return old.id;
 end if;
 if (select count(*) from public.content_reports where user_id=learner and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=10 then raise exception 'Daily report limit reached'; end if;
 if tutor_request is not null then
  select response_snapshot into response from tutor_private.requests where user_id=learner and request_id=tutor_request and lesson_id=lesson;
  if response is null then raise exception 'Choose a saved tutor response'; end if;
 end if;
 select jsonb_build_object('course',c.id,'course_version',c.version,'lesson',l.id,'title',l.title,'objective',l.objective,'body',l.body,'example',l.example,'response',response) into context
 from public.lessons l join public.course_versions c on c.id=l.course_id where l.id=lesson;
 insert into public.content_reports(user_id,request_id,lesson_id,tutor_request,message,snapshot)
 values(learner,request,lesson,tutor_request,message,context) returning id into result;
 return result;
end $$;
create function public.triage_content_report(report uuid, expected integer, status text, note text) returns void language plpgsql security definer set search_path='' as $$
declare old public.content_reports;
begin
 if not public.is_content_staff() then raise exception 'Staff required' using errcode='42501'; end if;
 if status is null or status not in ('open','reviewing','resolved','dismissed') or note is null or length(btrim(note)) not between 10 and 2000 then raise exception 'Choose a status and explain the decision'; end if;
 select * into old from public.content_reports where id=report for update;
 if not found then raise exception 'Report unavailable'; end if;
 if expected is null or expected<>old.revision then raise exception 'Report changed. Reload before updating.' using errcode='40001'; end if;
 update public.content_reports set status=triage_content_report.status,staff_note=note,revision=revision+1 where id=report;
 insert into public.report_audit(report_id,actor,status,note) values(report,auth.uid(),status,note);
end $$;
revoke all on function public.report_content(text,text,uuid,uuid),public.triage_content_report(uuid,integer,text,text) from public,anon;
grant execute on function public.report_content(text,text,uuid,uuid),public.triage_content_report(uuid,integer,text,text) to authenticated;
