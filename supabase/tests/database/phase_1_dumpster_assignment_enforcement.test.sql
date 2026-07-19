begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

-- Minimal chain to attach an assignment to a dumpster:
-- auth user -> customer -> address -> booking, plus two available dumpsters.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
)
values (
  'e0000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'assign-test@example.test', '',
  now(), now(), now()
);

insert into public.service_areas (id, code, name, status)
values (
  'e0000000-0000-0000-0000-0000000000a2',
  'assign_test_area', 'Assign Test Area', 'active'
);

insert into public.customers (id, auth_user_id, first_name, last_name, email)
values (
  'e0000000-0000-0000-0000-0000000000a3',
  'e0000000-0000-0000-0000-0000000000a1',
  'Assign', 'Test', 'assign-test@example.test'
);

insert into public.customer_addresses (
  id, customer_id, address_line_1, city, region, postal_code,
  validation_status, service_area_id
)
values (
  'e0000000-0000-0000-0000-0000000000a4',
  'e0000000-0000-0000-0000-0000000000a3',
  '1 Assign Street', 'Denver', 'CO', '80000',
  'validated', 'e0000000-0000-0000-0000-0000000000a2'
);

insert into public.bookings (
  id, customer_id, source_quote_revision_id, service_id,
  service_item_id, service_address_id, status
)
values (
  'e0000000-0000-0000-0000-0000000000a5',
  'e0000000-0000-0000-0000-0000000000a3',
  null,
  (select id from public.services where code = 'dumpster_rental'),
  (select id from public.service_items where code = 'dumpster_15_residential'),
  'e0000000-0000-0000-0000-0000000000a4',
  'draft'
);

insert into public.dumpsters (id, asset_number, dumpster_size_id, status)
values
  (
    'e0000000-0000-0000-0000-0000000000a6',
    'ASSIGN-TEST-A',
    (select id from public.dumpster_sizes where code = '15_yard'),
    'available'
  ),
  (
    'e0000000-0000-0000-0000-0000000000a7',
    'ASSIGN-TEST-B',
    (select id from public.dumpster_sizes where code = '15_yard'),
    'available'
  );

-- Activating an assignment auto-reserves the available dumpster (source of truth).
insert into public.dumpster_assignments (
  id, dumpster_id, booking_id, status, starts_at, ends_at
)
values (
  'e0000000-0000-0000-0000-0000000000a8',
  'e0000000-0000-0000-0000-0000000000a6',
  'e0000000-0000-0000-0000-0000000000a5',
  'reserved',
  timestamptz '2026-09-01 08:00:00+00',
  timestamptz '2026-09-06 08:00:00+00'
);

select is(
  (select status::text from public.dumpsters
    where id = 'e0000000-0000-0000-0000-0000000000a6'),
  'reserved',
  'Activating an assignment reserves the previously available dumpster'
);

-- Guard: cannot mark a dumpster available while it has an active assignment.
select throws_ok(
  $$update public.dumpsters set status = 'available'
    where id = 'e0000000-0000-0000-0000-0000000000a6'$$,
  '23514',
  null,
  'Cannot mark a dumpster available while an active assignment exists'
);

-- Releasing the assignment frees the dumpster to be marked available again.
update public.dumpster_assignments
set status = 'released'
where id = 'e0000000-0000-0000-0000-0000000000a8';

select lives_ok(
  $$update public.dumpsters set status = 'available'
    where id = 'e0000000-0000-0000-0000-0000000000a6'$$,
  'A released assignment no longer blocks availability'
);

-- Control: a dumpster with no assignment can be marked available freely.
select lives_ok(
  $$update public.dumpsters set status = 'available'
    where id = 'e0000000-0000-0000-0000-0000000000a7'$$,
  'A dumpster with no assignment can be marked available'
);

select * from finish();

rollback;
