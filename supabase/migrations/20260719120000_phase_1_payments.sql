-- Phase 1 payments: Stripe-backed rental payments and webhook idempotency.
--
-- Payment state is authoritative only from verified Stripe webhooks. Rows are
-- written exclusively by the service-role server (checkout action + webhook);
-- customers may read their own payment via booking ownership. Financial facts
-- are immutable once a payment settles.

create type public.payment_status as enum (
  'requires_payment',
  'processing',
  'requires_action',
  'succeeded',
  'canceled',
  'failed',
  'refunded',
  'partially_refunded'
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  provider text not null default 'stripe' check (provider = 'stripe'),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_payment_method_id text,
  amount_cents bigint not null check (amount_cents >= 0),
  currency_code text not null default 'USD' check (currency_code ~ '^[A-Z]{3}$'),
  status public.payment_status not null default 'requires_payment',
  card_on_file boolean not null default false,
  overage_authorized boolean not null default false,
  is_test_mode boolean not null default true,
  succeeded_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_booking_id_idx on public.payments (booking_id);
create index payments_customer_id_idx on public.payments (customer_id);

-- Webhook idempotency ledger keyed by Stripe event id.
create table public.stripe_webhook_events (
  id text primary key,
  type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

-- Immutability: payments are never deleted, and settled financial facts are
-- frozen. Status may still progress (e.g. succeeded -> refunded) via allowed
-- fields.
create or replace function private.guard_payment_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'payments are not deletable';
  end if;

  if old.succeeded_at is not null then
    if new.amount_cents <> old.amount_cents
      or new.currency_code <> old.currency_code
      or new.succeeded_at is distinct from old.succeeded_at
      or new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id
    then
      raise exception 'settled payment financial fields are immutable';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_payment_row() from public, anon, authenticated;

create trigger payments_guard
before update or delete on public.payments
for each row execute function private.guard_payment_row();

create trigger payments_set_updated_at
before update on public.payments
for each row execute function private.set_updated_at();

-- RLS
alter table public.payments enable row level security;
alter table public.stripe_webhook_events enable row level security;

revoke all on public.payments from anon, authenticated;
revoke all on public.stripe_webhook_events from anon, authenticated;

-- New tables need explicit service_role grants (blanket grants from earlier
-- migrations only covered tables that existed then).
grant all on public.payments to service_role;
grant all on public.stripe_webhook_events to service_role;

grant select on public.payments to authenticated;

create policy payments_own_read on public.payments
for select to authenticated
using (
  exists (
    select 1 from public.customers
    where customers.id = payments.customer_id
      and customers.auth_user_id = (select auth.uid())
  )
);

create policy payments_staff_read on public.payments
for select to authenticated
using ((select private.is_staff()));

-- stripe_webhook_events has no anon/authenticated policies: RLS denies all
-- non-service-role access, and the service role bypasses RLS.
