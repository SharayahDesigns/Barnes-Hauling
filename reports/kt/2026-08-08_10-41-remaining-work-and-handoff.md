# KT — Everything left to do: launch checklist and owner handoff

**Generated:** 2026-08-08T10:41
**Repo:** Barnes-Hauling
**Scope:** forward-looking — full remaining work, split by owner vs. developer
**Covers up to:** session-2026-08-08T10:41
**Companion docs:**
- [`2026-08-07_18-54-stripe-payments-refunds-admin.md`](./2026-08-07_18-54-stripe-payments-refunds-admin.md) — how the payment code works
- [`2026-08-07_18-59-stripe-live-golive-runbook.md`](./2026-08-07_18-59-stripe-live-golive-runbook.md) — Stripe cutover detail

---

## TL;DR

The booking and payment machinery is built and working in sandbox. What remains is mostly **not code**: third-party accounts that must be created and owned by the business, legal review of two documents, business facts only the owner knows, and a handful of unbuilt Phase 1 features. The accounts that hold money or legal identity — Stripe above all — must be created in the business's name. The database stays developer-managed by decision; what it needs is backups, not a change of owner. You also don't yet have DNS access to `barneshaulinganddisposal.com`, which blocks email, the live domain, and Stripe activation review.

---

## Where things stand

**Built and working (sandbox):** marketing site · service and service-area pages · address validation · dumpster booking flow · photo uploads · availability calendar · Stripe checkout · admin dashboard · leads and booking management · dumpster inventory · quote → approve → payment link · refunds (full and partial) · dispute sync · auto container assignment · price snapshots

**Built but not sending:** all transactional email — blocked on DNS/Resend

**Not built:** waiver e-signature · SMS · reviews · analytics · customer portal · hauling quote flow (contact form only)

---

# PART 1 — Account ownership and access

This is the most important section and the easiest to defer too long. Every third-party account is currently under the developer's control. The business must own the ones that hold money, customer data, or legal identity.

**Why it matters:** if the developer relationship ends, or an account is locked, the business must not lose access to its own payments, customer records, or domain. Stripe in particular ties the account holder to chargeback liability and tax reporting.

| Service | Owns it now | Must own it | Priority |
|---|---|---|---|
| **Domain / DNS** (`barneshaulinganddisposal.com`) | Owner (you lack access) | Owner | 🔴 blocking you |
| **Stripe** | Not created | **Owner** — money and legal liability | 🔴 |
| **Supabase** (customer data) | Developer org, Free plan | Developer — needs backups, not transfer | 🟢 |
| **Vercel** (hosting) | Developer | Owner (or shared) | 🟡 |
| **Resend** (email) | Developer | Owner | 🟠 |
| **Twilio** (SMS) | Not created | **Owner** — A2P registers under their EIN | 🟡 |
| **Google Cloud / Maps** | Developer | Owner (it bills) | 🟡 |
| **Cloudflare Turnstile** | Not created | Either | 🟢 |

### 1.1 Domain access — blocking you right now 🔴

You need DNS access to `barneshaulinganddisposal.com` before several things can proceed. Ask the owner for **either**:

- **Preferred:** registrar login, transferred to the business's own account, with you added as a delegate; or
- **Minimum:** the owner adds the DNS records you send them

What DNS unblocks:
- Resend domain verification → **all customer email**
- Pointing the live domain at Vercel
- Stripe activation review (they check the public site)
- Google Maps API referrer restrictions

Note the site is currently on `barnes-hauling.vercel.app`. Everything works there, but Stripe's review and email deliverability both prefer the real domain.

### 1.2 Supabase — stays developer-managed ✅ decided

**Decision: the developer keeps this.** The owner is non-technical and the developer is doing ongoing maintenance, so handing database admin to the owner would create ways to break things without reducing any real risk. Developer-managed infrastructure is a normal arrangement.

This is deliberately *not* the Stripe rule. Stripe must be the owner's because it is a regulated financial account tied to their EIN, bank account, chargeback liability, and 1099-K. Supabase is infrastructure — the concern is continuity, not who clicks the buttons.

Mitigate the actual risk instead:

- **Backups.** Free tier has none. A scheduled `pg_dump` to storage the business can reach costs nothing and covers the one thing ownership would have protected. This is the real action item.
- **Billing on the business card** once there is a bill, so a lapsed personal card cannot pause production.
- **Add the owner to the org** as a member even if they never sign in, so the account is not solely reachable through one person.
- **Document where things live** and how the business would recover access.

