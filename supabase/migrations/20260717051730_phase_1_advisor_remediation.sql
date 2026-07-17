-- Phase 1 advisor remediation: foreign-key indexes, consolidated customer/staff
-- read policies, and explicit deny-by-default documentation.

-- Nullable foreign keys use partial indexes so null-only rows do not consume
-- index space. Required foreign keys use ordinary btree indexes.
create index staff_members_created_by_idx
  on private.staff_members(created_by)
  where created_by is not null;
create index availability_rules_service_item_id_idx
  on public.availability_rules(service_item_id)
  where service_item_id is not null;
create index availability_rules_service_zone_id_idx
  on public.availability_rules(service_zone_id)
  where service_zone_id is not null;
create index booking_events_performed_by_idx
  on public.booking_events(performed_by)
  where performed_by is not null;
create index booking_price_snapshots_created_by_idx
  on public.booking_price_snapshots(created_by)
  where created_by is not null;
create index booking_price_snapshots_source_quote_revision_id_idx
  on public.booking_price_snapshots(source_quote_revision_id)
  where source_quote_revision_id is not null;
create index bookings_service_address_id_idx
  on public.bookings(service_address_id);
create index bookings_service_id_idx
  on public.bookings(service_id);
create index bookings_service_item_id_idx
  on public.bookings(service_item_id)
  where service_item_id is not null;
create index customer_addresses_service_area_id_idx
  on public.customer_addresses(service_area_id)
  where service_area_id is not null;
create index dumpster_assignments_assigned_by_idx
  on public.dumpster_assignments(assigned_by)
  where assigned_by is not null;
create index dumpster_status_history_changed_by_idx
  on public.dumpster_status_history(changed_by)
  where changed_by is not null;
create index files_uploaded_by_idx
  on public.files(uploaded_by)
  where uploaded_by is not null;
create index pricing_rules_service_item_id_idx
  on public.pricing_rules(service_item_id)
  where service_item_id is not null;
create index pricing_rules_service_zone_id_idx
  on public.pricing_rules(service_zone_id)
  where service_zone_id is not null;
create index quote_revisions_created_by_idx
  on public.quote_revisions(created_by)
  where created_by is not null;
create index quote_status_history_changed_by_idx
  on public.quote_status_history(changed_by)
  where changed_by is not null;
create index quotes_service_id_idx
  on public.quotes(service_id);
create index quotes_service_item_id_idx
  on public.quotes(service_item_id)
  where service_item_id is not null;

-- One permissive SELECT policy per table avoids evaluating separate ownership
-- and staff policies for every row while preserving the same OR semantics.
drop policy customers_own_read on public.customers;
drop policy customers_staff_read on public.customers;
create policy customers_customer_or_staff_read on public.customers
for select to authenticated
using (
  (select auth.uid()) = auth_user_id
  or (select private.is_staff())
);

drop policy customer_addresses_own_read on public.customer_addresses;
drop policy customer_addresses_staff_read on public.customer_addresses;
create policy customer_addresses_customer_or_staff_read on public.customer_addresses
for select to authenticated
using (
  exists (
    select 1 from public.customers
    where customers.id = customer_addresses.customer_id
      and customers.auth_user_id = (select auth.uid())
  )
  or (select private.is_staff())
);

drop policy notification_consents_own_read on public.notification_consents;
drop policy notification_consents_staff_read on public.notification_consents;
create policy notification_consents_customer_or_staff_read on public.notification_consents
for select to authenticated
using (
  exists (
    select 1 from public.customers
    where customers.id = notification_consents.customer_id
      and customers.auth_user_id = (select auth.uid())
  )
  or (select private.is_staff())
);

drop policy quotes_own_read on public.quotes;
drop policy quotes_staff_read on public.quotes;
create policy quotes_customer_or_staff_read on public.quotes
for select to authenticated
using (
  exists (
    select 1 from public.customers
    where customers.id = quotes.customer_id
      and customers.auth_user_id = (select auth.uid())
  )
  or (select private.is_staff())
);

drop policy quote_revisions_own_read on public.quote_revisions;
drop policy quote_revisions_staff_read on public.quote_revisions;
create policy quote_revisions_customer_or_staff_read on public.quote_revisions
for select to authenticated
using (
  exists (
    select 1
    from public.quotes
    join public.customers on customers.id = quotes.customer_id
    where quotes.id = quote_revisions.quote_id
      and customers.auth_user_id = (select auth.uid())
  )
  or (select private.is_staff())
);

