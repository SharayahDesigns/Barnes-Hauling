-- DESTRUCTIVE: manual rollback only. Never add this file to the migrations
-- directory. Use only before any real customer or Storage data exists.

begin;

do $$
begin
  if exists (select 1 from public.customers)
    or exists (select 1 from public.quotes)
    or exists (select 1 from public.bookings)
    or exists (select 1 from public.files)
    or exists (select 1 from public.service_areas)
    or exists (select 1 from public.availability_rules)
    or exists (select 1 from public.blackout_dates)
    or exists (select 1 from public.dumpsters)
    or exists (select 1 from private.staff_members)
    or exists (
      select 1
      from storage.objects
      where bucket_id in ('customer-photos', 'customer-documents')
    )
  then
    raise exception 'destructive Phase 1 rollback refused because customer, file, staff, inventory, service-area, or scheduling data exists; use a corrective forward migration';
  end if;
end;
$$;

drop policy if exists storage_customer_validated_read on storage.objects;
drop policy if exists storage_staff_read on storage.objects;

delete from storage.buckets
where id in ('customer-photos', 'customer-documents');

drop table if exists public.files;
drop table if exists public.dumpster_status_history;
drop table if exists public.dumpster_assignments;
drop table if exists public.dumpsters;
drop table if exists public.blackout_dates;
drop table if exists public.availability_rules;
drop table if exists public.booking_events;
drop table if exists public.booking_items;
drop table if exists public.booking_price_snapshots;
drop table if exists public.bookings;
drop table if exists public.quote_status_history;
drop table if exists public.quote_items;
drop table if exists public.quote_revisions;
drop table if exists public.quotes;
drop table if exists public.notification_consents;
drop table if exists public.customer_addresses;
drop table if exists public.customers;
drop table if exists public.pricing_version_terms;
drop table if exists public.pricing_rule_versions;
drop table if exists public.pricing_rules;
drop table if exists public.pricing_versions;
drop table if exists public.service_zone_postal_codes;
drop table if exists public.service_zones;
drop table if exists public.service_areas;
drop table if exists public.service_items;
drop table if exists public.dumpster_sizes;
drop table if exists public.services;

drop function if exists private.guard_protected_file_delete();
drop function if exists private.record_dumpster_status_change();
drop function if exists private.record_booking_status_change();
drop function if exists private.record_quote_status_change();
drop function if exists private.enforce_booking_production_gate();
drop function if exists private.reject_mutation();
drop function if exists private.guard_snapshot_item();
drop function if exists private.guard_finalized_snapshot();
drop function if exists private.guard_pricing_child();
drop function if exists private.guard_pricing_version();
drop function if exists private.is_staff();
drop table if exists private.staff_members;
drop function if exists private.set_updated_at();
drop schema if exists private;

drop type if exists public.staff_role;
drop type if exists public.consent_status;
drop type if exists public.consent_type;
drop type if exists public.consent_channel;
drop type if exists public.file_visibility;
drop type if exists public.file_validation_status;
drop type if exists public.file_category;
drop type if exists public.dumpster_assignment_status;
drop type if exists public.dumpster_status;
drop type if exists public.address_validation_status;
drop type if exists public.price_snapshot_type;
drop type if exists public.booking_status;
drop type if exists public.quote_status;
drop type if exists public.adjustment_direction;
drop type if exists public.pricing_rule_kind;
drop type if exists public.pricing_rounding_mode;
drop type if exists public.pricing_unit;
drop type if exists public.pricing_value_type;
drop type if exists public.pricing_version_status;
drop type if exists public.catalog_status;
drop type if exists public.service_item_kind;
drop type if exists public.service_type;

commit;
