-- Local token allowances, not currency caps. Do not fabricate historical usage.
create table tutor_private.token_policy (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default true,
 per_request bigint not null default 65536 check(per_request=65536),
 user_daily bigint not null default 250000 check(user_daily between 0 and 100000000),
 global_daily bigint not null default 5000000 check(global_daily between 0 and 1000000000)
);
insert into tutor_private.token_policy(singleton) values(true);
create table tutor_private.token_buckets (
 day date not null, scope text not null, charged bigint not null default 0 check(charged>=0),
 user_id uuid generated always as (case when scope='global' then null else scope::uuid end) stored references auth.users(id) on delete cascade,
 primary key(day,scope)
);
create index token_buckets_owner on tutor_private.token_buckets(user_id) where user_id is not null;
alter table tutor_private.token_policy enable row level security;
alter table tutor_private.token_buckets enable row level security;
revoke all on tutor_private.token_policy,tutor_private.token_buckets from public,anon,authenticated;
alter table tutor_private.requests add column token_reserved bigint check(token_reserved=65536);
alter table tutor_private.requests add column token_usage jsonb;
alter table tutor_private.requests add column token_finalized_at timestamptz;

create function tutor_private.token_allowance(learner uuid) returns jsonb
language sql set search_path='' as $$
 select jsonb_build_object('limit',p.user_daily,'charged',coalesce(b.charged,0),'remaining',greatest(0,p.user_daily-coalesce(b.charged,0)))
 from tutor_private.token_policy p left join tutor_private.token_buckets b
 on b.day=(statement_timestamp() at time zone 'UTC')::date and b.scope=learner::text where p.singleton
$$;
revoke all on function tutor_private.token_allowance(uuid) from public,anon,authenticated;

