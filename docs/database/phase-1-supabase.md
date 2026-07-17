# Phase 1 Supabase Schema

## Production gates

The seeded dumpster pricing version is intentionally `draft`. It has no
effective date and contains explicit publication blockers for service areas,
taxes, delivery-zone fees, extra-day rates, unknown conditional fees, and the
effective date. The database rejects publication while any blocker remains,
legal review is still required, or no active service area exists.

Do not enable production booking until all of the following are confirmed and
tested:

- Service areas and zones
- Applicable taxes and rounding behavior
- Delivery, extra-day, prohibited-material, overloaded-container, and other
  missing conditional fees
- Pricing effective date
- Availability rules, blackout dates, capacity, and booking cutoffs
- Legal review of rental, cancellation, damage, payment, and overage language
- Mobile booking and booking-conflict behavior

`availability_rules` and `blackout_dates` are included in Phase 1 but are empty
and inactive. The scheduling milestone must configure and test them before a
booking can be represented as production-ready.

## Intentional deny-by-default tables

The following RLS-enabled tables deliberately have no direct policies in Phase
1. Supabase's `rls_enabled_no_policy` advisor therefore reports them as
informational findings. This is an explicit security boundary, not deferred RLS:

- `private.staff_members` is reachable only through trusted bootstrap/admin SQL
  and the tightly scoped `private.is_staff()` boolean helper.
- `availability_rules` and `blackout_dates` remain inaccessible until the
  scheduling administration migration adds narrowly scoped staff operations.
- `dumpsters`, `dumpster_assignments`, and `dumpster_status_history` are internal
  inventory and operational records accessed only through trusted server-side
  staff workflows.

Do not silence these findings with broad authenticated policies. Add a policy
only when a reviewed application workflow requires the corresponding operation.

## New-schema index review

Supabase's unused-index advisor is expected to report indexes immediately after
a clean reset because no production workload has exercised them. The Phase 1
indexes were checked for identical definitions; none are duplicates. They are
retained because they cover foreign keys, RLS ownership joins, catalog and
pricing lookups, booking schedules, immutable snapshot traversal, operational
history, and private-file relationships.

Reassess unused indexes only after representative staging or production query
statistics have accumulated. Do not remove a foreign-key or RLS-supporting index
solely because a newly created local database reports zero scans.

## Supabase client boundaries

Use `src/lib/supabase/client.ts` in Client Components and
`src/lib/supabase/server.ts` in Server Components, Server Actions, and Route
Handlers for authenticated customers. These clients carry the customer's
Supabase session so RLS remains the authorization boundary.

`src/lib/supabase/admin.ts` is the only module allowed to construct a privileged
client. It imports `server-only`, reads `SUPABASE_SECRET_KEY`, and disables
session persistence. Use it only for narrowly scoped operations such as:

- Validated guest quote creation before authentication
- Creating short-lived signed upload URLs after rate limiting and validation
- Administrative operations that have separately verified staff authorization
- Webhook processing after signature verification

Never import the admin module into a Client Component, return its client from a
Server Function, or use its secret as a `NEXT_PUBLIC_` variable. Do not use it
for ordinary authenticated customer reads or writes.

## File validation and retention

Both Storage buckets are private. New uploads should begin with a `pending`
`files` record and a server-generated random object path. Before a file becomes
customer-readable, trusted server code must validate:

1. Bucket-specific byte limit.
2. Declared MIME type.
3. Normalized extension.
4. File signature/magic bytes where practical.
5. That detected MIME type and extension agree.
6. SHA-256 when evidence integrity is required.
7. Malware scanning when that service is introduced.

Only then set `validation_status = 'validated'`, `detected_mime_type`, and
`signature_verified_at`. Rejected objects should be removed through the Storage
API, never by directly deleting `storage.objects` rows.

`retention_date` is nullable. There is no automated deletion job. Signed
agreements, financial records, weight tickets, and operational evidence must
not be automatically deleted. `legal_hold = true` blocks database metadata
deletion and must be respected by every Storage deletion workflow.

## Secure first-staff bootstrap

No staff UUID is seeded. Bootstrap the first owner only after the migrations
have received final approval and been applied:

1. In Supabase Authentication, create or invite the intended owner using their
   verified Barnes-controlled email address. Require the person to complete
   email verification and sign in once.
2. In Authentication > Users, copy the exact Auth user UUID and verify the
   displayed email.
3. In the SQL Editor, replace both placeholders below. The block verifies that
   the UUID and normalized email refer to the same Auth user before granting
   access:

```sql
do $$
declare
  target_user_id uuid := 'REPLACE_WITH_VERIFIED_AUTH_USER_UUID';
  expected_email text := 'REPLACE_WITH_VERIFIED_BARNES_EMAIL';
  actual_email text;
begin
  select lower(email)
  into actual_email
  from auth.users
  where id = target_user_id;

  if actual_email is null or actual_email <> lower(expected_email) then
    raise exception 'Auth user UUID and expected email do not match';
  end if;

  insert into private.staff_members (
    user_id,
    role,
    is_active,
    created_by
  ) values (
    target_user_id,
    'owner',
    true,
    target_user_id
  );
end;
$$;
```

4. Verify the new row by UUID in `private.staff_members` from the SQL Editor.
5. Sign in as that user and verify staff-only application access. Sign in with
   a separate non-staff test user and verify denial.
6. Record who performed the bootstrap and when in the deployment record. Do not
   reuse this procedure to grant routine access without an approval workflow.

## Rollback policy

`supabase/rollbacks/phase_1_schema.sql` is destructive and is not part of the
automatic migration chain. It refuses to run if customer, quote, booking, file,
staff, inventory, service-area, scheduling, or customer-bucket object data
exists.

It may only be used before real customer or file data exists. After any real
data exists, preserve immutable history and use a corrective forward migration.
Use an approved backup or point-in-time recovery procedure for a failed
deployment that cannot safely be corrected forward.

Storage objects must always be deleted through the Storage API before removing
a bucket. Deleting Storage metadata directly does not remove the underlying
object.

## Local verification commands

```bash
npx supabase db reset
npx supabase test db supabase/tests/database/phase_1_schema.test.sql
npm run lint
npm run typecheck
npm run build
```

Remote application, type generation, advisors, committing, and pushing remain
behind the final approval gate.
