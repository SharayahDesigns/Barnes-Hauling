begin;

create extension if not exists pgtap with schema extensions;

select plan(22);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at
)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'customer-one@example.test', '',
    now(), now(), now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'customer-two@example.test', '',
    now(), now(), now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'active-staff@example.test', '',
    now(), now(), now()
  );

insert into private.staff_members (user_id, role, is_active, created_by, deactivated_at)
values
  (
    '10000000-0000-0000-0000-000000000002',
    'customer_support',
    false,
    '10000000-0000-0000-0000-000000000003',
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    'owner',
    true,
    '10000000-0000-0000-0000-000000000003',
    null
  );

insert into public.service_areas (id, code, name, status)
values (
  '20000000-0000-0000-0000-000000000001',
  'rls_test_area',
  'RLS Test Area',
  'active'
);

insert into public.pricing_versions (
  id, code, version_number, status, currency_code, effective_from,
  publication_blockers, legal_review_required, published_at
)
values (
  '30000000-0000-0000-0000-000000000001',
  'rls_test_published',
  999,
  'draft',
  'USD',
  now() - interval '1 day',
  '{}',
  false,
  null
);

insert into public.pricing_rules (
  id, code, name, service_id, service_item_id, rule_kind
)
values (
  '31000000-0000-0000-0000-000000000001',
  'rls_test_rule',
  'RLS Test Rule',
  (select id from public.services where code = 'dumpster_rental'),
  (select id from public.service_items where code = 'dumpster_15_residential'),
  'base_price'
);

insert into public.pricing_rule_versions (
  id, pricing_rule_id, pricing_version_id, value_type, amount_cents,
  unit, customer_description
)
values (
  '32000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  'fixed_amount',
  10000,
  'rental',
  'Test rule.'
);

update public.pricing_versions
set status = 'published'
where id = '30000000-0000-0000-0000-000000000001';

insert into public.customers (id, auth_user_id, first_name, last_name, email)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Customer', 'One', 'customer-one@example.test'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'Customer', 'Two', 'customer-two@example.test'
  );

insert into public.customer_addresses (
  id, customer_id, address_line_1, city, region, postal_code,
  validation_status, service_area_id
)
values
  (
    '50000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '1 Test Street', 'Denver', 'CO', '80000',
    'validated', '20000000-0000-0000-0000-000000000001'
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    '2 Test Street', 'Denver', 'CO', '80001',
    'validated', '20000000-0000-0000-0000-000000000001'
  );

insert into public.quotes (
  id, customer_id, service_id, service_item_id, service_address_id, status
)
values
  (
    '60000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'dumpster_15_residential'),
    '50000000-0000-0000-0000-000000000001',
    'draft'
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'dumpster_15_residential'),
    '50000000-0000-0000-0000-000000000002',
    'draft'
  );

insert into public.quote_revisions (
  id, quote_id, revision_number, pricing_version_id, snapshot_type,
  subtotal_cents, total_cents, snapshot_payload, finalized_at
)
values (
  '70000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  1,
  '30000000-0000-0000-0000-000000000001',
  'fixed_amount',
  10000,
  10000,
  '{"currency":"USD","total_cents":10000}'::jsonb,
  now()
);

insert into public.bookings (
  id, customer_id, source_quote_revision_id, service_id,
  service_item_id, service_address_id, status
)
values
  (
    '80000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    '70000000-0000-0000-0000-000000000001',
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'dumpster_15_residential'),
    '50000000-0000-0000-0000-000000000001',
    'draft'
  ),
  (
    '80000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    null,
    (select id from public.services where code = 'dumpster_rental'),
    (select id from public.service_items where code = 'dumpster_15_residential'),
    '50000000-0000-0000-0000-000000000002',
    'draft'
  );

insert into public.booking_price_snapshots (
  id, booking_id, revision_number, pricing_version_id, snapshot_type,
  subtotal_cents, total_cents, snapshot_payload, finalized_at
)
values (
  '90000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  1,
  '30000000-0000-0000-0000-000000000001',
  'fixed_amount',
  10000,
  10000,
  '{"currency":"USD","total_cents":10000}'::jsonb,
  now()
);

insert into public.dumpsters (id, asset_number, dumpster_size_id, status)
values (
  'a0000000-0000-0000-0000-000000000001',
  'TEST-15-001',
  (select id from public.dumpster_sizes where code = '15_yard'),
  'available'
);

insert into public.dumpster_assignments (
  dumpster_id, booking_id, status, starts_at, ends_at
)
values (
  'a0000000-0000-0000-0000-000000000001',
  '80000000-0000-0000-0000-000000000001',
  'reserved',
  timestamptz '2026-08-01 08:00:00+00',
  timestamptz '2026-08-06 08:00:00+00'
);

insert into public.files (
  id, customer_id, quote_id, bucket_id, object_path,
  original_filename, extension, declared_mime_type, detected_mime_type,
  size_bytes, category, visibility, validation_status,
  signature_verified_at, sha256
)
values (
  'b0000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'customer-photos',
  '40000000-0000-0000-0000-000000000001/quote/60000000-0000-0000-0000-000000000001/b0000000-0000-0000-0000-000000000001.jpg',
  'test.jpg',
  'jpg',
  'image/jpeg',
  'image/jpeg',
  128,
  'quote_photo',
  'customer',
  'validated',
  now(),
  repeat('a', 64)
);

