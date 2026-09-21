-- Phase 2 only. Course, grading and progress tables belong to subsequent phases.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Learner' check (char_length(btrim(display_name)) between 1 and 60),
  goal text not null default '' check (goal = '' or char_length(btrim(goal)) between 10 and 500),
  daily_minutes integer not null default 20 check (daily_minutes between 5 and 240 and daily_minutes % 5 = 0),
  locale text not null default 'en' check (locale in ('en', 'en-IN', 'en-US', 'en-GB')),
  timezone text not null default 'UTC',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Private learner preferences, not learning progress or mastery.';

create table public.staff_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('editor', 'admin')),
  created_at timestamptz not null default now()
);
comment on table public.staff_roles is 'Provisioned by trusted database operators only; never from user metadata.';

create function public.prepare_profile_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid timezone' using errcode = '23514';
  end if;
  new.updated_at := now();
  if new.goal <> '' and old.onboarding_completed_at is null then
    new.onboarding_completed_at := now();
  else
    new.onboarding_completed_at := old.onboarding_completed_at;
  end if;
  return new;
end;
$$;
create trigger profiles_before_update before update on public.profiles
for each row execute function public.prepare_profile_update();

create function public.create_learner_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- User-editable auth metadata is deliberately not used for ownership or roles.
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
create trigger auth_user_created after insert on auth.users
for each row execute function public.create_learner_profile();
-- Existing identities are backfilled when applying the migration to a local database.
insert into public.profiles (user_id) select id from auth.users on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
revoke all on public.profiles, public.staff_roles from anon, authenticated;
grant select on public.profiles, public.staff_roles to authenticated;
grant update (display_name, goal, daily_minutes, locale, timezone) on public.profiles to authenticated;
create policy profiles_read_own on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy staff_read_own_role on public.staff_roles for select to authenticated
using ((select auth.uid()) = user_id);
revoke all on function public.create_learner_profile() from public, anon, authenticated;
revoke all on function public.prepare_profile_update() from public, anon, authenticated;
-- Primary keys index all Phase 2 ownership lookups. No broad staff access to private profiles.
