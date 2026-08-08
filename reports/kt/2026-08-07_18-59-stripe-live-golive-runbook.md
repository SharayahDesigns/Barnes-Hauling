# KT — Going live on Stripe: owner account setup + repo cutover runbook

**Generated:** 2026-08-07T18:59 (UTC 2026-08-08T00:59Z)
**Repo:** Barnes-Hauling
**Scope:** forward-looking runbook (not a retrospective)
**Covers up to:** session-2026-08-08T00:59Z
**Depth:** detailed
**Companion doc:** [`2026-08-07_18-54-stripe-payments-refunds-admin.md`](./2026-08-07_18-54-stripe-payments-refunds-admin.md)

> What must happen — on the **owner's side in Stripe** and on **our side in this repo** — before Barnes Hauling can accept real card payments.

---

## TL;DR

The payment code is done and working in sandbox; going live is mostly **configuration, legal review, and account verification**, not development. Three things block real payments regardless of code: the owner's Stripe account must be activated with a real bank account, the rental agreement and pricing must clear legal review (both are literally marked "draft" in the codebase today), and spam protection must be turned on (it currently fails open). Budget the owner's Stripe activation at 1–3 business days for verification, and treat the legal review as the long pole.

---

## Critical blockers found while writing this

These are live-blocking and easy to miss. Details in the sections below.

| # | Blocker | Where | Severity |
|---|---|---|---|
| 1 | Agreement version string literally ends in `-draft` and is stamped on every booking | `src/lib/booking/options.ts:64` | 🔴 Legal |
| 2 | Spam protection **fails open** — no Turnstile secret means every submission passes | `src/lib/booking/records.ts:169` | 🔴 Abuse/cost |
| 3 | Only published pricing version is a **test seed**; the real rate sheet is `draft` with 7 blockers | `pricing_versions` table | 🔴 Legal |
| 4 | Yard coordinates confirmed correct, but still undocumented and only a code default | `src/lib/booking/delivery-zone.ts:13-14` | 🟡 Pricing |
| 5 | Tax computes **$0.00** on every booking — no Stripe tax registration exists | Stripe Tax settings | 🟠 Tax/legal |
| 6 | Three env vars used in code are **absent from `.env.example`** | see Appendix A | 🟡 Deploy |
| 7 | Migration drift — `supabase/migrations/` does not describe the live schema | Supabase | 🟠 Data |

---

# PART A — What the owner does in Stripe

## A1. Create the account (owner, not developer)

**The account must be created and owned by Barnes Hauling's owner**, using the business's own email, legal entity, and bank account. Do not create it under a developer or agency login and hand it over later — moving ownership of an activated account with transaction history is painful, and the account holder is the party legally on the hook for chargebacks and payouts.

The developer should be added afterward as a **team member with limited role**, not as the account owner.

What the owner needs on hand:

