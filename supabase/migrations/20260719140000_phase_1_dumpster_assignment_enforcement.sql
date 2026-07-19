-- Assignment-driven availability enforcement.
--
-- Double-booking is already blocked by the dumpster_assignments_no_overlap
-- exclusion constraint. This migration makes active assignments the source of
-- truth for the dumpsters.status = 'available' state, so staff can no longer
-- manually mark a container available while it is still reserved or assigned.
--
-- Active assignment statuses: 'reserved', 'assigned'.

-- Guard: a dumpster may not be 'available' while it has an active assignment.
create or replace function private.guard_dumpster_availability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'available'
    and exists (
      select 1
      from public.dumpster_assignments da
      where da.dumpster_id = new.id
        and da.status in ('reserved', 'assigned')
    )
  then
    raise exception
      'Dumpster % has an active assignment and cannot be marked available.',
      new.asset_number
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_dumpster_availability()
  from public, anon, authenticated;

create trigger dumpsters_guard_availability
before insert or update of status on public.dumpsters
for each row execute function private.guard_dumpster_availability();

-- Source of truth: activating an assignment reserves an available dumpster.
-- SECURITY DEFINER so an assignment write always keeps the container in sync,
-- even when the caller cannot directly update dumpsters. Releasing or
-- cancelling an assignment does NOT auto-free the container: the delivery
-- lifecycle status (in_transit, at_customer, maintenance, ...) is preserved,
-- and staff set it back to available once the assignment is closed (the guard
-- above allows that only after no active assignment remains).
create or replace function private.reserve_dumpster_for_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('reserved', 'assigned') then
    update public.dumpsters
    set status = 'reserved'
    where id = new.dumpster_id
      and status = 'available';
  end if;

  return new;
end;
$$;

revoke all on function private.reserve_dumpster_for_assignment()
  from public, anon, authenticated;

create trigger dumpster_assignments_reserve_dumpster
after insert or update of status on public.dumpster_assignments
for each row execute function private.reserve_dumpster_for_assignment();