alter function public.claim_live_tutor(text,uuid,text) set schema tutor_private;
revoke all on function tutor_private.claim_live_tutor(text,uuid,text) from public,anon,authenticated;
create function public.claim_live_tutor(lesson text,request uuid,intent text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid(); result jsonb; p tutor_private.token_policy;
 today date:=(statement_timestamp() at time zone 'UTC')::date;
begin
 if learner is null then raise exception 'Sign in required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(25092026);
 -- Preserve single-use admission even when token policy is disabled.
 if exists(select 1 from tutor_private.requests where user_id=learner and request_id=request) then
  return jsonb_build_object('allowed',false,'reason','replay');
 end if;
 select * into p from tutor_private.token_policy where singleton;
 if not found or not p.enabled then return jsonb_build_object('allowed',false,'reason','tokens_disabled'); end if;
 begin
  result:=tutor_private.claim_live_tutor(lesson,request,intent);
  if not (result->>'allowed')::boolean then return result; end if;
  insert into tutor_private.token_buckets(day,scope) values(today,'global'),(today,learner::text) on conflict do nothing;
  if (select charged from tutor_private.token_buckets where day=today and scope=learner::text)>p.user_daily-p.per_request
  or (select charged from tutor_private.token_buckets where day=today and scope='global')>p.global_daily-p.per_request then
   -- Subtransaction rolls back BOTH the request-unit claim and token bucket inserts.
   raise exception 'Token allowance reached' using errcode='PT429';
  end if;
  update tutor_private.token_buckets set charged=charged+p.per_request where day=today and scope in ('global',learner::text);
  update tutor_private.requests set token_reserved=p.per_request where user_id=learner and request_id=request;
  return result||jsonb_build_object('tokenReserved',p.per_request,'tokens',tutor_private.token_allowance(learner));
 exception when sqlstate 'PT429' then
  return jsonb_build_object('allowed',false,'reason','tokens_limit','tokens',tutor_private.token_allowance(learner));
 end;
end $$;
revoke all on function public.claim_live_tutor(text,uuid,text) from public,anon;
grant execute on function public.claim_live_tutor(text,uuid,text) to authenticated;

alter function public.finish_live_tutor(uuid,text,text) set schema tutor_private;
revoke all on function tutor_private.finish_live_tutor(uuid,text,text) from public,anon,authenticated;
create function public.finish_live_tutor(request uuid,receipt text,signature text) returns boolean
language plpgsql security definer set search_path='' as $$
declare old tutor_private.requests; usage jsonb; field text; measured bigint; result boolean;
begin
 perform pg_advisory_xact_lock(25092026);
 -- Existing proof/owner/request/source checks and immutable reply write. Any failure rolls back all changes.
 result:=tutor_private.finish_live_tutor(request,receipt,signature);
 select * into old from tutor_private.requests where user_id=auth.uid() and request_id=request for update;
 usage:=(receipt::jsonb)->'usage';
 if usage='null'::jsonb then usage:=null; end if;
 if old.token_reserved is null then
  if usage is not null then raise exception 'Legacy claim has no token reservation'; end if;
  return result;
 end if;
 if usage is not null then
  if jsonb_typeof(usage) is distinct from 'object' then raise exception 'Invalid token usage'; end if;
  if (select count(*) from jsonb_object_keys(usage))<>7 then raise exception 'Invalid token usage'; end if;
  foreach field in array array['input','output','thoughts','cached','total'] loop
   if jsonb_typeof(usage->field) is distinct from 'number' or (usage->>field) !~ '^[0-9]{1,7}$'
   or (usage->>field)::bigint>1000000 then raise exception 'Invalid token usage'; end if;
  end loop;
  if (usage->>'total')::bigint<>(usage->>'input')::bigint+(usage->>'output')::bigint+(usage->>'thoughts')::bigint
  or (usage->>'cached')::bigint>(usage->>'input')::bigint
  or coalesce(usage->>'model','') !~ '^gemini-[a-z0-9.-]{1,80}$'
  or coalesce(usage->>'promptVersion','') !~ '^[a-z0-9.-]{1,80}$'
  or (old.response_snapshot->>'adapter' like 'gemini:%' and old.response_snapshot->>'adapter' <> 'gemini:'||(usage->>'model')) then
   raise exception 'Invalid token usage';
  end if;
 end if;
 if old.token_finalized_at is not null then
  if old.token_usage is distinct from usage then raise exception 'Token usage already finalized'; end if;
  return result;
 end if;
 if usage is not null then
  measured:=(usage->>'total')::bigint;
  update tutor_private.token_buckets set charged=charged+measured-old.token_reserved
  where day=old.day and scope in ('global',old.user_id::text);
  -- Unexpected measured overruns are recorded in full and pause further live admission.
  if measured>old.token_reserved then update tutor_private.token_policy set enabled=false where singleton; end if;
 end if;
 update tutor_private.requests set token_usage=usage,token_finalized_at=statement_timestamp()
 where user_id=auth.uid() and request_id=request;
 return result;
end $$;
revoke all on function public.finish_live_tutor(uuid,text,text) from public,anon;
grant execute on function public.finish_live_tutor(uuid,text,text) to authenticated;

alter function public.read_live_tutor(text,uuid,text) set schema tutor_private;
revoke all on function tutor_private.read_live_tutor(text,uuid,text) from public,anon,authenticated;
create function public.read_live_tutor(lesson text,request uuid,intent text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; usage jsonb;
begin
 result:=tutor_private.read_live_tutor(lesson,request,intent);
 if result is null then return null; end if;
 select token_usage into usage from tutor_private.requests where user_id=auth.uid() and request_id=request;
 return result||jsonb_build_object('usage',usage,'tokens',tutor_private.token_allowance(auth.uid()));
end $$;
revoke all on function public.read_live_tutor(text,uuid,text) from public,anon;
grant execute on function public.read_live_tutor(text,uuid,text) to authenticated;

create function public.get_tutor_usage() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 return tutor_private.token_allowance(auth.uid());
end $$;
revoke all on function public.get_tutor_usage() from public,anon;
grant execute on function public.get_tutor_usage() to authenticated;
