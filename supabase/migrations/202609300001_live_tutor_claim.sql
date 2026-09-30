-- Local free-tier pilot: shared request-unit caps, not token/currency accounting.
-- A claim is consumed before provider I/O; uncertain attempts are never refunded.
alter table tutor_private.requests add column mode text not null default 'scripted'
 check(mode in ('scripted','live'));

create function public.claim_live_tutor(lesson text, request uuid, intent text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; item public.lessons;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(25092026);
 -- No replay, including cross-mode reuse: at most one provider dispatch per owner/key.
 if exists(select 1 from tutor_private.requests where user_id=auth.uid() and request_id=request) then
  return jsonb_build_object('allowed',false,'reason','replay');
 end if;
 -- Reuse the reviewed-context, onboarding, prerequisite and atomic quota checks.
 result:=tutor_private.use_scripted_tutor_base(lesson,request,intent);
 if not (result->>'allowed')::boolean then return result; end if;
 update tutor_private.requests set mode='live' where user_id=auth.uid() and request_id=request;
 select * into item from public.lessons where id=lesson;
 return result||jsonb_build_object('objective',item.objective,'body',item.body,'example',item.example);
end $$;
revoke all on function public.claim_live_tutor(text,uuid,text) from public,anon;
grant execute on function public.claim_live_tutor(text,uuid,text) to authenticated;

-- Live replies are not persisted in this pilot. Never fabricate a scripted receipt for them.
alter function public.use_scripted_tutor(text,uuid,text) set schema tutor_private;
revoke all on function tutor_private.use_scripted_tutor(text,uuid,text) from public,anon,authenticated;
create function public.use_scripted_tutor(lesson text, request uuid, intent text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(25092026);
 if exists(select 1 from tutor_private.requests where user_id=auth.uid() and request_id=request and mode='live') then
  raise exception 'Request key already used';
 end if;
 return tutor_private.use_scripted_tutor(lesson,request,intent);
end $$;
revoke all on function public.use_scripted_tutor(text,uuid,text) from public,anon;
grant execute on function public.use_scripted_tutor(text,uuid,text) to authenticated;
