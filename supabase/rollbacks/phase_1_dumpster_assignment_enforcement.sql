-- Rollback for 20260719140000_phase_1_dumpster_assignment_enforcement.sql

drop trigger if exists dumpster_assignments_reserve_dumpster
  on public.dumpster_assignments;
drop trigger if exists dumpsters_guard_availability on public.dumpsters;
drop function if exists private.reserve_dumpster_for_assignment();
drop function if exists private.guard_dumpster_availability();
