-- Phase 1 core schema. Pricing is intentionally seeded as draft in a later
-- migration and cannot be published while publication blockers remain.

create extension if not exists btree_gist with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.service_type as enum ('hauling', 'dumpster_rental');
create type public.service_item_kind as enum ('rental_package', 'specialty_item', 'hauling_item');
create type public.catalog_status as enum ('draft', 'active', 'inactive');
create type public.pricing_version_status as enum ('draft', 'published', 'retired');
create type public.pricing_value_type as enum (
  'fixed_amount',
  'per_unit',
  'percentage',
  'estimated_range',
  'quote_required'
);
create type public.pricing_unit as enum ('each', 'ton', 'day', 'mile', 'rental');
create type public.pricing_rounding_mode as enum (
  'not_applicable',
  'half_up',
  'half_even',
  'ceiling',
  'floor',
  'truncate'
);
create type public.pricing_rule_kind as enum (
  'base_price',
  'surcharge',
  'discount',
  'tax',
  'included_allowance',
  'conditional_fee'
);
create type public.adjustment_direction as enum ('charge', 'credit');
create type public.quote_status as enum (
  'draft',
  'submitted',
  'in_review',
  'sent',
  'awaiting_customer_approval',
  'approved',
  'declined',
  'expired',
  'cancelled',
  'lost',
  'spam'
);
create type public.booking_status as enum (
  'draft',
  'pending_review',
  'pending_payment',
  'confirmed',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);
create type public.price_snapshot_type as enum ('fixed_amount', 'estimated_range', 'quote_required');
create type public.address_validation_status as enum ('pending', 'validated', 'outside_service_area', 'failed');
create type public.dumpster_status as enum (
  'available',
  'reserved',
  'scheduled_for_delivery',
  'in_transit',
  'at_customer',
  'pickup_requested',
  'scheduled_for_pickup',
  'in_transit_to_disposal_site',
  'at_disposal_site',
  'returning',
  'inspection_required',
  'maintenance',
  'unavailable',
  'retired'
);
create type public.dumpster_assignment_status as enum ('reserved', 'assigned', 'released', 'cancelled');
create type public.file_category as enum (
  'quote_photo',
  'before_service_photo',
  'after_service_photo',
  'dumpster_placement_photo',
  'driveway_condition_photo',
  'container_condition_photo',
  'prohibited_material_evidence',
  'damage_evidence',
  'weight_ticket',
  'donation_receipt',
  'recycling_receipt',
  'signed_agreement',
  'commercial_document',
  'tax_exempt_certificate',
  'other'
);
create type public.file_validation_status as enum ('pending', 'validated', 'rejected');
create type public.file_visibility as enum ('customer', 'staff_only');
create type public.consent_channel as enum ('email', 'sms');
create type public.consent_type as enum ('transactional', 'marketing');
create type public.consent_status as enum ('granted', 'denied', 'revoked');
create type public.staff_role as enum (
  'owner',
  'administrator',
  'dispatcher',
  'estimator',
  'crew_lead',
  'crew_member',
  'accounting',
  'customer_support',
  'read_only_analyst'
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create or replace function private.set_snapshot_sha256()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.snapshot_sha256 = case
    when new.snapshot_payload is null then null
    else encode(extensions.digest(new.snapshot_payload::text, 'sha256'), 'hex')
  end;
  return new;
end;
$$;

revoke all on function private.set_snapshot_sha256() from public, anon, authenticated;

create table private.staff_members (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role public.staff_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete restrict,
  deactivated_at timestamptz,
  constraint staff_members_deactivation_check check (
    (is_active and deactivated_at is null)
    or (not is_active and deactivated_at is not null)
  )
);

create trigger staff_members_set_updated_at
before update on private.staff_members
for each row execute function private.set_updated_at();

create table public.services (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  service_type public.service_type not null,
  description text,
  status public.catalog_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_code_format check (code ~ '^[a-z0-9_]+$')
);

create table public.dumpster_sizes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  capacity_cubic_yards numeric(8,2) not null check (capacity_cubic_yards > 0),
  length_feet numeric(8,2) check (length_feet > 0),
  width_feet numeric(8,2) check (width_feet > 0),
  wall_height_feet numeric(8,2) check (wall_height_feet > 0),
  status public.catalog_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dumpster_sizes_code_format check (code ~ '^[a-z0-9_]+$')
);

