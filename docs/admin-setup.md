# Admin (staff) setup

The `/admin` area is a staff-only operations dashboard. Access is gated by
`requireStaff()`, which checks the signed-in user against
`private.staff_members` via the `public.current_staff_role()` function. Admin
data access runs through the service-role client **after** that check; RLS stays
fully enforced for the public/customer surface.

## 1. Apply the migrations

No Supabase CLI is linked locally, so apply these in the Supabase dashboard
(**SQL editor** → paste → run), in order, if not already applied:

1. `supabase/migrations/20260719120000_phase_1_payments.sql` (payments — only
   needed for the Stripe flow)
2. `supabase/migrations/20260719130000_phase_1_staff_admin.sql` (**required for
   admin login**: adds `current_staff_role()` and `bootstrap_first_owner()`)

After applying, regenerate and commit `src/types/database.ts`, and review the
Supabase security/performance advisors.

## 2. Create the first owner account

1. Supabase dashboard → **Authentication → Users → Add user**. Enter the
   owner's email and a password, and mark the email confirmed.
2. Copy the new user's **UUID**.
3. Supabase **SQL editor**, run (replace the UUID):

   ```sql
   select public.bootstrap_first_owner('00000000-0000-0000-0000-000000000000');
   ```

   This inserts the owner into `private.staff_members`. It refuses to run once
   any active staff exist, so it is a safe one-time bootstrap. Add more staff
   later by inserting into `private.staff_members` (see roles in the
   `public.staff_role` enum).

## 3. Sign in

Go to `/admin/login`, sign in with the owner credentials, and you'll land on the
operations dashboard. Non-staff accounts are rejected and signed out.

## Notes

- Staff login uses email + password (Supabase Auth). Magic-link can be added
  later once email sending is confirmed.
- Admin writes currently use the service-role client behind `requireStaff()`.
  Migrating these to dedicated staff RLS write policies is a hardening
  follow-up before production.
