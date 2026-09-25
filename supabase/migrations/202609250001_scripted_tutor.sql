-- Scripted-only request units, not currency or live-token budgets.
-- Private primitives leave uncertain reservations charged until trusted reconciliation.
create schema tutor_private;
revoke all on schema tutor_private from public, anon, authenticated;
create table tutor_private.policy (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default true,
 user_daily integer not null check(user_daily between 0 and 10000),
 global_daily integer not null check(global_daily between 0 and 1000000)
);
insert into tutor_private.policy(singleton,user_daily,global_daily) values(true,20,1000);
create table tutor_private.buckets (
 day date not null,
 scope text not null,
 used integer not null default 0 check(used>=0),
 primary key(day,scope)
);
create table tutor_private.requests (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 day date not null,
 lesson_id text not null references public.lessons(id),
 intent text not null check(intent in ('hint','explain','example','reflect')),
 reserved integer not null check(reserved>0),
 actual integer check(actual>=0 and actual<=reserved),
 primary key(user_id,request_id)
);
alter table tutor_private.policy enable row level security;
alter table tutor_private.buckets enable row level security;
alter table tutor_private.requests enable row level security;
revoke all on all tables in schema tutor_private from public, anon, authenticated;

create function tutor_private.reserve(learner uuid, request uuid, lesson text, intent text, units integer)
returns boolean language plpgsql set search_path='' as $$
declare today date:=(statement_timestamp() at time zone 'UTC')::date; p tutor_private.policy; old tutor_private.requests;
begin
 -- One short transaction lock covers BOTH user and global checks; never held over provider I/O.
 perform pg_advisory_xact_lock(25092026);
 if learner is null or request is null or units is null or units<=0 then raise exception 'Invalid reservation'; end if;
 select * into old from tutor_private.requests where user_id=learner and request_id=request;
 if found then
  if old.lesson_id<>lesson or old.intent<>intent or old.reserved<>units then raise exception 'Request key already used'; end if;
  return true;
 end if;
 select * into p from tutor_private.policy where singleton;
 if not found or not p.enabled then return false; end if;
 insert into tutor_private.buckets(day,scope) values(today,'global'),(today,learner::text) on conflict do nothing;
 if (select used from tutor_private.buckets where day=today and scope='global') > p.global_daily-units
 or (select used from tutor_private.buckets where day=today and scope=learner::text) > p.user_daily-units then return false; end if;
 update tutor_private.buckets set used=used+units where day=today and scope in ('global',learner::text);
 insert into tutor_private.requests(user_id,request_id,day,lesson_id,intent,reserved) values(learner,request,today,lesson,intent,units);
 return true;
end $$;

create function tutor_private.reconcile(learner uuid, request uuid, measured integer)
returns void language plpgsql set search_path='' as $$
declare old tutor_private.requests;
begin
 perform pg_advisory_xact_lock(25092026);
 select * into old from tutor_private.requests where user_id=learner and request_id=request;
 if not found then raise exception 'Unknown reservation'; end if;
 if measured is null or measured<0 or measured>old.reserved then raise exception 'Invalid measured usage'; end if;
 if old.actual is not null then
  if old.actual<>measured then raise exception 'Already reconciled'; end if;
  return;
 end if;
 update tutor_private.buckets set used=used-(old.reserved-measured) where day=old.day and scope in ('global',learner::text);
 update tutor_private.requests set actual=measured where user_id=learner and request_id=request;
end $$;

create function public.use_scripted_tutor(lesson text, request uuid, intent text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare learner uuid:=auth.uid(); item public.lessons; remaining integer; today date:=(statement_timestamp() at time zone 'UTC')::date;
begin
 if learner is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if request is null or intent is null or intent not in ('hint','explain','example','reflect') then raise exception 'Invalid request' using errcode='22023'; end if;
 if not exists(select 1 from public.profiles where user_id=learner and onboarding_completed_at is not null)
 or not learning_private.can_practice(learner,lesson) then raise exception 'Lesson access required' using errcode='42501'; end if;
 select l.* into item from public.lessons l join public.course_versions c on c.id=l.course_id
 where l.id=lesson and c.review_status='reviewed' and c.id='javascript-foundations-v2'
 and l.id in ('js-v2-values','js-v2-conditions','js-v2-functions');
 if not found then raise exception 'Reviewed context required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(25092026);
 if not exists(select 1 from tutor_private.policy where singleton and enabled) then return jsonb_build_object('allowed',false,'reason','disabled'); end if;
 if not tutor_private.reserve(learner,request,lesson,intent,1) then return jsonb_build_object('allowed',false,'reason','limit'); end if;
 -- Scripted work has a fixed known cost of one unit, even if the client disconnects.
 perform tutor_private.reconcile(learner,request,1);
 select greatest(0,p.user_daily-coalesce(b.used,0)) into remaining from tutor_private.policy p
 left join tutor_private.buckets b on b.day=today and b.scope=learner::text where p.singleton;
 return jsonb_build_object('allowed',true,'remaining',remaining,'lesson',item.id,'course',item.course_id,'title',item.title);
end $$;
revoke all on all functions in schema tutor_private from public, anon, authenticated;
revoke all on function public.use_scripted_tutor(text,uuid,text) from public,anon;
grant execute on function public.use_scripted_tutor(text,uuid,text) to authenticated;
