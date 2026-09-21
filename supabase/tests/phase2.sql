begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(12);
select has_table('public', 'profiles', 'Private profiles exist');
select has_table('public', 'staff_roles', 'Trusted role assignments exist');
insert into auth.users (id, email, raw_user_meta_data) values
 ('10000000-0000-0000-0000-000000000001','policy-a@example.test','{"role":"admin"}'),
 ('10000000-0000-0000-0000-000000000002','policy-b@example.test','{}'),
 ('10000000-0000-0000-0000-000000000003','policy-staff@example.test','{}');
insert into public.staff_roles (user_id,role) values ('10000000-0000-0000-0000-000000000003','editor');
set local role anon;
select throws_ok('select * from public.profiles', '42501', 'permission denied for table profiles', 'Anonymous reads denied');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select is((select count(*) from public.profiles),1::bigint,'User A sees only own profile');
select is((select count(*) from public.staff_roles),0::bigint,'Forged user metadata grants no staff role');
select lives_ok($$update public.profiles set goal='Learn JavaScript foundations' where user_id=auth.uid()$$,'Own goal can be saved');
select ok((select onboarding_completed_at is not null from public.profiles where user_id=auth.uid()),'Onboarding timestamp is server-derived');
select throws_ok($$update public.profiles set user_id='10000000-0000-0000-0000-000000000002'$$,'42501','permission denied for table profiles','Ownership cannot be reassigned');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select is((select count(*) from public.profiles where user_id='10000000-0000-0000-0000-000000000001'),0::bigint,'User B cannot read user A');
select throws_ok($$insert into public.staff_roles(user_id,role) values(auth.uid(),'admin')$$,'42501','permission denied for table staff_roles','Self-promotion denied');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select is((select role from public.staff_roles),'editor','Staff can read own assignment');
select is((select count(*) from public.profiles),1::bigint,'Staff has no broad learner profile access');
reset role;
select * from finish();
rollback;