- **Legal business name and structure** (sole proprietor / LLC / corp) exactly as registered
- **EIN**, or SSN if operating as a sole proprietor
- **Business address** and phone
- **Bank account and routing number** for payouts (must be a business account matching the entity name where possible)
- **Government-issued ID** for identity verification
- **Website URL** — Stripe reviews the live site during activation
- Rough expectations for **average transaction size and monthly volume** (a $350 average with roll-off rentals is unremarkable and shouldn't trigger extra review)

## A2. Complete activation

Stripe reviews the business before releasing live payments and payouts. Typically same-day to ~3 business days; can be longer if documents need manual review.

Stripe checks that the public website presents a legitimate business. **Have these live and reachable before submitting**, because a thin site is the most common activation delay:

- Clear description of services offered
- **Pricing** visible to customers
- **Terms of service** — already at `/terms`
- **Privacy policy** — already at `/privacy`
- **Cancellation and refund policy** — currently only FAQ prose in `src/config/public-content.ts`; see D2
- **Contact information** — business phone, email, and service area

## A3. Configure the account

Exact dashboard navigation shifts over time; these are the settings that matter.

**Business / public details**
- Public business name, support email, support phone, support address — these appear on Stripe receipts and card statements
- Upload logo and set brand colors so Stripe Checkout matches the site
- **Statement descriptor** — what customers see on their card statement. Make it recognizable: something like `BARNES HAULING`. An unrecognizable descriptor is a leading cause of chargebacks.

**Payments**
- Confirm which payment methods are enabled. Cards are on by default. Decide whether to keep **Link** enabled (it was used in sandbox testing).
- Review the payout schedule (daily/weekly). Default rolling payouts are fine.

**Tax** — see D3 before enabling anything
- Set the **head office address** to the real Barnes business address. *(In sandbox this was set to a Stripe placeholder in San Francisco — do not repeat that in live.)*
- Add a **tax registration** only after the sales-tax question is settled with an accountant.
- Without a registration, `automatic_tax` still runs but calculates **$0.00**.

**Customer emails**
- Decide whether Stripe sends its own payment receipts. The app already sends a branded receipt via Resend, so enabling Stripe's too means **customers get two emails per payment**. Recommend leaving Stripe's off and relying on ours.

**Fraud (Radar)**
- Review default rules. For a local hauling business, consider blocking payments where CVC or postal code checks fail.
- Confirm who monitors disputes — Stripe emails the account owner, and disputes have hard response deadlines.

## A4. Hand over credentials securely

The owner will need to give the developer:

| Credential | Where it comes from | Notes |
|---|---|---|
| **Live secret key** (`sk_live_…`) | Developers → API keys | Shown once. Treat as a password. |
| **Live webhook signing secret** (`whsec_…`) | Created in B3 below | **Different** from the test-mode and CLI secrets |

**Send these through a password manager or secure share — never email, SMS, or Slack.** If a live key is ever pasted into a chat, ticket, or commit, roll it immediately in the dashboard.

The publishable key is **not needed** — this integration uses Stripe-hosted Checkout, so the browser never talks to Stripe directly.

---

# PART B — What we do in this repo

## B1. Environment variables

**Nothing in application code needs to change to switch modes.** `isStripeTestMode()` (`src/lib/stripe/client.ts:28`) keys off the `sk_test_` prefix, so swapping in a live key automatically:

- flags new `payments` rows as `is_test_mode: false`
- removes the "(Stripe sandbox)" label in the admin booking detail page
- removes the "test payment" notice on `/book/confirmed` and in receipt emails

That's the whole mode switch. It is entirely credential-driven — a deliberate design worth preserving.

Set in **Vercel → Project → Settings → Environment Variables**, scoped to **Production**:

```
STRIPE_SECRET_KEY=sk_live_…            # from A4
STRIPE_WEBHOOK_SECRET=whsec_…          # from B3, NOT the CLI or test secret
NEXT_PUBLIC_SITE_URL=https://<production-domain>
```

⚠️ **`NEXT_PUBLIC_SITE_URL` is currently pointed at `http://localhost:3000` in local `.env.local`** for sandbox testing (production value preserved as a comment above it). That's local-only and never deploys, but confirm Vercel has the real domain — it drives Stripe's `success_url` and `cancel_url`.

Keep test keys in Vercel's **Preview/Development** scopes so preview deploys never touch live money.

## B2. Environment variables that are NOT Stripe but block go-live

```
RESEND_FROM_EMAIL=Barnes Hauling and Disposal <updates@mail.<domain>>
```
Currently **empty**. `hasResendConfig()` requires it, so `sendPaymentReceiptEmails` silently returns and **no receipt is sent**. Requires DNS records for the sending domain to be verified in Resend first.

```
TURNSTILE_SECRET_KEY=…
```
See D4 — this is a live blocker, not optional.

```
DUMPSTER_YARD_LAT=…
DUMPSTER_YARD_LNG=…
```
See D5 — these drive delivery surcharges and currently fall back to hardcoded defaults.

## B3. Register the live webhook endpoint

`stripe listen` only runs on a developer laptop. Once deployed, **nothing delivers events unless an endpoint is registered**, and without webhooks a customer can pay and the booking never confirms.

In the Stripe dashboard, **in live mode**: Developers → Webhooks → Add destination

- **URL:** `https://<production-domain>/api/webhooks/stripe`
- **Events** — select exactly these five; the handler ignores everything else:
  ```
  checkout.session.completed
  checkout.session.expired
  checkout.session.async_payment_failed
  charge.refunded
  charge.dispute.created
  ```
- Copy the signing secret it generates into `STRIPE_WEBHOOK_SECRET`

**The most common failure here:** reusing the test-mode or `stripe listen` signing secret in production. Signature verification fails on every event, the endpoint returns 400 to everything, and payments silently never confirm. Test and live are separate endpoints with separate secrets.

## B4. Migrations that must be applied

`supabase/migrations/` is **not currently a reliable description of the live schema** — migrations have been applied selectively. Reconcile before launch.

| Migration | Status | Live-blocking? |
|---|---|---|
| `20260719120000_phase_1_payments.sql` | ✅ applied | — |
| `20260807150000_confirm_on_payment.sql` | ✅ applied | — |
| `20260808120000_allow_delete_quote_status_history.sql` | ⚠️ unverified | No |
| `20260723120000_pricing_model_v1_3.sql` | ❌ not applied | See D1 |

Also: regenerate and commit `src/types/database.ts`. The stale generated types caused a production-severity availability bug this session (a to-one embed typed as an array), and other embeds are likely mistyped the same way.

## B5. Verify Supabase security posture

Per AGENTS.md, before production:
- Confirm RLS is enabled on every exposed table and policies are ownership-based
- Confirm `customer-photos` / `customer-documents` buckets are private with signed-URL access only
- Run Supabase security and performance advisors and address findings
- Confirm the service-role key exists **only** in server-side env, never in a `NEXT_PUBLIC_` variable

---

# PART C — Legal, pricing, and business gates

AGENTS.md defines the release gate: *"Do not represent the platform as production-ready until payment webhooks, RLS, private storage, booking-conflict prevention, legal review, cancellation and overage policies, communication opt-outs, and mobile booking have all been verified."* The items below are the open ones.

## D1. Publish a legally reviewed pricing version 🔴

Today the only **published** pricing version is `test_seed_confirmed_2026_07_19` — a test seed. Every confirmed booking snapshots against it.

The real rate sheet `dumpster_rate_sheet_2026_07_16` is `status: 'draft'` with `legal_review_required: true` and seven publication blockers:

```
service_areas_unconfirmed          taxes_unconfirmed
delivery_zone_fees_unconfirmed     extra_day_rate_unconfirmed
prohibited_material_fee_unconfirmed
overloaded_container_fee_unconfirmed
effective_date_unconfirmed
```

**Required:** resolve each blocker, have the owner and legal confirm the numbers, then publish with a real `effective_from`.

Good news: the webhook resolves *whatever pricing version is currently published* at payment time, so publishing the real one requires **no code change** — new bookings snapshot against it automatically.

⚠️ Do **not** delete or unpublish the test seed until no active bookings reference it; snapshots hold a foreign key to it.

## D2. Finalize the rental agreement 🔴

`src/lib/booking/options.ts:64`:

```ts
export const PREPAYMENT_AGREEMENT_VERSION = "load-and-weight-terms-2026-07-draft";
```

That string is stamped onto **every booking** as the legal record of what the customer accepted. Shipping it means every live customer accepted a document labeled "draft."

Required before live:
1. Legal review of the load-and-weight terms, the **payment authorization** language (the customer is authorizing a saved card for later overage charges), and the **cancellation/refund policy**
2. Bump the version string to a final identifier (e.g. `load-and-weight-terms-2026-09-v1`)
3. Confirm the emailed agreement copy matches the accepted version exactly

Also required by the gate: an explicit, reviewed **cancellation and refund policy** page. Today it exists only as FAQ prose in `src/config/public-content.ts` — Stripe's activation review also looks for this.

## D3. Settle the sales tax question 🟠

Every booking currently computes **$0.00 tax**. Utah generally taxes rentals of tangible personal property, so this likely applies. Utah administers local sales tax centrally through the State Tax Commission — one registration and one filing, not a per-city patchwork.

Required: the owner confirms with an accountant whether Barnes must collect sales tax, holds a Utah sales tax license, then adds the matching **Stripe tax registration**. Adding a registration makes Stripe start charging customers tax immediately — it should follow the license, not precede it.

**Do not guess this.** Under-collecting creates a liability the business owes regardless of what it charged.

## D4. Turn on spam protection 🔴

`src/lib/booking/records.ts:169`:

```ts
const secret = process.env.TURNSTILE_SECRET_KEY;
// Turnstile is not configured during the test-mode build; allow submissions
// through so the flow is exercisable. Once the secret is set this enforces.
if (!secret) return true;
```

It **fails open**. With no secret set, every submission passes the spam check — including automated ones. In live mode that means bots can create bookings and Stripe Checkout sessions at will, generating junk records, junk emails, and potentially card-testing traffic against the live account.

Required: create a Cloudflare Turnstile site, set `TURNSTILE_SECRET_KEY` in production, and verify a submission without a valid token is rejected.

## D5. Confirm the yard coordinates 🟠

`src/lib/booking/delivery-zone.ts:13-14` falls back to hardcoded coordinates:

```ts
lat: Number(process.env.DUMPSTER_YARD_LAT ?? "40.5069"),
lng: Number(process.env.DUMPSTER_YARD_LNG ?? "-111.9391"),
```

Delivery pricing is distance-from-this-point: 20 miles included, `EXTRA_DELIVERY_RATE_CENTS_PER_MILE = 200` ($2.00/mi) beyond that, hard cap `MAX_DELIVERY_RADIUS_MILES = 60`.

The coordinates are **confirmed correct** (Herriman/Riverton area). Remaining work is smaller: set them explicitly in production env rather than relying on the code default, and confirm the radius and per-mile rate against the approved rate sheet (this ties into D1's `delivery_zone_fees_unconfirmed`).

## D6. Communication opt-outs

The gate requires verified opt-outs. The booking flow captures `emailUpdates` / `smsUpdates` consent and `recordTransactionalConsents` persists it. Confirm before live that marketing sends honor these flags and that an unsubscribe path exists. Transactional receipts are exempt; marketing is not.

---

# PART E — Cutover sequence

Order matters. Do not start at step 6.

1. **Owner creates the Stripe account** (A1) and begins activation (A2) — this has the longest external wait
2. **Legal review runs in parallel** (D2) — agreement, payment authorization, cancellation policy
3. **Accountant resolves the tax question** (D3)
4. **Owner + legal confirm pricing**, resolve all seven blockers, publish the real pricing version (D1)
5. **Repo prep** — bump the agreement version, confirm yard coordinates, apply outstanding migrations, regenerate database types (B4, D2, D5)
6. **Verify DNS + Resend**, set `RESEND_FROM_EMAIL`, send a test receipt (B2)
7. **Set up Turnstile**, confirm submissions without a token are rejected (D4)
8. **Owner configures Stripe** — statement descriptor, branding, tax head office address, customer emails, Radar (A3)
9. **Owner shares live keys securely** (A4)
10. **Register the live webhook endpoint**, capture its signing secret (B3)
11. **Set production env vars in Vercel** (B1) and redeploy
12. **Run the live verification below** (Part F)
13. **Monitor closely** for the first several real bookings

---

# PART F — Post-cutover verification

Do this with a **real card and a real charge**, then refund it. Test mode cannot validate live credentials, live webhooks, or payouts.

**Payment path**
- [ ] Book a real rental end-to-end and pay with a real card
- [ ] Stripe dashboard (live mode) shows the payment succeeded
- [ ] Webhook endpoint shows `checkout.session.completed` delivered with a **200** response
- [ ] Booking status is `confirmed` — if it stuck at `pending_payment`, the webhook secret is wrong
- [ ] A container was auto-reserved and its dates are blocked in the calendar
- [ ] A finalized `booking_price_snapshots` row exists, referencing the **real published pricing version**
- [ ] `payments.is_test_mode` is `false`
- [ ] Card brand and last4 are captured and visible in the admin
- [ ] Customer receipt email arrived; staff alert email arrived
- [ ] `/book/confirmed` shows the confirmed state with correct amounts

**Refund path**
- [ ] Refund that payment from the admin
- [ ] `charge.refunded` delivered with a 200
- [ ] Payment reads `refunded`, booking `cancelled`, container **released** back to availability
- [ ] Money actually returns to the card (allow 5–10 business days)

**Guards**
- [ ] Submitting the booking form without a Turnstile token is rejected
- [ ] Blackout dates, closed weekdays, and fully-booked dates are all unselectable
- [ ] The agreement version recorded on the booking is the **final** identifier, not `-draft`
- [ ] Tax on the receipt matches what the accountant expects

**Account**
- [ ] Statement descriptor on a real card statement is recognizable
- [ ] First payout lands in the correct bank account
- [ ] Owner receives Stripe dispute notifications and knows the response deadline

---

# PART G — Rollback

If something is wrong after cutover, **stop taking payments before debugging**:

1. Replace `STRIPE_SECRET_KEY` in Vercel with the test key and redeploy — checkout immediately stops creating live charges
2. Refund any affected live payments from the Stripe dashboard; the webhook syncs them automatically
3. Investigate in sandbox

**Do not delete live payment records to clean up.** `guard_payment_row` blocks it by design, and the audit trail is required for tax and dispute defense. Cancel and refund instead.

If a live key is ever exposed, roll it in the dashboard immediately — old keys stop working the moment a new one is issued, so redeploy with the new value right away.

---

## Appendix A — Environment variable reference

| Variable | Scope | Live value | Documented in `.env.example`? |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | server | `sk_live_…` | ✅ |
| `STRIPE_WEBHOOK_SECRET` | server | live endpoint secret | ✅ |
| `NEXT_PUBLIC_SITE_URL` | public | production domain | ✅ |
| `SUPABASE_URL` / `SUPABASE_SECRET_KEY` | server | production project | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` / `…PUBLISHABLE_KEY` | public | production project | ✅ |
| `RESEND_API_KEY` | server | production key | ✅ |
| `RESEND_FROM_EMAIL` | server | **currently empty — blocks receipts** | ✅ |
| `RESEND_REPLY_TO_EMAIL` / `…CONTACT_TO_EMAIL` / `…BOOKING_TO_EMAIL` | server | business inbox | ✅ |
| `TURNSTILE_SECRET_KEY` | server | **required — fails open without it** | ✅ |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | public | referrer-restricted | ✅ |
| `GOOGLE_MAPS_API_KEY` | server | static-map fallback | ❌ **missing** |
| `DUMPSTER_YARD_LAT` | server | real yard latitude | ❌ **missing** |
| `DUMPSTER_YARD_LNG` | server | real yard longitude | ❌ **missing** |
| `STRIPE_MCP_RESTRICTED_KEY` | shell only | dev tooling; **never** live | ✅ |

Three server variables are referenced in code but undocumented — worth adding to `.env.example` so they aren't missed at deploy time.

---

## What's NOT in this KT

- Secret values of any kind — no keys, tokens, or signing secrets
- Supabase project ref and dashboard URLs
- Customer PII from sandbox test bookings
- Exact Stripe dashboard navigation paths (these change; settings are named by function instead)
- Legal advice — D2 and D3 identify what needs review, not what the answers should be

---

## Next session pickup point

1. Drag this KT into the Project Files panel on claude.ai
2. Reference it: "Continue from the go-live runbook"
3. Pair it with the companion doc `2026-08-07_18-54-stripe-payments-refunds-admin.md` for how the payment code actually works

**Immediate next actions (no Stripe account required):**
- Fix the three fail-open / draft issues: Turnstile secret, agreement version string, yard coordinates
- Add the three missing variables to `.env.example`
- Regenerate `src/types/database.ts` and reconcile migration drift
- Write a dedicated cancellation/refund policy page (needed for Stripe activation *and* the release gate)

---

*Generated 2026-08-07 18:59. File: `2026-08-07_18-59-stripe-live-golive-runbook.md`.*
