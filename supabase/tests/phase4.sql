begin;
set local search_path=public,extensions;
select plan(9);
insert into auth.users(id,email) values('60000000-0000-0000-0000-000000000001','tutor-cleanup@example.test');
-- Hold the same accounting lock while capturing the baseline; roll back all test changes.
select pg_advisory_xact_lock(25092026);
create temporary table tutor_baseline as
 select coalesce((select used from tutor_private.buckets where scope='global' and day=(statement_timestamp() at time zone 'UTC')::date),0) as used;
update tutor_private.policy set enabled=true,user_daily=20,global_daily=1000000;
select is(tutor_private.reserve('60000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001','js-v2-values','hint',3),true,'Reserve synthetic usage');
select is((select user_id::text from tutor_private.buckets where scope='60000000-0000-0000-0000-000000000001'),'60000000-0000-0000-0000-000000000001','Bucket ownership derived from key');
set local role authenticated;
select throws_ok($$select * from tutor_private.buckets$$,'42501','permission denied for schema tutor_private','Learner cannot inspect quota identities');
select throws_ok($$delete from auth.users where id='60000000-0000-0000-0000-000000000001'$$,'42501',null,'Learner cannot trigger account deletion directly');
reset role;
select lives_ok($$select tutor_private.reconcile('60000000-0000-0000-0000-000000000001','61000000-0000-0000-0000-000000000001',2)$$,'Measured usage reconciles with owned buckets');
delete from auth.users where id='60000000-0000-0000-0000-000000000001';
select is((select count(*) from tutor_private.buckets where scope='60000000-0000-0000-0000-000000000001'),0::bigint,'Account deletion removes private quota identifiers');
select is((select count(*) from tutor_private.requests where user_id='60000000-0000-0000-0000-000000000001'),0::bigint,'Account deletion removes requests');
select is((select used from tutor_private.buckets where scope='global' and day=(statement_timestamp() at time zone 'UTC')::date),(select used+2 from tutor_baseline),'Deletion does not refund global consumption');
select is((select user_id from tutor_private.buckets where scope='global' and day=(statement_timestamp() at time zone 'UTC')::date),null::uuid,'Global aggregate has no account identifier');
select * from finish();
rollback;
