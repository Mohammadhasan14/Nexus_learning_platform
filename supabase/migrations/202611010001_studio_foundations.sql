-- NX-046.22 first lesson only. No changes to published worksheets, JS grading or tutor scopes.
create table public.studio_foundation_lessons (
 id text primary key,
 course_id text not null references public.course_versions(id),
 content_version text not null,
 schema_version text not null,
 review_record text not null
);
create table public.studio_foundation_positions (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id text not null references public.studio_foundation_lessons(id),
 revision integer not null check(revision between 1 and 1000),
 base_revision integer not null check(base_revision between 0 and 999),
 request_id uuid not null,
 content_version text not null,
 schema_version text not null,
 position jsonb not null check(jsonb_typeof(position)='object' and octet_length(position::text)<1024),
 saved_at timestamptz not null default now(),
 primary key(user_id,lesson_id,revision),
 unique(user_id,request_id)
);
create table public.studio_foundation_events (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id text not null references public.studio_foundation_lessons(id),
 request_id uuid not null,
 content_version text not null,
 event_order bigserial not null unique,
 question_id text not null check(question_id in ('initiator','database-query','request-response')),
 kind text not null check(kind in ('attempt','hint','explain')),
 choice text,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
create table learning_private.foundation_answer_keys (
 lesson_id text not null references public.studio_foundation_lessons(id),
 question_id text not null,
 correct_choice text not null,
 feedback jsonb not null,
 hints jsonb not null,
 primary key(lesson_id,question_id)
);
revoke all on learning_private.foundation_answer_keys from public,anon,authenticated;
alter table public.studio_foundation_lessons enable row level security;
alter table public.studio_foundation_positions enable row level security;
alter table public.studio_foundation_events enable row level security;
revoke all on public.studio_foundation_lessons,public.studio_foundation_positions,public.studio_foundation_events from public,anon,authenticated;
grant select on public.studio_foundation_lessons,public.studio_foundation_positions,public.studio_foundation_events to authenticated;
create policy foundation_content_read on public.studio_foundation_lessons for select to authenticated using(true);
create policy foundation_position_owner on public.studio_foundation_positions for select to authenticated using(user_id=(select auth.uid()));
create policy foundation_event_owner on public.studio_foundation_events for select to authenticated using(user_id=(select auth.uid()));
insert into public.studio_foundation_lessons values('web-request-v1','system-design-studio-v1','web-request-content-v1','foundation-position-v1','AI-assisted editorial review 2026-11-01: four-step campus event journey and three objective checks. No independent educator or learner validation. See docs/system-design/FOUNDATIONS.md.');
insert into learning_private.foundation_answer_keys values
('web-request-v1','initiator','browser','{"browser":"The browser initiates this journey by asking for the campus event list.","server":"The application server handles the browser’s request. It does not initiate this illustrated journey.","database":"The database returns stored records after the application server queries it. It does not initiate this journey."}','["Look at where the first arrow starts.","The component a student uses to open the page starts the request."]'),
('web-request-v1','database-query','server','{"browser":"In this architecture the browser talks to the application server, not directly to the database.","server":"The application server applies application rules and queries the database.","database":"The database processes the server’s query and returns records; it does not send the query to itself."}','["Follow the second step, between the request arriving and records returning.","The middle component handles the request and asks for stored information."]'),
('web-request-v1','request-response','ask-reply','{"ask-reply":"The request asks for the opening hours. The response is the server’s reply containing those hours.","reply-ask":"This reverses the directions: asking is the request; the reply containing the hours is the response.","both-requests":"Network travel alone does not make a message a request. The reply to the browser’s request is a response."}','["Identify the message that asks for information, then the reply.","A request asks; a response answers that request."]');

-- One private eligibility contract for every entry point. Caller ownership always comes from auth.uid().
create function learning_private.require_foundation(lesson text,content text,schema_id text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if lesson is distinct from 'web-request-v1' or content is distinct from 'web-request-content-v1' or schema_id is distinct from 'foundation-position-v1' or not exists(select 1 from public.studio_foundation_lessons l join public.course_versions c on c.id=l.course_id where l.id=lesson and l.content_version=content and l.schema_version=schema_id and c.experience_kind='studio') then raise exception 'Unsupported lesson version' using errcode='22023'; end if;
 if not exists(select 1 from public.enrolments n join public.profiles p on p.user_id=n.user_id join public.studio_foundation_lessons l on l.course_id=n.course_id where n.user_id=auth.uid() and l.id=lesson and p.onboarding_completed_at is not null) then raise exception 'Enrol in System Design Studio first' using errcode='42501'; end if;
end $$;
revoke all on function learning_private.require_foundation(text,text,text) from public,anon,authenticated;

create function public.get_studio_foundation(course text,lesson text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item public.studio_foundation_lessons; saved public.studio_foundation_positions; evidence jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select l.* into item from public.studio_foundation_lessons l where l.id=lesson and l.course_id=course;
 if not found then raise exception 'Unknown foundation lesson' using errcode='22023'; end if;
 if not exists(select 1 from public.profiles where user_id=auth.uid() and onboarding_completed_at is not null) then raise exception 'Complete onboarding' using errcode='42501'; end if;
 if not exists(select 1 from public.enrolments where user_id=auth.uid() and course_id=course) then return jsonb_build_object('enrolled',false); end if;
 perform learning_private.require_foundation(lesson,item.content_version,item.schema_version);
 select * into saved from public.studio_foundation_positions where user_id=auth.uid() and lesson_id=lesson order by revision desc limit 1;
 -- At most three attempts summaries, last feedback, and last requested hint/explanation per question.
 select coalesce(jsonb_agg(e.result order by e.question_id,e.event_order),'[]') into evidence from (
 select distinct on (question_id,kind) question_id,kind,result,event_order from public.studio_foundation_events where user_id=auth.uid() and lesson_id=lesson order by question_id,kind,event_order desc
 ) e;
 return jsonb_build_object('enrolled',true,'identity',jsonb_build_object('lesson',item.id,'content',item.content_version,'schema',item.schema_version),'saved',case when saved.revision is null then null else jsonb_build_object('revision',saved.revision,'savedAt',saved.saved_at,'position',saved.position) end,'evidence',evidence);
end $$;

create function public.save_studio_foundation(lesson text,content text,schema_id text,expected integer,request uuid,document jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved public.studio_foundation_positions; latest integer;
begin
 perform learning_private.require_foundation(lesson,content,schema_id);
 if expected is null or expected not between 0 and 1000 or request is null or document is null or jsonb_typeof(document)<>'object' then raise exception 'Invalid position' using errcode='22023'; end if;
 if (select count(*) from jsonb_object_keys(document))<>3 or not(document ?& array['section','step','viewed']) or document->>'section' not in ('learn','practice','recap') or jsonb_typeof(document->'section') is distinct from 'string' or jsonb_typeof(document->'step') is distinct from 'number' or jsonb_typeof(document->'viewed') is distinct from 'boolean' then raise exception 'Invalid position fields' using errcode='22023'; end if;
 if (document->>'step')::numeric not between 0 and 3 or trunc((document->>'step')::numeric)<>(document->>'step')::numeric then raise exception 'Invalid walkthrough step' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,4622));
 select * into saved from public.studio_foundation_positions where user_id=auth.uid() and request_id=request;
 if found then
  if saved.lesson_id<>lesson or saved.content_version<>content or saved.schema_version<>schema_id or saved.base_revision<>expected or saved.position<>document then raise exception 'Request already used for different work' using errcode='22023'; end if;
 else
  select coalesce(max(revision),0) into latest from public.studio_foundation_positions where user_id=auth.uid() and lesson_id=lesson;
  if latest<>expected then raise exception 'A newer lesson position exists' using errcode='40001'; end if;
  if latest>=1000 then raise exception 'Position revision limit reached; export your saved work' using errcode='54000'; end if;
  insert into public.studio_foundation_positions(user_id,lesson_id,revision,base_revision,request_id,content_version,schema_version,position) values(auth.uid(),lesson,latest+1,expected,request,content,schema_id,document) returning * into saved;
 end if;
 return jsonb_build_object('revision',saved.revision,'savedAt',saved.saved_at,'position',saved.position);
end $$;

create function public.submit_studio_foundation(lesson text,content text,schema_id text,question text,event_kind text,selected text,request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare key learning_private.foundation_answer_keys; old public.studio_foundation_events; attempts integer; level integer; independent boolean; prior public.studio_foundation_events; result jsonb;
begin
 perform learning_private.require_foundation(lesson,content,schema_id);
 select * into key from learning_private.foundation_answer_keys where lesson_id=lesson and question_id=question;
 if not found or request is null or event_kind is null or event_kind not in ('attempt','hint','explain') then raise exception 'Invalid practice event' using errcode='22023'; end if;
 -- Supabase RPC text arguments are non-nullable in generated types; empty text is the no-choice sentinel for help only.
 if event_kind in ('hint','explain') and selected='' then selected:=null; end if;
 if (event_kind='attempt' and (selected is null or not(key.feedback ? selected))) or (event_kind<>'attempt' and selected is not null) then raise exception 'Choose a supported option' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,4622));
 select * into old from public.studio_foundation_events where user_id=auth.uid() and request_id=request;
 if found then
  if old.lesson_id<>lesson or old.content_version<>content or old.question_id<>question or old.kind<>event_kind or old.choice is distinct from selected then raise exception 'Request already used for different work' using errcode='22023'; end if;
  return old.result;
 end if;
 select count(*) into attempts from public.studio_foundation_events where user_id=auth.uid() and lesson_id=lesson and question_id=question and kind='attempt';
 if event_kind<>'attempt' and attempts=0 then raise exception 'Try the question before requesting help' using errcode='22023'; end if;
 if event_kind='attempt' and attempts>=100 then raise exception 'Practice limit reached' using errcode='54000'; end if;
 select coalesce(max((e.result->>'hintLevel')::integer),0) into level from public.studio_foundation_events e where user_id=auth.uid() and lesson_id=lesson and question_id=question;
 if event_kind='hint' and level>=2 then raise exception 'Both hints already shown' using errcode='22023'; end if;
 if event_kind='explain' and exists(select 1 from public.studio_foundation_events where user_id=auth.uid() and lesson_id=lesson and question_id=question and kind='explain') then raise exception 'Explanation already shown' using errcode='22023'; end if;
 select * into prior from public.studio_foundation_events where user_id=auth.uid() and lesson_id=lesson and question_id=question and kind='attempt' order by event_order desc limit 1;
 independent:=attempts=0;
 result:=jsonb_build_object('question',question,'kind',event_kind,'attempt',case when event_kind='attempt' then attempts+1 else attempts end,'correct',case when event_kind='attempt' then selected=key.correct_choice else (prior.result->>'correct')::boolean end,'independent',case when event_kind='attempt' then independent else false end,'choice',case when event_kind='attempt' then selected else prior.choice end,'hintLevel',case when event_kind='hint' then level+1 else level end,'explanationShown',event_kind in ('attempt','explain'),'message',case when event_kind='attempt' then key.feedback->>selected when event_kind='hint' then key.hints->>level else 'Compare each option. These explanations are support, not independent evidence.' end);
 if event_kind='explain' then result:=result||jsonb_build_object('options',key.feedback); end if;
 insert into public.studio_foundation_events(user_id,lesson_id,request_id,content_version,question_id,kind,choice,result) values(auth.uid(),lesson,request,content,question,event_kind,selected,result);
 return result;
end $$;
revoke all on function public.get_studio_foundation(text,text),public.save_studio_foundation(text,text,text,integer,uuid,jsonb),public.submit_studio_foundation(text,text,text,text,text,text,uuid) from public,anon;
grant execute on function public.get_studio_foundation(text,text),public.save_studio_foundation(text,text,text,integer,uuid,jsonb),public.submit_studio_foundation(text,text,text,text,text,text,uuid) to authenticated;

alter function public.export_learner_data() rename to foundation_export_base;
alter function public.foundation_export_base() set schema learning_private;
revoke all on function learning_private.foundation_export_base() from public,anon,authenticated;
create function public.export_learner_data() returns jsonb
language plpgsql security definer set search_path='' as $$
declare exported jsonb;
begin
 exported:=learning_private.foundation_export_base()||jsonb_build_object(
 'studio_foundation_positions',(select coalesce(jsonb_agg(to_jsonb(p) order by lesson_id,revision),'[]') from (select lesson_id,revision,base_revision,request_id,content_version,schema_version,position,saved_at from public.studio_foundation_positions where user_id=auth.uid()) p),
 'studio_foundation_events',(select coalesce(jsonb_agg(to_jsonb(e) order by lesson_id,created_at,request_id),'[]') from (select lesson_id,request_id,content_version,question_id,kind,choice,result,created_at from public.studio_foundation_events where user_id=auth.uid()) e));
 if octet_length(exported::text)>8388608 then raise exception 'Export exceeds download limit' using errcode='54000'; end if;
 return exported;
end $$;
revoke all on function public.export_learner_data() from public,anon;
grant execute on function public.export_learner_data() to authenticated;
