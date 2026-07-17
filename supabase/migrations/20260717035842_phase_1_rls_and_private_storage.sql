-- Phase 1 authorization, immutability, booking gates, and private Storage.

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from private.staff_members as staff
      where staff.user_id = (select auth.uid())
        and staff.is_active
    );
$$;

revoke all on function private.is_staff() from public, anon, authenticated;
grant usage on schema private to authenticated;
-- Explicitly required by staff RLS policies. The helper returns only a boolean,
-- validates auth.uid(), and exposes no staff rows.
grant execute on function private.is_staff() to authenticated;

create or replace function private.guard_pricing_version()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_becoming_published boolean := false;
begin
  if tg_op = 'DELETE' then
    if old.status in ('published', 'retired') then
      raise exception 'published or retired pricing versions are immutable';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.status in ('published', 'retired') then
    if not (
      old.status = 'published'
      and new.status = 'retired'
      and (to_jsonb(new) - array['status', 'updated_at']) = (to_jsonb(old) - array['status', 'updated_at'])
    ) then
      raise exception 'published or retired pricing versions are immutable';
    end if;
  end if;

  if tg_op = 'INSERT' then
    is_becoming_published := new.status = 'published';
  elsif tg_op = 'UPDATE' then
    is_becoming_published := new.status = 'published' and old.status is distinct from 'published';
  end if;

  if is_becoming_published then
    if new.effective_from is null then
      raise exception 'published pricing requires an effective_from timestamp';
    end if;
    if cardinality(new.publication_blockers) <> 0 then
      raise exception 'pricing publication blockers must be resolved before publishing';
    end if;
    if new.legal_review_required then
      raise exception 'pricing terms require legal review before publishing';
    end if;
    if not exists (
      select 1 from public.service_areas where status = 'active'
    ) then
      raise exception 'at least one confirmed active service area is required before publishing pricing';
    end if;
    new.published_at = coalesce(new.published_at, now());
  end if;

  return new;
end;
$$;

create or replace function private.guard_pricing_child()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  version_id uuid;
  version_status public.pricing_version_status;
begin
  if tg_op = 'DELETE' then
    version_id := old.pricing_version_id;
  else
    version_id := new.pricing_version_id;
  end if;
  select status into version_status from public.pricing_versions where id = version_id;

  if version_status in ('published', 'retired') then
    raise exception 'records belonging to published or retired pricing versions are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.guard_finalized_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.finalized_at is not null then
    raise exception 'finalized price snapshots are immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.guard_snapshot_item()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_id uuid;
  parent_finalized_at timestamptz;
begin
  if tg_table_name = 'quote_items' then
    parent_id := case when tg_op = 'DELETE' then old.quote_revision_id else new.quote_revision_id end;
    select finalized_at into parent_finalized_at from public.quote_revisions where id = parent_id;
  else
    parent_id := case when tg_op = 'DELETE' then old.booking_price_snapshot_id else new.booking_price_snapshot_id end;
    select finalized_at into parent_finalized_at from public.booking_price_snapshots where id = parent_id;
  end if;

  if parent_finalized_at is not null then
    raise exception 'items belonging to a finalized price snapshot are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function private.reject_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

create or replace function private.enforce_booking_production_gate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('confirmed', 'scheduled', 'in_progress', 'completed') then
    if not exists (
      select 1
      from public.booking_price_snapshots as snapshot
      join public.pricing_versions as version on version.id = snapshot.pricing_version_id
      where snapshot.booking_id = new.id
        and snapshot.finalized_at is not null
        and snapshot.snapshot_type <> 'quote_required'
        and version.status = 'published'
        and version.effective_from <= now()
        and (version.effective_to is null or version.effective_to > now())
    ) then
      raise exception 'production booking status requires a finalized non-zero snapshot from currently published pricing';
    end if;

    if not exists (
      select 1
      from public.customer_addresses as address
      join public.service_areas as area on area.id = address.service_area_id
      where address.id = new.service_address_id
        and address.validation_status = 'validated'
        and area.status = 'active'
    ) then
      raise exception 'production booking status requires a validated address in an active service area';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.record_quote_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.quote_status_history (
      quote_id,
      previous_status,
      new_status,
      changed_by
    ) values (
      new.id,
      old.status,
      new.status,
      (select auth.uid())
    );
  end if;
  return new;
