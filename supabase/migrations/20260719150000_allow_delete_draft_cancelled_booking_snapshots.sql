-- Allow cleanup of draft/cancelled bookings and their finalized test snapshots.
-- This keeps finalized pricing immutable for committed bookings while allowing
-- admin deletion of non-production booking records.

create or replace function private.guard_finalized_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_booking_status public.booking_status;
begin
  if old.finalized_at is not null then
    if tg_table_name = 'booking_price_snapshots' and tg_op = 'DELETE' then
      select status into parent_booking_status
      from public.bookings
      where id = old.booking_id;

      if parent_booking_status in ('draft', 'cancelled') then
        return old;
      end if;
    end if;

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
  parent_booking_status public.booking_status;
begin
  if tg_table_name = 'quote_items' then
    parent_id := case when tg_op = 'DELETE' then old.quote_revision_id else new.quote_revision_id end;
    select finalized_at into parent_finalized_at from public.quote_revisions where id = parent_id;
  else
    parent_id := case when tg_op = 'DELETE' then old.booking_price_snapshot_id else new.booking_price_snapshot_id end;
    select snapshot.finalized_at, booking.status
      into parent_finalized_at, parent_booking_status
    from public.booking_price_snapshots as snapshot
    join public.bookings as booking on booking.id = snapshot.booking_id
    where snapshot.id = parent_id;
  end if;

  if parent_finalized_at is not null then
    if tg_table_name = 'booking_items'
      and tg_op = 'DELETE'
      and parent_booking_status in ('draft', 'cancelled')
    then
      return old;
    end if;

    raise exception 'items belonging to a finalized price snapshot are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
