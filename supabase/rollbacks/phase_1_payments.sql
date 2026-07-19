-- Rollback for 20260719120000_phase_1_payments.sql

drop trigger if exists payments_set_updated_at on public.payments;
drop trigger if exists payments_guard on public.payments;
drop function if exists private.guard_payment_row();

drop table if exists public.stripe_webhook_events;
drop table if exists public.payments;

drop type if exists public.payment_status;