end;
$$;

create or replace function private.record_booking_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.booking_events (
      booking_id,
      event_type,
      previous_status,
      new_status,
      performed_by
    ) values (
      new.id,
      'status_changed',
      old.status,
      new.status,
      (select auth.uid())
    );
  end if;
  return new;
end;
$$;

create or replace function private.record_dumpster_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.dumpster_status_history (
      dumpster_id,
      previous_status,
      new_status,
      changed_by,
      location
    ) values (
      new.id,
      old.status,
      new.status,
      (select auth.uid()),
      new.current_location
    );
  end if;
  return new;
end;
$$;

create or replace function private.guard_protected_file_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.legal_hold then
    raise exception 'files under legal hold cannot be deleted';
  end if;
  return old;
end;
$$;

revoke all on function private.guard_pricing_version() from public, anon, authenticated;
revoke all on function private.guard_pricing_child() from public, anon, authenticated;
revoke all on function private.guard_finalized_snapshot() from public, anon, authenticated;
revoke all on function private.guard_snapshot_item() from public, anon, authenticated;
revoke all on function private.reject_mutation() from public, anon, authenticated;
revoke all on function private.enforce_booking_production_gate() from public, anon, authenticated;
revoke all on function private.record_quote_status_change() from public, anon, authenticated;
revoke all on function private.record_booking_status_change() from public, anon, authenticated;
revoke all on function private.record_dumpster_status_change() from public, anon, authenticated;
revoke all on function private.guard_protected_file_delete() from public, anon, authenticated;

create trigger pricing_versions_guard
before insert or update or delete on public.pricing_versions
for each row execute function private.guard_pricing_version();

create trigger pricing_rule_versions_guard
before insert or update or delete on public.pricing_rule_versions
for each row execute function private.guard_pricing_child();

create trigger pricing_version_terms_guard
before insert or update or delete on public.pricing_version_terms
for each row execute function private.guard_pricing_child();

create trigger quote_revisions_guard
before update or delete on public.quote_revisions
for each row execute function private.guard_finalized_snapshot();

create trigger booking_price_snapshots_guard
before update or delete on public.booking_price_snapshots
for each row execute function private.guard_finalized_snapshot();

create trigger quote_items_guard
before insert or update or delete on public.quote_items
for each row execute function private.guard_snapshot_item();

create trigger booking_items_guard
before insert or update or delete on public.booking_items
for each row execute function private.guard_snapshot_item();

create trigger notification_consents_append_only
before update or delete on public.notification_consents
for each row execute function private.reject_mutation();

create trigger quote_status_history_append_only
before update or delete on public.quote_status_history
for each row execute function private.reject_mutation();

create trigger booking_events_append_only
before update or delete on public.booking_events
for each row execute function private.reject_mutation();

create trigger dumpster_status_history_append_only
before update or delete on public.dumpster_status_history
for each row execute function private.reject_mutation();

create trigger bookings_production_gate
before insert or update on public.bookings
for each row execute function private.enforce_booking_production_gate();

create trigger quotes_record_status_change
after update of status on public.quotes
for each row execute function private.record_quote_status_change();

create trigger bookings_record_status_change
after update of status on public.bookings
for each row execute function private.record_booking_status_change();

create trigger dumpsters_record_status_change
after update of status on public.dumpsters
for each row execute function private.record_dumpster_status_change();

create trigger files_guard_protected_delete
before delete on public.files
for each row execute function private.guard_protected_file_delete();

alter table private.staff_members enable row level security;