Free tier is fine to launch on. Upgrade triggers: customer photos approaching the storage cap (~1GB, roughly 200–500 phone photos), or manual backups starting to feel fragile.

### 1.3 The pattern for every other account

For each service: **owner creates the account** with a business email → adds the developer as a team member/collaborator → developer does the technical setup.

Not the other way around. Retrofitting ownership after an account is verified and transacting ranges from tedious to impossible.

---

# PART 2 — What the owner must provide or decide

None of this is code. All of it blocks launch.

### 2.1 Business facts still unconfirmed 🟠

Six values in `src/config/business.ts` are marked `pending` and render placeholders on the public site:

- **Public address** — the address customers see
- **Business hours**
- **Same-day availability** — what can actually be promised
- **Insurance statement** — carrier and coverage claim
- **License statement** — hauling permits and license numbers
- **Years in business**

These are marked pending deliberately: AGENTS.md forbids inventing company facts. Insurance and licensing claims in particular are legally meaningful and cannot be guessed.

### 2.2 Pricing sign-off 🔴

The real rate sheet is still `draft` with `legal_review_required: true` and seven open blockers:

```
service_areas_unconfirmed          taxes_unconfirmed
delivery_zone_fees_unconfirmed     extra_day_rate_unconfirmed
prohibited_material_fee_unconfirmed
overloaded_container_fee_unconfirmed
effective_date_unconfirmed
```

Until it's published, confirmed bookings snapshot against a **test seed** pricing version. Publishing requires the owner to confirm every number, then legal review.

### 2.3 Legal review 🔴

Two documents need a lawyer before real customers:

**Rental agreement / load-and-weight terms** — the version string is literally `load-and-weight-terms-2026-07-draft` and is stamped onto every booking as the record of what the customer accepted.

**Payment authorization language** — customers authorize a saved card for later overage charges. This is the highest-risk wording on the site.

Also needed: a real **cancellation and refund policy** page. Today it exists only as FAQ prose. Stripe's activation review looks for one, and it's on the release gate.

### 2.4 Sales tax decision 🟠

Every booking currently computes **$0.00 tax**. Utah generally taxes rentals of tangible personal property, so this likely applies. Utah administers local sales tax centrally through the State Tax Commission, so it is one registration and one filing rather than a per-city patchwork. The owner needs an accountant's confirmation, a Utah sales tax license if not already held, then a matching Stripe tax registration — in that order.

### 2.5 Yard location ✅ resolved

Delivery pricing is distance-from-yard: 20 miles included, $2.00/mile beyond, 60-mile cap. The coordinates (`40.5069, -111.9391`, Herriman/Riverton area) are **confirmed correct**. Still worth setting them explicitly in production env rather than relying on the code default, so a future edit can't silently change delivery pricing.

---

# PART 3 — Developer work in the repo

### 3.1 Blocking

- [ ] **Turnstile spam protection** — currently **fails open**; with no secret set, every submission passes. In live mode bots can create bookings and Stripe sessions freely.
- [ ] **Bump the agreement version** off `-draft` once legal signs off
- [ ] **Yard coordinates** into production env, once confirmed
- [ ] **`RESEND_FROM_EMAIL`** — empty, so no customer email sends at all
- [ ] **Reconcile migration drift** — `supabase/migrations/` does not describe the live schema; some were applied by hand through the SQL editor and aren't in Supabase's ledger
- [ ] **Regenerate `src/types/database.ts`** — stale types caused a production-severity bug this week (a to-one embed typed as an array); other embeds are likely wrong the same way
- [ ] **Commit the working tree** — a large amount of work is uncommitted
- [ ] Add three undocumented env vars to `.env.example`: `GOOGLE_MAPS_API_KEY`, `DUMPSTER_YARD_LAT`, `DUMPSTER_YARD_LNG`

### 3.2 Unbuilt Phase 1 features

Per `docs/requirements/17-development-phases.md`, still missing from the MVP scope:

| Feature | State | Notes |
|---|---|---|
| **Waiver / e-signature** | Not built | On the release gate. Schema exists; no signing UI |
| **SMS reminders** | Not built | Needs Twilio + A2P 10DLC. Consent capture already built and correct |
| **Reviews** | Not built | |
| **Analytics** | Not built | No tracking of any kind installed |
| **Hauling quote flow** | Partial | Junk-removal page exists; quotes go through the contact form. The structured flow is dumpster-only |

### 3.3 Phase 2 and beyond

Not launch-blocking, listed so nothing is forgotten: customer portal · dispatch board · crew mobile view · before/after photos · rental extensions · pickup requests · card-on-file overage charging · weight tickets · commercial accounts · recurring work · accounting export.