create table public.service_items (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete restrict,
  dumpster_size_id uuid references public.dumpster_sizes(id) on delete restrict,
  code text not null unique,
  name text not null,
  item_kind public.service_item_kind not null,
  description text,
  default_rental_days integer check (default_rental_days > 0),
  status public.catalog_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_items_code_format check (code ~ '^[a-z0-9_]+$'),
  constraint service_items_dumpster_size_check check (
    (item_kind = 'rental_package' and dumpster_size_id is not null)
    or item_kind <> 'rental_package'
  )
);

create table public.service_areas (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status public.catalog_status not null default 'draft',
  public_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_areas_code_format check (code ~ '^[a-z0-9_]+$')
);

create table public.service_zones (
  id uuid primary key default gen_random_uuid(),
  service_area_id uuid not null references public.service_areas(id) on delete restrict,
  code text not null,
  name text not null,
  status public.catalog_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_zones_code_format check (code ~ '^[a-z0-9_]+$'),
  constraint service_zones_area_code_unique unique (service_area_id, code)
);

create table public.service_zone_postal_codes (
  id uuid primary key default gen_random_uuid(),
  service_zone_id uuid not null references public.service_zones(id) on delete cascade,
  country_code text not null default 'US' check (country_code ~ '^[A-Z]{2}$'),
  postal_code text not null,
  created_at timestamptz not null default now(),
  constraint service_zone_postal_codes_format check (postal_code ~ '^[0-9]{5}(-[0-9]{4})?$'),
  constraint service_zone_postal_codes_unique unique (country_code, postal_code)
);

create table public.pricing_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  version_number integer not null check (version_number > 0),
  status public.pricing_version_status not null default 'draft',
  currency_code text not null default 'USD' check (currency_code ~ '^[A-Z]{3}$'),
  effective_from timestamptz,
  effective_to timestamptz,
  publication_blockers text[] not null default '{}',
  source_document_path text,
  source_document_sha256 text check (source_document_sha256 is null or source_document_sha256 ~ '^[0-9a-f]{64}$'),
  source_document_date date,
  legal_review_required boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_versions_code_format check (code ~ '^[a-z0-9_]+$'),
  constraint pricing_versions_effective_range check (effective_to is null or effective_from is null or effective_to > effective_from),
  constraint pricing_versions_publish_state check (
    (status = 'draft' and published_at is null)
    or (status in ('published', 'retired') and published_at is not null)
  )
);

create table public.pricing_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  service_id uuid not null references public.services(id) on delete restrict,
  service_item_id uuid references public.service_items(id) on delete restrict,
  service_zone_id uuid references public.service_zones(id) on delete restrict,
  rule_kind public.pricing_rule_kind not null,
  priority integer not null default 100,
  is_active boolean not null default true,
  internal_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricing_rules_code_format check (code ~ '^[a-z0-9_]+$')
);

create table public.pricing_rule_versions (
  id uuid primary key default gen_random_uuid(),
  pricing_rule_id uuid not null references public.pricing_rules(id) on delete restrict,
  pricing_version_id uuid not null references public.pricing_versions(id) on delete restrict,
  value_type public.pricing_value_type not null,
  direction public.adjustment_direction not null default 'charge',
  amount_cents bigint,
  percentage_basis_points integer,
  range_min_cents bigint,
  range_max_cents bigint,
  unit public.pricing_unit,
  included_quantity numeric(12,3),
  rounding_mode public.pricing_rounding_mode not null default 'not_applicable',
  rounding_increment numeric(12,3),
  effective_from timestamptz,
  effective_to timestamptz,
  eligibility_conditions jsonb not null default '{}'::jsonb,
  customer_description text not null,
  internal_description text,
  created_at timestamptz not null default now(),
  constraint pricing_rule_versions_unique unique (pricing_rule_id, pricing_version_id),
  constraint pricing_rule_versions_effective_range check (effective_to is null or effective_from is null or effective_to > effective_from),
  constraint pricing_rule_versions_included_quantity check (included_quantity is null or included_quantity >= 0),
  constraint pricing_rule_versions_rounding_increment check (rounding_increment is null or rounding_increment > 0),
  constraint pricing_rule_versions_value_shape check (
    (
      value_type = 'fixed_amount'
      and amount_cents is not null
      and amount_cents > 0
      and percentage_basis_points is null
      and range_min_cents is null
      and range_max_cents is null
    )
    or (
      value_type = 'per_unit'
      and amount_cents is not null
      and amount_cents > 0
      and percentage_basis_points is null
      and range_min_cents is null
      and range_max_cents is null
      and unit is not null
    )
    or (
      value_type = 'percentage'
      and amount_cents is null
      and percentage_basis_points is not null
      and percentage_basis_points > 0
      and range_min_cents is null
      and range_max_cents is null
      and unit is null
      and rounding_mode <> 'not_applicable'
    )
    or (
      value_type = 'estimated_range'
      and amount_cents is null
      and percentage_basis_points is null
      and range_min_cents is not null
      and range_max_cents is not null
      and range_min_cents >= 0
      and range_max_cents > range_min_cents
    )
    or (
      value_type = 'quote_required'
      and amount_cents is null
      and percentage_basis_points is null
      and range_min_cents is null
      and range_max_cents is null
      and unit is null
      and rounding_mode = 'not_applicable'
    )
  )
);