alter table public.services enable row level security;
alter table public.dumpster_sizes enable row level security;
alter table public.service_items enable row level security;
alter table public.service_areas enable row level security;
alter table public.service_zones enable row level security;
alter table public.service_zone_postal_codes enable row level security;
alter table public.pricing_versions enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.pricing_rule_versions enable row level security;
alter table public.pricing_version_terms enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.notification_consents enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_revisions enable row level security;
alter table public.quote_items enable row level security;
alter table public.quote_status_history enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_price_snapshots enable row level security;
alter table public.booking_items enable row level security;
alter table public.booking_events enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blackout_dates enable row level security;
alter table public.dumpsters enable row level security;
alter table public.dumpster_assignments enable row level security;
alter table public.dumpster_status_history enable row level security;
alter table public.files enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant usage on sequence public.quote_number_seq to authenticated;

-- The 2026 Data API defaults do not guarantee automatic service_role grants.
-- The key remains server-only; application code must still use it narrowly.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select on public.services, public.dumpster_sizes, public.service_items,
  public.service_areas, public.service_zones, public.service_zone_postal_codes
to anon, authenticated;

grant select (
  id, code, version_number, status, currency_code,
  effective_from, effective_to, published_at, created_at, updated_at
) on public.pricing_versions to anon, authenticated;

grant select (
  id, code, name, service_id, service_item_id, service_zone_id,
  rule_kind, priority, is_active, created_at, updated_at
) on public.pricing_rules to anon, authenticated;

grant select (
  id, pricing_rule_id, pricing_version_id, value_type, direction,
  amount_cents, percentage_basis_points, range_min_cents, range_max_cents,
  unit, included_quantity, rounding_mode, rounding_increment,
  effective_from, effective_to, eligibility_conditions,
  customer_description, created_at
) on public.pricing_rule_versions to anon, authenticated;

grant select (
  id, pricing_version_id, service_item_id, code, term_text,
  sort_order, created_at
) on public.pricing_version_terms to anon, authenticated;

grant select on public.customers, public.customer_addresses,
  public.notification_consents, public.quotes, public.quote_revisions,
  public.quote_items, public.quote_status_history, public.bookings,
  public.booking_price_snapshots, public.booking_items, public.booking_events,
  public.files
to authenticated;

grant insert (auth_user_id, first_name, last_name, email, phone)
on public.customers to authenticated;
grant update (first_name, last_name, email, phone, updated_at)
on public.customers to authenticated;

grant insert (
  customer_id, label, address_line_1, address_line_2, city, region,
  postal_code, country_code, is_default
) on public.customer_addresses to authenticated;
grant update (
  label, address_line_1, address_line_2, city, region, postal_code,
  country_code, is_default, updated_at
) on public.customer_addresses to authenticated;

grant insert (
  customer_id, channel, consent_type, destination, status,
  language_version, language_shown, source
) on public.notification_consents to authenticated;

grant insert (
  customer_id, service_id, service_item_id, service_address_id, request_details
) on public.quotes to authenticated;

create policy services_public_read on public.services
for select to anon, authenticated
using (status = 'active');

create policy dumpster_sizes_public_read on public.dumpster_sizes
for select to anon, authenticated
using (status = 'active');

create policy service_items_public_read on public.service_items
for select to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1 from public.services
    where services.id = service_items.service_id
      and services.status = 'active'
  )
);

create policy service_areas_public_read on public.service_areas
for select to anon, authenticated
using (status = 'active');

create policy service_zones_public_read on public.service_zones
for select to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1 from public.service_areas
    where service_areas.id = service_zones.service_area_id
      and service_areas.status = 'active'
  )
);

create policy service_zone_postal_codes_public_read on public.service_zone_postal_codes
for select to anon, authenticated
using (
  exists (
    select 1
    from public.service_zones
    join public.service_areas on service_areas.id = service_zones.service_area_id
    where service_zones.id = service_zone_postal_codes.service_zone_id
      and service_zones.status = 'active'
      and service_areas.status = 'active'
  )
);

create policy pricing_versions_public_read on public.pricing_versions
for select to anon, authenticated
using (
  status = 'published'
  and effective_from <= now()
  and (effective_to is null or effective_to > now())
);