Note **card-on-file overages** is Phase 2 but the plumbing already exists — cards are being saved with authorization today. Charging one still requires staff review per AGENTS.md.

---

# PART 4 — Third-party setup, in order

### 4.1 Domain + DNS — do first, unblocks the rest
Get access, point the domain at Vercel, keep records ready for Resend.

### 4.2 Resend — email
Owner creates the account → add DNS records (SPF/DKIM) → verify the sending domain → set `RESEND_FROM_EMAIL`.
**Until this is done, no customer receives anything** — no receipts, no booking confirmations, no payment links. Quote approval currently hands staff the pay URL to share manually because of this.

### 4.3 Stripe — payments
Owner creates and activates the account (1–3 business days), configures statement descriptor, branding, tax head office address, and Radar. Then the live webhook endpoint, and live keys into Vercel.
Full detail in the go-live runbook. **No application code changes are needed to switch modes** — it's entirely credential-driven.

### 4.4 Cloudflare Turnstile — spam
Quick. Create a site, set the secret. Should happen before any public launch given the fail-open behavior.

### 4.5 Twilio — SMS (can be deferred)
Buy a number, then **A2P 10DLC brand and campaign registration** under the owner's EIN. Carrier review takes days to weeks and they will ask to see the opt-in flow.
The SMS opt-in checkbox is currently hidden behind `SMS_UPDATES_ENABLED = false`. Flip it when Twilio is live. Consent records are already being captured correctly, so nothing is lost by deferring.

### 4.6 Google Maps — already working
Move billing to the owner's Google Cloud account, and restrict the browser key by HTTP referrer once the real domain is live.

---

# PART 5 — Release gate

From AGENTS.md and the requirements docs. Do not represent the platform as production-ready until all are true:

- [x] Payment webhooks tested — verified end to end in sandbox
- [x] Booking conflicts prevented — GIST exclusion constraint + availability rules *(the availability bug found and fixed this week means this now actually holds)*
- [ ] RLS policies verified — run Supabase security advisors
- [ ] Customer files private — confirm buckets are private with signed-URL access
- [ ] Waiver language legally reviewed
- [ ] Cancellation and overage policies published
- [ ] Email and SMS opt-out behavior works — `opt_out_at` exists but nothing writes to it, and no send path checks consent
- [ ] Mobile booking tested on real devices

---

# PART 6 — Suggested order

**Now, unblocked**
1. Get domain/DNS access — gates the most downstream work
2. Fix Turnstile fail-open
3. Reconcile migrations, regenerate database types, commit everything
4. Ask the owner for the six business facts

**Owner-dependent, start in parallel** *(longest lead times — begin immediately)*
5. Owner creates Stripe and begins activation
6. Legal review of agreement, payment authorization, cancellation policy
7. Accountant answers the sales tax question
8. Owner creates Supabase account so the project can be transferred

**Once those land**
9. Publish the real pricing version
10. Resend domain verification → email starts working
11. Live Stripe keys + live webhook endpoint
12. Build waiver e-signature (release-gate item)
13. Full live verification with a real card, then refund it

**After launch**
14. Twilio + A2P registration, then enable SMS
15. Analytics and reviews
16. Phase 2 features

---

## Appendix — service to environment variable map

| Service | Variables | State |
|---|---|---|
| Supabase | `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ working |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | ✅ sandbox / ❌ live |
| Resend | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL`, `RESEND_CONTACT_TO_EMAIL`, `RESEND_BOOKING_TO_EMAIL`, `RESEND_WEBHOOK_SECRET` | ⚠️ key set, **from-address empty** |
| Google Maps | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_API_KEY` | ✅ / server var undocumented |
| Turnstile | `TURNSTILE_SECRET_KEY` | ❌ **fails open without it** |
| Site | `NEXT_PUBLIC_SITE_URL` | ⚠️ pointed at localhost for testing |
| Yard | `DUMPSTER_YARD_LAT`, `DUMPSTER_YARD_LNG` | ⚠️ hardcoded fallback, undocumented |
| Twilio | — | ❌ not integrated |

---

## What's NOT in this KT

- Secret values of any kind
- Supabase project ref and dashboard URLs
- Customer PII from sandbox test bookings
- Legal or tax advice — this identifies what needs professional review, not the answers
- Phase 3 detail beyond the feature list

---

*Generated 2026-08-08 10:41. File: `2026-08-08_10-41-remaining-work-and-handoff.md`.*