create table public.pricing_version_terms (
  id uuid primary key default gen_random_uuid(),
  pricing_version_id uuid not null references public.pricing_versions(id) on delete restrict,
  service_item_id uuid references public.service_items(id) on delete restrict,
  code text not null,
  term_text text not null,
  sort_order integer not null default 0,
  legal_review_required boolean not null default true,
  created_at timestamptz not null default now(),
  constraint pricing_version_terms_code_format check (code ~ '^[a-z0-9_]+$'),
  constraint pricing_version_terms_unique unique (pricing_version_id, code)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_contact_required check (email is not null or phone is not null)
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  label text,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  region text not null,
  postal_code text not null,
  country_code text not null default 'US' check (country_code ~ '^[A-Z]{2}$'),
  latitude numeric(9,6),
  longitude numeric(9,6),
  validation_status public.address_validation_status not null default 'pending',
  validation_provider text,
  validation_reference text,
  service_area_id uuid references public.service_areas(id) on delete restrict,
  service_zone_id uuid references public.service_zones(id) on delete restrict,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_addresses_latitude check (latitude is null or latitude between -90 and 90),
  constraint customer_addresses_longitude check (longitude is null or longitude between -180 and 180)
);

create table public.notification_consents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  channel public.consent_channel not null,
  consent_type public.consent_type not null,
  destination text not null,
  status public.consent_status not null,
  language_version text not null,
  language_shown text not null,
  source text not null,
  occurred_at timestamptz not null default now(),
  opt_out_at timestamptz,
  ip_address inet,
  created_at timestamptz not null default now(),
  constraint notification_consents_opt_out_check check (
    (status = 'revoked' and opt_out_at is not null)
    or (status <> 'revoked' and opt_out_at is null)
  )
);

create sequence public.quote_number_seq;
create sequence public.booking_number_seq;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number bigint not null default nextval('public.quote_number_seq') unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  service_item_id uuid references public.service_items(id) on delete restrict,
  service_address_id uuid not null references public.customer_addresses(id) on delete restrict,
  status public.quote_status not null default 'draft',
  request_details jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotes_expiration_check check (expires_at is null or expires_at > created_at)
);

create table public.quote_revisions (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  pricing_version_id uuid not null references public.pricing_versions(id) on delete restrict,
  snapshot_type public.price_snapshot_type not null,
  currency_code text not null default 'USD' check (currency_code ~ '^[A-Z]{3}$'),
  subtotal_cents bigint,
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  total_cents bigint,
  range_min_cents bigint,
  range_max_cents bigint,
  calculation_inputs jsonb not null default '{}'::jsonb,
  snapshot_payload jsonb,
  snapshot_sha256 text,
  finalized_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint quote_revisions_unique unique (quote_id, revision_number),
  constraint quote_revisions_snapshot_shape check (
    (
      snapshot_type = 'fixed_amount'
      and total_cents is not null
      and total_cents > 0
      and subtotal_cents is not null
      and subtotal_cents >= 0
      and range_min_cents is null
      and range_max_cents is null
    )
    or (
      snapshot_type = 'estimated_range'
      and total_cents is null
      and range_min_cents is not null
      and range_max_cents is not null
      and range_min_cents >= 0
      and range_max_cents > range_min_cents
    )
    or (
      snapshot_type = 'quote_required'
      and subtotal_cents is null
      and total_cents is null
      and range_min_cents is null
      and range_max_cents is null
    )
  ),
  constraint quote_revisions_finalization check (
    finalized_at is null or snapshot_payload is not null
  )
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_revision_id uuid not null references public.quote_revisions(id) on delete restrict,
  pricing_rule_version_id uuid references public.pricing_rule_versions(id) on delete restrict,
  line_kind public.pricing_rule_kind not null,
  label text not null,
  description text,
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit public.pricing_unit,
  unit_amount_cents bigint,
  percentage_basis_points integer,
  line_total_cents bigint,
  is_quote_required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint quote_items_value_shape check (
    (is_quote_required and unit_amount_cents is null and percentage_basis_points is null and line_total_cents is null)
    or (
      not is_quote_required
      and (
        (unit_amount_cents is not null and unit_amount_cents >= 0 and line_total_cents is not null)
        or percentage_basis_points is not null
      )
    )
  )
);