create policy pricing_rules_public_read on public.pricing_rules
for select to anon, authenticated
using (
  is_active
  and exists (
    select 1
    from public.pricing_rule_versions
    join public.pricing_versions on pricing_versions.id = pricing_rule_versions.pricing_version_id
    where pricing_rule_versions.pricing_rule_id = pricing_rules.id
      and pricing_versions.status = 'published'
      and pricing_versions.effective_from <= now()
      and (pricing_versions.effective_to is null or pricing_versions.effective_to > now())
  )
);

create policy pricing_rule_versions_public_read on public.pricing_rule_versions
for select to anon, authenticated
using (
  exists (
    select 1
    from public.pricing_versions
    where pricing_versions.id = pricing_rule_versions.pricing_version_id
      and pricing_versions.status = 'published'
      and pricing_versions.effective_from <= now()
      and (pricing_versions.effective_to is null or pricing_versions.effective_to > now())
  )
);

create policy pricing_version_terms_public_read on public.pricing_version_terms
for select to anon, authenticated
using (
  exists (
    select 1
    from public.pricing_versions
    where pricing_versions.id = pricing_version_terms.pricing_version_id
      and pricing_versions.status = 'published'
      and pricing_versions.effective_from <= now()
      and (pricing_versions.effective_to is null or pricing_versions.effective_to > now())
  )
);

create policy customers_own_read on public.customers
for select to authenticated
using ((select auth.uid()) = auth_user_id);
create policy customers_staff_read on public.customers
for select to authenticated
using ((select private.is_staff()));
create policy customers_own_insert on public.customers
for insert to authenticated
with check ((select auth.uid()) = auth_user_id);
create policy customers_own_update on public.customers
for update to authenticated
using ((select auth.uid()) = auth_user_id)
with check ((select auth.uid()) = auth_user_id);

create policy customer_addresses_own_read on public.customer_addresses
for select to authenticated
using (exists (
  select 1 from public.customers
  where customers.id = customer_addresses.customer_id
    and customers.auth_user_id = (select auth.uid())
));
create policy customer_addresses_staff_read on public.customer_addresses
for select to authenticated
using ((select private.is_staff()));
create policy customer_addresses_own_insert on public.customer_addresses
for insert to authenticated
with check (exists (
  select 1 from public.customers
  where customers.id = customer_addresses.customer_id
    and customers.auth_user_id = (select auth.uid())
));
create policy customer_addresses_own_update on public.customer_addresses
for update to authenticated
using (exists (
  select 1 from public.customers
  where customers.id = customer_addresses.customer_id
    and customers.auth_user_id = (select auth.uid())
))
with check (exists (
  select 1 from public.customers
  where customers.id = customer_addresses.customer_id
    and customers.auth_user_id = (select auth.uid())
));

create policy notification_consents_own_read on public.notification_consents
for select to authenticated
using (exists (
  select 1 from public.customers
  where customers.id = notification_consents.customer_id
    and customers.auth_user_id = (select auth.uid())
));
create policy notification_consents_staff_read on public.notification_consents
for select to authenticated
using ((select private.is_staff()));
create policy notification_consents_own_insert on public.notification_consents
for insert to authenticated
with check (exists (
  select 1 from public.customers
  where customers.id = notification_consents.customer_id
    and customers.auth_user_id = (select auth.uid())
));

create policy quotes_own_read on public.quotes
for select to authenticated
using (exists (
  select 1 from public.customers
  where customers.id = quotes.customer_id
    and customers.auth_user_id = (select auth.uid())
));
create policy quotes_staff_read on public.quotes
for select to authenticated
using ((select private.is_staff()));
create policy quotes_own_insert on public.quotes
for insert to authenticated
with check (
  status = 'draft'
  and submitted_at is null
  and expires_at is null
  and exists (
    select 1 from public.customers
    where customers.id = quotes.customer_id
      and customers.auth_user_id = (select auth.uid())
  )
  and exists (
    select 1 from public.customer_addresses
    where customer_addresses.id = quotes.service_address_id
      and customer_addresses.customer_id = quotes.customer_id
  )
);

