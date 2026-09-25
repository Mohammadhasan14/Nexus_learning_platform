-- Remove identifiers for already-deleted accounts; preserve aggregate global usage.
delete from tutor_private.buckets b
where b.scope <> 'global'
  and not exists(select 1 from auth.users u where u.id::text=b.scope);

-- Derive ownership from the existing key, so callers cannot supply mismatched identities.
-- The global bucket has no owner and survives account deletion without a quota refund.
alter table tutor_private.buckets add column user_id uuid
 generated always as (case when scope='global' then null else scope::uuid end) stored
 references auth.users(id) on delete cascade;
create index tutor_buckets_owner on tutor_private.buckets(user_id) where user_id is not null;
