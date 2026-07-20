alter table public.bookings
  add column agreement_version text,
  add column agreement_accepted_at timestamptz;

alter table public.bookings
  add constraint bookings_agreement_capture_check
    check (
      (agreement_version is null and agreement_accepted_at is null)
      or (agreement_version is not null and agreement_accepted_at is not null)
    );
