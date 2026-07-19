-- Staff admin support: an app-facing staff-role lookup and a safe one-time
-- owner bootstrap. Staff authorization data lives in private.staff_members
-- (not exposed via the API), so the app reads it through these SECURITY DEFINER
-- functions rather than querying the private table directly.

-- Returns the active staff role for the current authenticated user, or null.
-- Only ever exposes the caller's own role.
create or replace function public.current_staff_role()
returns public.staff_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from private.staff_members
  where user_id = (select auth.uid())
    and is_active
  limit 1;
$$;

revoke all on function public.current_staff_role() from public, anon;
grant execute on function public.current_staff_role() to authenticated;

-- One-time bootstrap of the first owner. No-op-safe: it refuses to run once any
-- active staff member exists, so it cannot be used to escalate access later.
-- Intended to be called by the service role during initial setup.
create or replace function public.bootstrap_first_owner(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from private.staff_members where is_active) then
    raise exception 'active staff already exist; bootstrap is disabled';
  end if;

  insert into private.staff_members (user_id, role, is_active, created_by)
  values (target_user_id, 'owner', true, target_user_id)
  on conflict (user_id) do update
    set role = 'owner',
        is_active = true,
        deactivated_at = null;
end;
$$;

revoke all on function public.bootstrap_first_owner(uuid)
  from public, anon, authenticated;
grant execute on function public.bootstrap_first_owner(uuid) to service_role;
