-- Paid bookings confirm on successful payment.
--
-- Two changes to private.enforce_booking_production_gate:
--
-- 1. The service-area requirement is dropped. Delivery eligibility is now
--    decided by distance from the yard (see lib/booking/service-area.ts), which
--    never populates customer_addresses.service_area_id, so the old join could
--    never be satisfied by a real booking.
--
-- 2. The pricing-snapshot requirement is KEPT. The Stripe webhook now writes a
--    finalized booking_price_snapshots row from the settled Checkout Session
--    before advancing the status, so every confirmed booking still carries an
--    immutable record of what the customer was actually charged.
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
  end if;

  return new;
end;
$$;
