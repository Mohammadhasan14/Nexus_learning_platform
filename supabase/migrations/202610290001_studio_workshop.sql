-- M1 only: additive private worksheet storage. No JavaScript content/evidence changes.
alter table public.course_versions add column experience_kind text not null default 'lessons'
 check(experience_kind in ('lessons','studio'));
create table public.studio_scenario_versions (
 id text primary key,
 course_id text not null references public.course_versions(id),
 schema_version text not null,
 formula_version text not null,
 title text not null,
 review_record text not null,
 unique(course_id,id)
);
create table public.studio_worksheets (
 user_id uuid not null references auth.users(id) on delete cascade,
 scenario_id text not null references public.studio_scenario_versions(id),
 revision integer not null check(revision between 1 and 1000),
 updated_at timestamptz not null default now(),
 primary key(user_id,scenario_id)
);
create table public.studio_worksheet_revisions (
 user_id uuid not null,
 scenario_id text not null,
 revision integer not null check(revision between 1 and 1000),
 base_revision integer not null check(base_revision>=0),
 request_id uuid not null,
 schema_version text not null,
 formula_version text not null,
 worksheet jsonb not null check(jsonb_typeof(worksheet)='object' and octet_length(worksheet::text)<=65536),
 saved_at timestamptz not null default now(),
 primary key(user_id,scenario_id,revision),
 unique(user_id,request_id),
 foreign key(user_id,scenario_id) references public.studio_worksheets(user_id,scenario_id) on delete cascade
);
alter table public.studio_scenario_versions enable row level security;
alter table public.studio_worksheets enable row level security;
alter table public.studio_worksheet_revisions enable row level security;
revoke all on public.studio_scenario_versions,public.studio_worksheets,public.studio_worksheet_revisions from anon,authenticated;
grant select on public.studio_scenario_versions,public.studio_worksheets,public.studio_worksheet_revisions to authenticated;
create policy studio_scenario_read on public.studio_scenario_versions for select to authenticated using(true);
create policy studio_head_owner on public.studio_worksheets for select to authenticated using(user_id=(select auth.uid()));
create policy studio_revision_owner on public.studio_worksheet_revisions for select to authenticated using(user_id=(select auth.uid()));

insert into public.course_versions(id,title,summary,version,review_status,experience_kind) values
('system-design-studio-v1','System Design Studio','Campus event directory: one requirements and capacity workshop. A first slice of a planned beginner-to-advanced course; foundations and later design tools are not available yet.',1,'preview','studio');
insert into public.studio_scenario_versions values
('campus-events-v1','system-design-studio-v1','worksheet-v1','capacity-v1','Campus event directory','AI-assisted scenario/formula review, 2026-10-29. See docs/system-design/IMPLEMENTATION.md. No independent curriculum validation.');