create table public.quote_status_history (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete restrict,
  previous_status public.quote_status,
  new_status public.quote_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  reason text,
  changed_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number bigint not null default nextval('public.booking_number_seq') unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  source_quote_revision_id uuid references public.quote_revisions(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  service_item_id uuid references public.service_items(id) on delete restrict,
  service_address_id uuid not null references public.customer_addresses(id) on delete restrict,
  status public.booking_status not null default 'draft',
  scheduled_start_at timestamptz,
  scheduled_end_at timestamptz,
  timezone text not null default 'America/Denver',
  customer_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_schedule_range check (
    scheduled_end_at is null or scheduled_start_at is null or scheduled_end_at > scheduled_start_at
  )
);

create table public.booking_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  pricing_version_id uuid not null references public.pricing_versions(id) on delete restrict,
  source_quote_revision_id uuid references public.quote_revisions(id) on delete restrict,
  snapshot_type public.price_snapshot_type not null check (snapshot_type <> 'quote_required'),
  currency_code text not null default 'USD' check (currency_code ~ '^[A-Z]{3}$'),
  subtotal_cents bigint,
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  total_cents bigint,
  range_min_cents bigint,
  range_max_cents bigint,
  snapshot_payload jsonb,
  snapshot_sha256 text,
  finalized_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint booking_price_snapshots_unique unique (booking_id, revision_number),
  constraint booking_price_snapshots_shape check (
    (
      snapshot_type = 'fixed_amount'
      and total_cents is not null
      and total_cents > 0
      and subtotal_cents is not null
      and subtotal_cents >= 0
      and range_min_cents is null
      and range_max_cents is null
    )
    or (
      snapshot_type = 'estimated_range'
      and total_cents is null
      and range_min_cents is not null
      and range_max_cents is not null
      and range_min_cents >= 0
      and range_max_cents > range_min_cents
    )
  ),
  constraint booking_price_snapshots_finalization check (
    finalized_at is null or snapshot_payload is not null
  )
);

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_price_snapshot_id uuid not null references public.booking_price_snapshots(id) on delete restrict,
  pricing_rule_version_id uuid references public.pricing_rule_versions(id) on delete restrict,
  line_kind public.pricing_rule_kind not null,
  label text not null,
  description text,
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit public.pricing_unit,
  unit_amount_cents bigint,
  percentage_basis_points integer,
  line_total_cents bigint not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict,
  event_type text not null,
  previous_status public.booking_status,
  new_status public.booking_status,
  event_at timestamptz not null default now(),
  performed_by uuid references auth.users(id) on delete set null,
  reason text,
  customer_notified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint booking_events_type_format check (event_type ~ '^[a-z0-9_]+$')
);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete restrict,
  service_item_id uuid references public.service_items(id) on delete restrict,
  service_zone_id uuid references public.service_zones(id) on delete restrict,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  local_start_time time not null,
  local_end_time time not null,
  timezone text not null default 'America/Denver',
  capacity integer not null check (capacity > 0),
  booking_cutoff interval,
  effective_from date,
  effective_to date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_rules_time_range check (local_end_time > local_start_time),
  constraint availability_rules_date_range check (effective_to is null or effective_from is null or effective_to >= effective_from)
);

