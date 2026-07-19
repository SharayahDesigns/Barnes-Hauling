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