insert into storage.objects (id, bucket_id, name, owner_id)
values (
  'c0000000-0000-0000-0000-000000000001',
  'customer-photos',
  '40000000-0000-0000-0000-000000000001/quote/60000000-0000-0000-0000-000000000001/b0000000-0000-0000-0000-000000000001.jpg',
  '10000000-0000-0000-0000-000000000001'
);

set local role anon;
select is((select count(*) from public.services), 2::bigint, 'anonymous users can read the active service catalog');
select is(
  (select count(*) from public.pricing_versions where code = 'dumpster_rate_sheet_2026_07_16'),
  0::bigint,
  'anonymous users cannot read the seeded draft pricing version'
);
select throws_ok(
  $$ select * from public.customers $$,
  '42501',
  'permission denied for table customers',
  'anonymous users are denied customer data'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select is((select count(*) from public.customers), 1::bigint, 'a customer can read their own customer record');
select is(
  (select count(*) from public.customers where id = '40000000-0000-0000-0000-000000000002'),
  0::bigint,
  'a customer cannot read another customer record'
);
select is((select count(*) from public.quotes), 1::bigint, 'a customer can read their own quote');
select is(
  (select count(*) from public.quotes where id = '60000000-0000-0000-0000-000000000002'),
  0::bigint,
  'a customer cannot read another customer quote'
);
select is((select private.is_staff()), false, 'a non-staff authenticated user is denied staff authorization');
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select is((select private.is_staff()), false, 'an inactive staff member is denied staff authorization');
select is(
  (select count(*) from public.customers where id = '40000000-0000-0000-0000-000000000001'),
  0::bigint,
  'an inactive staff member cannot use staff access to read another customer'
);
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select is((select private.is_staff()), true, 'an active staff member passes staff authorization');
select is((select count(*) from public.customers), 2::bigint, 'an active staff member can read customer records through the consolidated policy');
reset role;

select throws_ok(
  $$ update public.pricing_versions set code = 'changed' where id = '30000000-0000-0000-0000-000000000001' $$,
  'P0001',
  'published or retired pricing versions are immutable',
  'published pricing is immutable'
);

select throws_ok(
  $$ update public.pricing_rule_versions set amount_cents = 11000 where id = '32000000-0000-0000-0000-000000000001' $$,
  'P0001',
  'records belonging to published or retired pricing versions are immutable',
  'published pricing rule values are immutable'
);

select throws_ok(
  $$ update public.quote_revisions set total_cents = 11000 where id = '70000000-0000-0000-0000-000000000001' $$,
  'P0001',
  'finalized price snapshots are immutable',
  'finalized quote snapshots are immutable'
);

select throws_ok(
  $$ update public.booking_price_snapshots set total_cents = 11000 where id = '90000000-0000-0000-0000-000000000001' $$,
  'P0001',
  'finalized price snapshots are immutable',
  'finalized booking snapshots are immutable'
);

select throws_like(
  $$
    insert into public.dumpster_assignments (
      dumpster_id, booking_id, status, starts_at, ends_at
    ) values (
      'a0000000-0000-0000-0000-000000000001',
      '80000000-0000-0000-0000-000000000002',
      'reserved',
      timestamptz '2026-08-05 08:00:00+00',
      timestamptz '2026-08-08 08:00:00+00'
    )
  $$,
  '%conflicting key value violates exclusion constraint%',
  'overlapping dumpster assignments are rejected'
);

select is(
  (select count(*) from storage.buckets where id in ('customer-photos', 'customer-documents') and not public),
  2::bigint,
  'both customer Storage buckets are private'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select is((select count(*) from storage.objects where bucket_id = 'customer-photos'), 1::bigint, 'a customer can read their validated private object');
reset role;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select is((select count(*) from storage.objects where bucket_id = 'customer-photos'), 0::bigint, 'another customer cannot read the private object');
reset role;

select throws_like(
  $$
    insert into public.booking_price_snapshots (
      booking_id, revision_number, pricing_version_id, snapshot_type,
      subtotal_cents, total_cents, snapshot_payload
    ) values (
      '80000000-0000-0000-0000-000000000002', 1,
      '30000000-0000-0000-0000-000000000001', 'quote_required',
      0, 0, '{"total_cents":0}'::jsonb
    )
  $$,
  '%violates check constraint%',
  'quote-required pricing cannot become a booking price snapshot'
);

select throws_like(
  $$
    insert into public.booking_price_snapshots (
      booking_id, revision_number, pricing_version_id, snapshot_type,
      subtotal_cents, total_cents, snapshot_payload
    ) values (
      '80000000-0000-0000-0000-000000000002', 1,
      '30000000-0000-0000-0000-000000000001', 'fixed_amount',
      0, 0, '{"total_cents":0}'::jsonb
    )
  $$,
  '%violates check constraint%',
  'a zero-dollar fixed booking snapshot is rejected'
);

select * from finish();
rollback;
