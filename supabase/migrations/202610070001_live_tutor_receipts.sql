-- Only a scoped server HMAC capability can finish a live receipt. No service-role app client.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table tutor_private.receipt_keys (
 singleton boolean primary key default true check(singleton),
 secret text not null check(secret ~ '^[a-f0-9]{64}$')
);
alter table tutor_private.receipt_keys enable row level security;
revoke all on tutor_private.receipt_keys from public,anon,authenticated;
-- Provision locally with npm run tutor:receipts:setup; migrations contain no secret.
alter table tutor_private.requests add column completed_at timestamptz;

create function public.finish_live_tutor(request uuid, receipt text, signature text)
returns boolean language plpgsql security definer set search_path='' as $$
declare secret text; payload jsonb; reply jsonb; old tutor_private.requests; item public.lessons;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if receipt is null or octet_length(receipt)>32000 or signature is null or signature !~ '^[a-f0-9]{64}$' then
  raise exception 'Invalid receipt' using errcode='22023';
 end if;
 select k.secret into secret from tutor_private.receipt_keys k where singleton;
 if secret is null or encode(extensions.hmac(convert_to(receipt,'UTF8'),convert_to(secret,'UTF8'),'sha256'),'hex')<>signature then
  raise exception 'Invalid receipt signature' using errcode='42501';
 end if;
 payload:=receipt::jsonb;
 if payload->>'owner' is distinct from auth.uid()::text or payload->>'request' is distinct from request::text then
  raise exception 'Receipt identity mismatch' using errcode='42501';
 end if;
 select * into old from tutor_private.requests where user_id=auth.uid() and request_id=request for update;
 if not found or old.mode<>'live' then raise exception 'Live claim required'; end if;
 select * into item from public.lessons where id=old.lesson_id;
 reply:=payload->'reply';
 if jsonb_typeof(reply->'text') is distinct from 'string' or length(btrim(reply->>'text')) not between 1 and 6000
 or (reply->>'adapter' is distinct from 'scripted-live-fallback-1' and coalesce(reply->>'adapter','') !~ '^gemini:gemini-[a-z0-9.-]{1,80}$')
 or reply->'source'->>'title' is distinct from item.title
 or reply->'source'->>'href' is distinct from '/courses/'||item.course_id||'/'||item.id then
  raise exception 'Invalid completed reply';
 end if;
 if old.response_snapshot is not null then
  if old.response_snapshot<>reply then raise exception 'Receipt already completed'; end if;
  return true;
 end if;
 update tutor_private.requests set response_snapshot=reply,completed_at=statement_timestamp()
 where user_id=auth.uid() and request_id=request;
 return true;
end $$;
revoke all on function public.finish_live_tutor(uuid,text,text) from public,anon;
grant execute on function public.finish_live_tutor(uuid,text,text) to authenticated;

-- Retry retrieves a completed owned receipt without reserving or dispatching again.
create function public.read_live_tutor(lesson text, request uuid, intent text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old tutor_private.requests; remaining integer;
begin
 if auth.uid() is null or not learning_private.can_practice(auth.uid(),lesson) then
  raise exception 'Lesson access required' using errcode='42501';
 end if;
 select * into old from tutor_private.requests r where r.user_id=auth.uid() and r.request_id=request
 and r.lesson_id=lesson and r.intent=read_live_tutor.intent and r.mode='live';
 if not found or old.response_snapshot is null then return null; end if;
 select greatest(0,p.user_daily-coalesce(b.used,0)) into remaining from tutor_private.policy p
 left join tutor_private.buckets b on b.day=(statement_timestamp() at time zone 'UTC')::date and b.scope=auth.uid()::text where p.singleton;
 return jsonb_build_object('reply',old.response_snapshot,'remaining',remaining);
end $$;
revoke all on function public.read_live_tutor(text,uuid,text) from public,anon;
grant execute on function public.read_live_tutor(text,uuid,text) to authenticated;
