-- Owner-only privacy controls; no service-role application client or Auth password hashes.
create schema privacy_private;
revoke all on schema privacy_private from public,anon,authenticated;
create table privacy_private.preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 tutor_retention_days integer check(tutor_retention_days in (30,90)),
 replies_cleared_at timestamptz,
 updated_at timestamptz not null default statement_timestamp()
);
create table privacy_private.deletion_keys (
 singleton boolean primary key default true check(singleton),
 secret text not null check(secret ~ '^[a-f0-9]{64}$')
);
alter table privacy_private.preferences enable row level security;
alter table privacy_private.deletion_keys enable row level security;
revoke all on all tables in schema privacy_private from public,anon,authenticated;

alter table tutor_private.requests add column reply_saved_at timestamptz;
alter table tutor_private.requests add column reply_removed_at timestamptz;
-- Legacy scripted receipts have only their UTC request day, so use its start conservatively.
update tutor_private.requests set reply_saved_at=coalesce(completed_at,day::timestamp at time zone 'UTC')
where response_snapshot is not null;
create function privacy_private.guard_reply() returns trigger language plpgsql set search_path='' as $$
begin
 if new.reply_removed_at is not null then
  new.response_snapshot:=null;
 elsif new.response_snapshot is not null and new.reply_saved_at is null then
  new.reply_saved_at:=statement_timestamp();
 end if;
 return new;
end $$;
create trigger preserve_reply_removal before insert or update on tutor_private.requests
for each row execute function privacy_private.guard_reply();

create function privacy_private.expire_replies(learner uuid) returns integer
language plpgsql set search_path='' as $$
declare removed integer;
begin
 update tutor_private.requests r set response_snapshot=null,reply_removed_at=statement_timestamp()
 from privacy_private.preferences p where p.user_id=r.user_id and r.user_id=learner
 and p.tutor_retention_days is not null and r.response_snapshot is not null
 and r.reply_saved_at<=statement_timestamp()-make_interval(days=>p.tutor_retention_days);
 get diagnostics removed=row_count;
 return removed;
end $$;
-- Operator scheduling is separate from migrations/builds. No public prune-all capability.
create function privacy_private.prune_expired_replies() returns integer
language plpgsql set search_path='' as $$
declare learner uuid; removed integer:=0;
begin
 perform pg_advisory_xact_lock(25092026);
 for learner in select user_id from privacy_private.preferences where tutor_retention_days is not null loop
  removed:=removed+privacy_private.expire_replies(learner);
 end loop;
 return removed;
end $$;
create function public.get_privacy_settings() returns jsonb
language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid(); result jsonb;
begin
 if learner is null or not exists(select 1 from public.profiles where user_id=learner) then
  raise exception 'Sign in required' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(25092026);
 perform privacy_private.expire_replies(learner);
 select jsonb_build_object('tutor_retention_days',tutor_retention_days,'replies_cleared_at',replies_cleared_at,'updated_at',updated_at)
 into result from privacy_private.preferences where user_id=learner;
 return coalesce(result,jsonb_build_object('tutor_retention_days',null,'replies_cleared_at',null,'updated_at',null));