create function public.get_studio_workshop(course text,scenario text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item public.studio_scenario_versions; saved public.studio_worksheet_revisions;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if not exists(select 1 from public.profiles where user_id=auth.uid() and onboarding_completed_at is not null) then raise exception 'Complete onboarding' using errcode='42501'; end if;
 select s.* into item from public.studio_scenario_versions s join public.course_versions c on c.id=s.course_id where s.id=scenario and c.id=course and c.experience_kind='studio';
 if not found then raise exception 'Unknown workshop' using errcode='22023'; end if;
 if not exists(select 1 from public.enrolments n where n.user_id=auth.uid() and n.course_id=course) then return jsonb_build_object('enrolled',false); end if;
 select r.* into saved from public.studio_worksheet_revisions r join public.studio_worksheets h using(user_id,scenario_id,revision) where r.user_id=auth.uid() and r.scenario_id=scenario;
 return jsonb_build_object('enrolled',true,'identity',jsonb_build_object('scenario',item.id,'schema',item.schema_version,'formula',item.formula_version),'saved',
 case when saved.revision is null then null else jsonb_build_object('revision',saved.revision,'savedAt',saved.saved_at,'identity',jsonb_build_object('scenario',saved.scenario_id,'schema',saved.schema_version,'formula',saved.formula_version),'worksheet',saved.worksheet) end);
end $$;

create function public.save_studio_worksheet(scenario text,expected integer,request uuid,document jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid(); item public.studio_scenario_versions; old public.studio_worksheet_revisions; saved public.studio_worksheet_revisions; latest integer; w jsonb; r record; value numeric; field text;
begin
 if learner is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into item from public.studio_scenario_versions where id=scenario;
 if not found or item.id<>'campus-events-v1' or item.schema_version<>'worksheet-v1' or item.formula_version<>'capacity-v1' then raise exception 'Unsupported workshop version' using errcode='22023'; end if;
 if not exists(select 1 from public.enrolments n join public.profiles p on p.user_id=n.user_id join public.course_versions c on c.id=n.course_id where n.user_id=learner and n.course_id=item.course_id and p.onboarding_completed_at is not null and c.experience_kind='studio') then raise exception 'Enrol in this workshop first' using errcode='42501'; end if;
 if expected is null or expected<0 or request is null or document is null or jsonb_typeof(document)<>'object' or octet_length(document::text)>65536 then raise exception 'Invalid worksheet' using errcode='22023'; end if;
 if (select count(*) from jsonb_object_keys(document))<>7 or not(document ?& array['functionalRequirements','exclusions','latencyTargetMs','availabilityTargetPercent','assumptions','explanation','workload']) then raise exception 'Use the supported worksheet fields' using errcode='22023'; end if;
 foreach field in array array['functionalRequirements','exclusions','assumptions','explanation'] loop
  if jsonb_typeof(document->field) is distinct from 'string' or (select coalesce(sum(case when ascii(ch)>65535 then 2 else 1 end),0) from regexp_split_to_table(document->>field,'') ch)>(case when field in ('functionalRequirements','explanation') then 4000 else 2000 end) then raise exception 'Invalid worksheet text' using errcode='22023'; end if;
 end loop;
 if jsonb_typeof(document->'latencyTargetMs') is distinct from 'number' or jsonb_typeof(document->'availabilityTargetPercent') is distinct from 'number' then raise exception 'Invalid targets' using errcode='22023'; end if;
 if (document->>'latencyTargetMs')::numeric not between 1 and 600000 or (document->>'availabilityTargetPercent')::numeric not between 0 and 100 then raise exception 'Targets out of range' using errcode='22023'; end if;
 w:=document->'workload';
 if jsonb_typeof(w) is distinct from 'object' then raise exception 'Invalid workload' using errcode='22023'; end if;
 if (select count(*) from jsonb_object_keys(w))<>7 then raise exception 'Use supported workload fields' using errcode='22023'; end if;
 for r in select * from (values ('dailyActiveUsers',0,100000000,true),('requestsPerUserPerDay',0,100000,false),('peakFactor',1,100,false),('readPercentage',0,100,false),('readResponseBytes',0,10000000,true),('writePayloadBytes',0,10000000,true),('retentionDays',0,3650,true)) limits(key,minimum,maximum,whole) loop
  if jsonb_typeof(w->r.key) is distinct from 'number' then raise exception 'Invalid workload number' using errcode='22023'; end if;
  value:=(w->>r.key)::numeric;
  if value<r.minimum or value>r.maximum or (r.whole and trunc(value)<>value) then raise exception 'Workload out of range' using errcode='22023'; end if;
 end loop;
 if (w->>'dailyActiveUsers')::numeric*(w->>'requestsPerUserPerDay')::numeric*(1-(w->>'readPercentage')::numeric/100)*(w->>'writePayloadBytes')::numeric*(w->>'retentionDays')::numeric>9007199254740991 then raise exception 'Retained volume precision limit' using errcode='22023'; end if;
 -- Serialize both first save and retries for this owner; a key's original result is immutable.
 perform pg_advisory_xact_lock(hashtextextended(learner::text,461));
 select * into old from public.studio_worksheet_revisions where user_id=learner and request_id=request;
 if found then
  if old.scenario_id<>scenario or old.base_revision<>expected or old.worksheet<>document then raise exception 'Save request already used for different work' using errcode='22023'; end if;
  saved:=old;
 else
  select revision into latest from public.studio_worksheets where user_id=learner and scenario_id=scenario;
  latest:=coalesce(latest,0);
  if latest<>expected then raise exception 'A newer worksheet revision exists' using errcode='40001'; end if;
  if latest>=1000 then raise exception 'Worksheet revision limit reached; export your work' using errcode='54000'; end if;
  insert into public.studio_worksheets(user_id,scenario_id,revision) values(learner,scenario,latest+1) on conflict(user_id,scenario_id) do update set revision=excluded.revision,updated_at=now();
  insert into public.studio_worksheet_revisions(user_id,scenario_id,revision,base_revision,request_id,schema_version,formula_version,worksheet)
  values(learner,scenario,latest+1,expected,request,item.schema_version,item.formula_version,document) returning * into saved;
 end if;
 return jsonb_build_object('revision',saved.revision,'savedAt',saved.saved_at,'identity',jsonb_build_object('scenario',saved.scenario_id,'schema',saved.schema_version,'formula',saved.formula_version),'worksheet',saved.worksheet);
end $$;
revoke all on function public.get_studio_workshop(text,text),public.save_studio_worksheet(text,integer,uuid,jsonb) from public,anon;
grant execute on function public.get_studio_workshop(text,text),public.save_studio_worksheet(text,integer,uuid,jsonb) to authenticated;

-- Preserve existing reply expiry/privacy export and add explicit owner-only collections.
alter function public.export_learner_data() rename to studio_export_base;
alter function public.studio_export_base() set schema learning_private;
revoke all on function learning_private.studio_export_base() from public,anon,authenticated;
create function public.export_learner_data() returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=learning_private.studio_export_base()||jsonb_build_object(
 'studio_worksheets',(select coalesce(jsonb_agg(to_jsonb(h) order by scenario_id),'[]') from (select scenario_id,revision,updated_at from public.studio_worksheets where user_id=auth.uid()) h),
 'studio_worksheet_revisions',(select coalesce(jsonb_agg(to_jsonb(r) order by scenario_id,revision),'[]') from (select scenario_id,revision,base_revision,request_id,schema_version,formula_version,worksheet,saved_at from public.studio_worksheet_revisions where user_id=auth.uid()) r));
 if octet_length(result::text)>8388608 then raise exception 'Export exceeds download limit' using errcode='54000'; end if;
 return result;
end $$;
revoke all on function public.export_learner_data() from public,anon;
grant execute on function public.export_learner_data() to authenticated;