create table public.blackout_dates (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete restrict,
  service_item_id uuid references public.service_items(id) on delete restrict,
  service_area_id uuid references public.service_areas(id) on delete restrict,
  service_zone_id uuid references public.service_zones(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  internal_reason text not null,
  public_message text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blackout_dates_range check (ends_at > starts_at)
);

create table public.dumpsters (
  id uuid primary key default gen_random_uuid(),
  asset_number text not null unique,
  dumpster_size_id uuid not null references public.dumpster_sizes(id) on delete restrict,
  status public.dumpster_status not null default 'unavailable',
  current_location text,
  condition_notes text,
  purchase_date date,
  maintenance_notes text,
  last_inspected_at timestamptz,
  available_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.dumpster_assignments (
  id uuid primary key default gen_random_uuid(),
  dumpster_id uuid not null references public.dumpsters(id) on delete restrict,
  booking_id uuid not null references public.bookings(id) on delete restrict,
  status public.dumpster_assignment_status not null default 'reserved',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  assignment_window tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dumpster_assignments_range check (ends_at > starts_at),
  constraint dumpster_assignments_no_overlap exclude using gist (
    dumpster_id with =,
    assignment_window with &&
  ) where (status in ('reserved', 'assigned'))
);

create table public.dumpster_status_history (
  id uuid primary key default gen_random_uuid(),
  dumpster_id uuid not null references public.dumpsters(id) on delete restrict,
  previous_status public.dumpster_status,
  new_status public.dumpster_status not null,
  booking_id uuid references public.bookings(id) on delete restrict,
  changed_by uuid references auth.users(id) on delete set null,
  location text,
  notes text,
  changed_at timestamptz not null default now()
);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  quote_id uuid references public.quotes(id) on delete restrict,
  booking_id uuid references public.bookings(id) on delete restrict,
  bucket_id text not null check (bucket_id in ('customer-photos', 'customer-documents')),
  object_path text not null,
  original_filename text not null,
  extension text not null,
  declared_mime_type text not null,
  detected_mime_type text,
  size_bytes bigint not null check (size_bytes > 0),
  category public.file_category not null,
  visibility public.file_visibility not null default 'customer',
  validation_status public.file_validation_status not null default 'pending',
  signature_verified_at timestamptz,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  description text,
  retention_date date,
  legal_hold boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint files_business_context check (quote_id is not null or booking_id is not null),
  constraint files_object_path_unique unique (bucket_id, object_path),
  constraint files_validation_check check (
    (validation_status = 'validated' and detected_mime_type is not null and signature_verified_at is not null)
    or validation_status <> 'validated'
  )
);

create index service_items_service_id_idx on public.service_items(service_id);
create index service_items_dumpster_size_id_idx on public.service_items(dumpster_size_id) where dumpster_size_id is not null;
create index service_zones_service_area_id_idx on public.service_zones(service_area_id);
create index service_zone_postal_codes_zone_id_idx on public.service_zone_postal_codes(service_zone_id);
create index pricing_rules_service_item_zone_idx on public.pricing_rules(service_id, service_item_id, service_zone_id) where is_active;
create index pricing_rule_versions_rule_id_idx on public.pricing_rule_versions(pricing_rule_id);
create index pricing_rule_versions_version_id_idx on public.pricing_rule_versions(pricing_version_id);
create index pricing_rule_versions_effective_idx on public.pricing_rule_versions(effective_from, effective_to);
create index pricing_version_terms_version_id_idx on public.pricing_version_terms(pricing_version_id);
create index pricing_version_terms_service_item_id_idx on public.pricing_version_terms(service_item_id) where service_item_id is not null;
create index customers_auth_user_id_idx on public.customers(auth_user_id) where auth_user_id is not null;
create index customer_addresses_customer_id_idx on public.customer_addresses(customer_id);
create index customer_addresses_zone_id_idx on public.customer_addresses(service_zone_id) where service_zone_id is not null;
create unique index customer_addresses_one_default_idx on public.customer_addresses(customer_id) where is_default;
create index notification_consents_customer_occurred_idx on public.notification_consents(customer_id, occurred_at desc);
create index quotes_customer_status_created_idx on public.quotes(customer_id, status, created_at desc);
create index quotes_service_address_id_idx on public.quotes(service_address_id);
create index quote_revisions_quote_revision_idx on public.quote_revisions(quote_id, revision_number desc);
create index quote_revisions_pricing_version_id_idx on public.quote_revisions(pricing_version_id);
create index quote_items_revision_id_idx on public.quote_items(quote_revision_id);
create index quote_items_rule_version_id_idx on public.quote_items(pricing_rule_version_id) where pricing_rule_version_id is not null;
create index quote_status_history_quote_changed_idx on public.quote_status_history(quote_id, changed_at desc);
create index bookings_customer_status_created_idx on public.bookings(customer_id, status, created_at desc);
create index bookings_schedule_idx on public.bookings(status, scheduled_start_at) where scheduled_start_at is not null;
create index bookings_source_quote_revision_id_idx on public.bookings(source_quote_revision_id) where source_quote_revision_id is not null;
create index booking_snapshots_booking_revision_idx on public.booking_price_snapshots(booking_id, revision_number desc);
create index booking_snapshots_pricing_version_id_idx on public.booking_price_snapshots(pricing_version_id);
create index booking_items_snapshot_id_idx on public.booking_items(booking_price_snapshot_id);
create index booking_items_rule_version_id_idx on public.booking_items(pricing_rule_version_id) where pricing_rule_version_id is not null;
create index booking_events_booking_event_idx on public.booking_events(booking_id, event_at desc);
create index availability_rules_lookup_idx on public.availability_rules(service_id, service_item_id, service_zone_id, day_of_week) where is_active;
create index blackout_dates_lookup_idx on public.blackout_dates(starts_at, ends_at) where is_active;
create index blackout_dates_service_id_idx on public.blackout_dates(service_id) where service_id is not null;
create index blackout_dates_service_item_id_idx on public.blackout_dates(service_item_id) where service_item_id is not null;
create index blackout_dates_service_area_id_idx on public.blackout_dates(service_area_id) where service_area_id is not null;
create index blackout_dates_service_zone_id_idx on public.blackout_dates(service_zone_id) where service_zone_id is not null;
create index dumpsters_size_status_idx on public.dumpsters(dumpster_size_id, status);
create index dumpster_assignments_booking_id_idx on public.dumpster_assignments(booking_id);
create index dumpster_status_history_dumpster_changed_idx on public.dumpster_status_history(dumpster_id, changed_at desc);
create index dumpster_status_history_booking_id_idx on public.dumpster_status_history(booking_id) where booking_id is not null;
create index files_customer_created_idx on public.files(customer_id, created_at desc);
create index files_quote_id_idx on public.files(quote_id) where quote_id is not null;
create index files_booking_id_idx on public.files(booking_id) where booking_id is not null;

create trigger services_set_updated_at before update on public.services for each row execute function private.set_updated_at();
create trigger dumpster_sizes_set_updated_at before update on public.dumpster_sizes for each row execute function private.set_updated_at();
create trigger service_items_set_updated_at before update on public.service_items for each row execute function private.set_updated_at();
create trigger service_areas_set_updated_at before update on public.service_areas for each row execute function private.set_updated_at();
create trigger service_zones_set_updated_at before update on public.service_zones for each row execute function private.set_updated_at();
create trigger pricing_versions_set_updated_at before update on public.pricing_versions for each row execute function private.set_updated_at();
create trigger pricing_rules_set_updated_at before update on public.pricing_rules for each row execute function private.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute function private.set_updated_at();
create trigger customer_addresses_set_updated_at before update on public.customer_addresses for each row execute function private.set_updated_at();
create trigger quotes_set_updated_at before update on public.quotes for each row execute function private.set_updated_at();
create trigger quote_revisions_set_snapshot_sha256 before insert or update of snapshot_payload on public.quote_revisions for each row execute function private.set_snapshot_sha256();
create trigger bookings_set_updated_at before update on public.bookings for each row execute function private.set_updated_at();
create trigger booking_price_snapshots_set_snapshot_sha256 before insert or update of snapshot_payload on public.booking_price_snapshots for each row execute function private.set_snapshot_sha256();
create trigger availability_rules_set_updated_at before update on public.availability_rules for each row execute function private.set_updated_at();
create trigger blackout_dates_set_updated_at before update on public.blackout_dates for each row execute function private.set_updated_at();
create trigger dumpsters_set_updated_at before update on public.dumpsters for each row execute function private.set_updated_at();
create trigger dumpster_assignments_set_updated_at before update on public.dumpster_assignments for each row execute function private.set_updated_at();
create trigger files_set_updated_at before update on public.files for each row execute function private.set_updated_at();

alter sequence public.quote_number_seq owned by public.quotes.quote_number;
alter sequence public.booking_number_seq owned by public.bookings.booking_number;