drop policy quote_items_own_read on public.quote_items;
drop policy quote_items_staff_read on public.quote_items;
create policy quote_items_customer_or_staff_read on public.quote_items
for select to authenticated
using (
  exists (
    select 1
    from public.quote_revisions
    join public.quotes on quotes.id = quote_revisions.quote_id
    join public.customers on customers.id = quotes.customer_id
    where quote_revisions.id = quote_items.quote_revision_id
      and customers.auth_user_id = (select auth.uid())
  )
  or (select private.is_staff())
);

drop policy quote_status_history_own_read on public.quote_status_history;
drop policy quote_status_history_staff_read on public.quote_status_history;
create policy quote_status_history_customer_or_staff_read on public.quote_status_history
for select to authenticated
using (
  exists (
    select 1
    from public.quotes
    join public.customers on customers.id = quotes.customer_id
    where quotes.id = quote_status_history.quote_id
      and customers.auth_user_id = (select auth.uid())
  )
  or (select private.is_staff())
);

drop policy bookings_own_read on public.bookings;
drop policy bookings_staff_read on public.bookings;
create policy bookings_customer_or_staff_read on public.bookings
for select to authenticated
using (
  exists (
    select 1 from public.customers
    where customers.id = bookings.customer_id
      and customers.auth_user_id = (select auth.uid())
  )
  or (select private.is_staff())
);

drop policy booking_price_snapshots_own_read on public.booking_price_snapshots;
drop policy booking_price_snapshots_staff_read on public.booking_price_snapshots;
create policy booking_price_snapshots_customer_or_staff_read on public.booking_price_snapshots
for select to authenticated
using (
  exists (
    select 1
    from public.bookings
    join public.customers on customers.id = bookings.customer_id
    where bookings.id = booking_price_snapshots.booking_id
      and customers.auth_user_id = (select auth.uid())
  )
  or (select private.is_staff())
);

drop policy booking_items_own_read on public.booking_items;
drop policy booking_items_staff_read on public.booking_items;
create policy booking_items_customer_or_staff_read on public.booking_items
for select to authenticated
using (
  exists (
    select 1
    from public.booking_price_snapshots
    join public.bookings on bookings.id = booking_price_snapshots.booking_id
    join public.customers on customers.id = bookings.customer_id
    where booking_price_snapshots.id = booking_items.booking_price_snapshot_id
      and customers.auth_user_id = (select auth.uid())
  )
  or (select private.is_staff())
);

drop policy booking_events_own_read on public.booking_events;
drop policy booking_events_staff_read on public.booking_events;
create policy booking_events_customer_or_staff_read on public.booking_events
for select to authenticated
using (
  exists (
    select 1
    from public.bookings
    join public.customers on customers.id = bookings.customer_id
    where bookings.id = booking_events.booking_id
      and customers.auth_user_id = (select auth.uid())
  )
  or (select private.is_staff())
);

drop policy files_own_read on public.files;
drop policy files_staff_read on public.files;
create policy files_customer_or_staff_read on public.files
for select to authenticated
using (
  (
    visibility = 'customer'
    and validation_status = 'validated'
    and exists (
      select 1 from public.customers
      where customers.id = files.customer_id
        and customers.auth_user_id = (select auth.uid())
    )
  )
  or (select private.is_staff())
);

comment on table private.staff_members is
  'Private staff authorization registry. RLS has no direct policies by design; access is limited to trusted bootstrap/admin SQL and private.is_staff().';
comment on table public.availability_rules is
  'Internal scheduling configuration. RLS deny-by-default until the scheduling administration migration adds narrowly scoped staff operations.';
comment on table public.blackout_dates is
  'Internal scheduling blackout configuration. RLS deny-by-default until the scheduling administration migration adds narrowly scoped staff operations.';
comment on table public.dumpsters is
  'Internal dumpster inventory. RLS deny-by-default; customer and ordinary authenticated sessions have no direct access.';
comment on table public.dumpster_assignments is
  'Internal inventory scheduling records. RLS deny-by-default; assignments use trusted server-side staff operations.';
comment on table public.dumpster_status_history is
  'Internal operational evidence. RLS deny-by-default; status history uses trusted server-side staff operations.';