end $$;
create function public.set_tutor_retention(days integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid();
begin
 if learner is null or not exists(select 1 from public.profiles where user_id=learner) then
  raise exception 'Sign in required' using errcode='42501';
 end if;
 if days is null or days not in (0,30,90) then raise exception 'Invalid retention setting' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(25092026);
 insert into privacy_private.preferences(user_id,tutor_retention_days) values(learner,nullif(days,0))
 on conflict(user_id) do update set tutor_retention_days=excluded.tutor_retention_days,updated_at=statement_timestamp();
 return public.get_privacy_settings();
end $$;
create function public.clear_tutor_replies(confirmation text) returns boolean
language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid();
begin
 if learner is null or not exists(select 1 from public.profiles where user_id=learner) then
  raise exception 'Sign in required' using errcode='42501';
 end if;
 if confirmation is distinct from 'CLEAR' then raise exception 'Confirmation required' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(25092026);
 -- Tombstone unfinished claims too: a racing receipt must not restore cleared text.
 update tutor_private.requests set response_snapshot=null,reply_removed_at=statement_timestamp() where user_id=learner;
 insert into privacy_private.preferences(user_id,replies_cleared_at) values(learner,statement_timestamp())
 on conflict(user_id) do update set replies_cleared_at=excluded.replies_cleared_at,updated_at=statement_timestamp();
 return true;
end $$;

alter function public.use_scripted_tutor(text,uuid,text) set schema privacy_private;
revoke all on function privacy_private.use_scripted_tutor(text,uuid,text) from public,anon,authenticated;
create function public.use_scripted_tutor(lesson text,request uuid,intent text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(25092026);
 perform privacy_private.expire_replies(auth.uid());
 if exists(select 1 from tutor_private.requests r where r.user_id=auth.uid() and r.request_id=request and r.reply_removed_at is not null) then
  return jsonb_build_object('allowed',false,'reason','replay');
 end if;
 return privacy_private.use_scripted_tutor(lesson,request,intent);
end $$;
alter function public.read_live_tutor(text,uuid,text) set schema privacy_private;
revoke all on function privacy_private.read_live_tutor(text,uuid,text) from public,anon,authenticated;
create function public.read_live_tutor(lesson text,request uuid,intent text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(25092026);
 perform privacy_private.expire_replies(auth.uid());
 return privacy_private.read_live_tutor(lesson,request,intent);
end $$;
alter function public.finish_live_tutor(uuid,text,text) set schema privacy_private;
revoke all on function privacy_private.finish_live_tutor(uuid,text,text) from public,anon,authenticated;
create function public.finish_live_tutor(request uuid,receipt text,signature text) returns boolean
language plpgsql security definer set search_path='' as $$
declare saved boolean;
begin
 perform pg_advisory_xact_lock(25092026);
 saved:=privacy_private.finish_live_tutor(request,receipt,signature);
 -- Accounting still finalises if a learner cleared this request during generation.
 return saved and exists(select 1 from tutor_private.requests r where r.user_id=auth.uid() and r.request_id=request and r.response_snapshot is not null);
end $$;
alter function public.report_content(text,text,uuid,uuid) set schema privacy_private;
create function public.report_content(lesson text,message text,request uuid,tutor_request uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(25092026);
 perform privacy_private.expire_replies(auth.uid());
 return privacy_private.report_content(lesson,message,request,tutor_request);
end $$;
alter function public.export_learner_data() set schema privacy_private;
create function public.export_learner_data() returns jsonb
language plpgsql security definer set search_path='' as $$
declare settings jsonb; result jsonb;
begin
 settings:=public.get_privacy_settings();
 result:=privacy_private.export_learner_data()||jsonb_build_object('privacy_preferences',settings);
 if octet_length(result::text)>8388608 then raise exception 'Export exceeds download limit' using errcode='54000'; end if;
 return result;
end $$;

create function public.delete_learner_account(proof text,signature text) returns boolean
language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid(); secret text; payload jsonb; now_epoch bigint:=floor(extract(epoch from statement_timestamp()));
begin
 if learner is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if proof is null or octet_length(proof)>512 or signature is null or signature !~ '^[a-f0-9]{64}$' then
  raise exception 'Invalid deletion proof' using errcode='42501';
 end if;
 select k.secret into secret from privacy_private.deletion_keys k where singleton;
 if secret is null or encode(extensions.hmac(convert_to(proof,'UTF8'),convert_to(secret,'UTF8'),'sha256'),'hex')<>signature then
  raise exception 'Invalid deletion proof' using errcode='42501';
 end if;
 payload:=proof::jsonb;
 if payload->>'action' is distinct from 'delete-account-v1' or payload->>'owner' is distinct from learner::text
 or coalesce(payload->>'issued','') !~ '^[0-9]{1,12}$' or coalesce(payload->>'expires','') !~ '^[0-9]{1,12}$' then
  raise exception 'Invalid deletion proof' using errcode='42501';
 end if;
 if (payload->>'issued')::bigint>now_epoch+5 or (payload->>'issued')::bigint<now_epoch-60
 or (payload->>'expires')::bigint<=now_epoch or (payload->>'expires')::bigint>(payload->>'issued')::bigint+60
 or (payload->>'expires')::bigint<=(payload->>'issued')::bigint then
  raise exception 'Expired deletion proof' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(25092026);
 if not exists(select 1 from public.profiles where user_id=learner) then raise exception 'Sign in required' using errcode='42501'; end if;
 -- These old report FKs use SET NULL / NO ACTION and otherwise retain learner text.
 delete from public.report_audit where report_id in (select id from public.content_reports where user_id=learner);
 delete from public.content_reports where user_id=learner;
 -- Private evidence/notes/projects/tutor/preferences cascade; editorial links SET NULL.
 -- A provider/storage FK error rolls back this entire transaction.
 delete from auth.users where id=learner;
 return true;
end $$;
revoke all on all functions in schema privacy_private from public,anon,authenticated;
revoke all on function public.get_privacy_settings(),public.set_tutor_retention(integer),public.clear_tutor_replies(text),public.delete_learner_account(text,text) from public,anon;
grant execute on function public.get_privacy_settings(),public.set_tutor_retention(integer),public.clear_tutor_replies(text),public.delete_learner_account(text,text) to authenticated;
revoke all on function public.use_scripted_tutor(text,uuid,text),public.read_live_tutor(text,uuid,text),public.finish_live_tutor(uuid,text,text),public.report_content(text,text,uuid,uuid),public.export_learner_data() from public,anon;
grant execute on function public.use_scripted_tutor(text,uuid,text),public.read_live_tutor(text,uuid,text),public.finish_live_tutor(uuid,text,text),public.report_content(text,text,uuid,uuid),public.export_learner_data() to authenticated;
