-- Rollback for 20260719130000_phase_1_staff_admin.sql

drop function if exists public.bootstrap_first_owner(uuid);
drop function if exists public.current_staff_role();