create policy quote_revisions_own_read on public.quote_revisions
for select to authenticated
using (exists (
  select 1
  from public.quotes
  join public.customers on customers.id = quotes.customer_id
  where quotes.id = quote_revisions.quote_id
    and customers.auth_user_id = (select auth.uid())
));
create policy quote_revisions_staff_read on public.quote_revisions
for select to authenticated
using ((select private.is_staff()));

create policy quote_items_own_read on public.quote_items
for select to authenticated
using (exists (
  select 1
  from public.quote_revisions
  join public.quotes on quotes.id = quote_revisions.quote_id
  join public.customers on customers.id = quotes.customer_id
  where quote_revisions.id = quote_items.quote_revision_id
    and customers.auth_user_id = (select auth.uid())
));
create policy quote_items_staff_read on public.quote_items
for select to authenticated
using ((select private.is_staff()));

create policy quote_status_history_own_read on public.quote_status_history
for select to authenticated
using (exists (
  select 1
  from public.quotes
  join public.customers on customers.id = quotes.customer_id
  where quotes.id = quote_status_history.quote_id
    and customers.auth_user_id = (select auth.uid())
));
create policy quote_status_history_staff_read on public.quote_status_history
for select to authenticated
using ((select private.is_staff()));

create policy bookings_own_read on public.bookings
for select to authenticated
using (exists (
  select 1 from public.customers
  where customers.id = bookings.customer_id
    and customers.auth_user_id = (select auth.uid())
));
create policy bookings_staff_read on public.bookings
for select to authenticated
using ((select private.is_staff()));

create policy booking_price_snapshots_own_read on public.booking_price_snapshots
for select to authenticated
using (exists (
  select 1
  from public.bookings
  join public.customers on customers.id = bookings.customer_id
  where bookings.id = booking_price_snapshots.booking_id
    and customers.auth_user_id = (select auth.uid())
));
create policy booking_price_snapshots_staff_read on public.booking_price_snapshots
for select to authenticated
using ((select private.is_staff()));

create policy booking_items_own_read on public.booking_items
for select to authenticated
using (exists (
  select 1
  from public.booking_price_snapshots
  join public.bookings on bookings.id = booking_price_snapshots.booking_id
  join public.customers on customers.id = bookings.customer_id
  where booking_price_snapshots.id = booking_items.booking_price_snapshot_id
    and customers.auth_user_id = (select auth.uid())
));
create policy booking_items_staff_read on public.booking_items
for select to authenticated
using ((select private.is_staff()));

create policy booking_events_own_read on public.booking_events
for select to authenticated
using (exists (
  select 1
  from public.bookings
  join public.customers on customers.id = bookings.customer_id
  where bookings.id = booking_events.booking_id
    and customers.auth_user_id = (select auth.uid())
));
create policy booking_events_staff_read on public.booking_events
for select to authenticated
using ((select private.is_staff()));

create policy files_own_read on public.files
for select to authenticated
using (
  visibility = 'customer'
  and validation_status = 'validated'
  and exists (
    select 1 from public.customers
    where customers.id = files.customer_id
      and customers.auth_user_id = (select auth.uid())
  )
);
create policy files_staff_read on public.files
for select to authenticated
using ((select private.is_staff()));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values
  (
    'customer-photos',
    'customer-photos',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  ),
  (
    'customer-documents',
    'customer-documents',
    false,
    26214400,
    array['application/pdf', 'image/jpeg', 'image/png']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy storage_customer_validated_read
on storage.objects
for select
to authenticated
using (
  bucket_id in ('customer-photos', 'customer-documents')
  and exists (
    select 1
    from public.files
    join public.customers on customers.id = files.customer_id
    where files.bucket_id = storage.objects.bucket_id
      and files.object_path = storage.objects.name
      and files.visibility = 'customer'
      and files.validation_status = 'validated'
      and customers.auth_user_id = (select auth.uid())
  )
);

create policy storage_staff_read
on storage.objects
for select
to authenticated
using (
  bucket_id in ('customer-photos', 'customer-documents')
  and (select private.is_staff())
);

-- There are deliberately no anon or authenticated INSERT/UPDATE/DELETE
-- policies on storage.objects. Uploads use short-lived signed upload URLs or
-- narrow trusted server operations after server-side validation.
