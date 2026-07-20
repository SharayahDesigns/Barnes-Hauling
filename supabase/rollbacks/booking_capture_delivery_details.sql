alter table public.bookings
  drop constraint if exists bookings_agreement_capture_check,
  drop column if exists agreement_accepted_at,
  drop column if exists agreement_version;
