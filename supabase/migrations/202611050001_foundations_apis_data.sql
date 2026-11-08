-- NX-046.24 only. Published web-request-v1 content/keys, saved evidence and M1 formulas are unchanged.
-- Reuse owner-only position/event collections and their existing export/deletion cascades.
alter table public.studio_foundation_events drop constraint studio_foundation_events_question_id_check;
alter table public.studio_foundation_events add constraint studio_foundation_events_question_id_check check(question_id in ('initiator','database-query','request-response','api-read-one','api-create-body','api-error-kind','api-representation'));
insert into public.studio_foundation_lessons values('apis-data-v1','system-design-studio-v1','apis-data-content-v1','api-position-v1','AI-assisted source/content review 2026-11-05; RFC 9110, RFC 8259 and MDN. No independent educator review. See docs/system-design/APIS_DATA.md.');
insert into learning_private.foundation_answer_keys values
('apis-data-v1','api-read-one','get-one','{"get-one": "GET /api/events/evt_101 retrieves the representation of this event. Reading should not intentionally change application state.", "post-list": "POST with a title asks to create an event in this contract; it is not the read-one request.", "get-create": "Using GET to intentionally create an event conflicts with its safe retrieval semantics. Use the documented creation request."}','["First choose whether the intention is reading or creating.", "Use the retrieval method and the path containing the event ID."]'),
('apis-data-v1','api-create-body','title','{"title": "The client sends the title as JSON in this example request body. The application validates it and controls access.", "status": "201 is a status in the application’s response, not a title in the client’s request body.", "internal": "The client should not supply private storage fields or organiser secrets. The contract accepts a title; internal records need not mirror public JSON."}','["Distinguish what the client sends from what the application returns.", "A create request needs the event name specified by this example’s contract."]'),
('apis-data-v1','api-error-kind','missing-invalid','{"missing-invalid": "Our contract uses 404 for an event that is not found and 400 for missing or invalid create input. The body explains the particular error.", "reversed": "These meanings are reversed for this chosen contract: missing resource uses 404; invalid create input uses 400.", "all-success": "Putting an error in JSON does not make the operation successful. This contract uses an error status plus an explanatory body."}','["Compare asking about an absent resource with submitting invalid data.", "In this contract Not Found is 404; Bad Request is 400."]'),
('apis-data-v1','api-representation','chosen-view','{"chosen-view": "An API can expose selected fields while the application protects internal records. JSON encodes structured data; it is not itself a storage system.", "same-table": "A representation need not contain every column or follow internal table structure. The application can choose a public shape and omit private fields.", "json-database": "Receiving a JSON response gives the client formatted data, not direct access to the underlying database."}','["A public view and an internal record have different purposes.", "Think about which fields the client needs and which the application should keep private."]');

create or replace function learning_private.require_foundation(lesson text,content text,schema_id text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if not exists(select 1 from public.studio_foundation_lessons l join public.course_versions c on c.id=l.course_id where l.id=lesson and l.content_version=content and l.schema_version=schema_id and c.experience_kind='studio' and (l.id,l.content_version,l.schema_version) in (('web-request-v1','web-request-content-v1','foundation-position-v1'),('apis-data-v1','apis-data-content-v1','api-position-v1'))) then raise exception 'Unsupported lesson version' using errcode='22023'; end if;
 if not exists(select 1 from public.enrolments n join public.profiles p on p.user_id=n.user_id join public.studio_foundation_lessons l on l.course_id=n.course_id where n.user_id=auth.uid() and l.id=lesson and p.onboarding_completed_at is not null) then raise exception 'Enrol in System Design Studio first' using errcode='42501'; end if;
end $$;
revoke all on function learning_private.require_foundation(text,text,text) from public,anon,authenticated;

create or replace function public.save_studio_foundation(lesson text,content text,schema_id text,expected integer,request uuid,document jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved public.studio_foundation_positions; latest integer;
begin
 perform learning_private.require_foundation(lesson,content,schema_id);
 if expected is null or expected not between 0 and 1000 or request is null or document is null or jsonb_typeof(document)<>'object' then raise exception 'Invalid position' using errcode='22023'; end if;
 if lesson='web-request-v1' then
 if (select count(*) from jsonb_object_keys(document))<>3 or not(document ?& array['section','step','viewed']) or document->>'section' not in ('learn','practice','recap') or jsonb_typeof(document->'section') is distinct from 'string' or jsonb_typeof(document->'step') is distinct from 'number' or jsonb_typeof(document->'viewed') is distinct from 'boolean' then raise exception 'Invalid position fields' using errcode='22023'; end if;
 if (document->>'step')::numeric not between 0 and 3 or trunc((document->>'step')::numeric)<>(document->>'step')::numeric then raise exception 'Invalid walkthrough step' using errcode='22023'; end if;
 else
  if (select count(*) from jsonb_object_keys(document))<>4 or not(document ?& array['section','step','viewed','explorer']) or jsonb_typeof(document->'section') is distinct from 'string' or document->>'section' not in ('learn','practice','recap') or jsonb_typeof(document->'step') is distinct from 'number' or (document->>'step')::numeric<>0 or jsonb_typeof(document->'viewed') is distinct from 'boolean' then raise exception 'Invalid API lesson position' using errcode='22023'; end if;
  if jsonb_typeof(document->'explorer') is distinct from 'object' then raise exception 'Invalid explorer configuration' using errcode='22023'; end if;
  if (select count(*) from jsonb_object_keys(document->'explorer'))<>3 or not(document->'explorer' ?& array['scenario','eventId','title']) or jsonb_typeof(document->'explorer'->'scenario') is distinct from 'string' or document->'explorer'->>'scenario' not in ('list','view','create') or jsonb_typeof(document->'explorer'->'eventId') is distinct from 'string' or document->'explorer'->>'eventId' not in ('evt_101','evt_102','evt_999') or jsonb_typeof(document->'explorer'->'title') is distinct from 'string' then raise exception 'Invalid explorer configuration' using errcode='22023'; end if;
  if (select coalesce(sum(case when ascii(ch)>65535 then 2 else 1 end),0) from regexp_split_to_table(document->'explorer'->>'title','') ch)>80 then raise exception 'Explorer title exceeds draft limit' using errcode='22023'; end if;
 end if;
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

-- Existing RPC signatures/grants, authoritative grading, assistance limits and privacy wrappers are retained.
