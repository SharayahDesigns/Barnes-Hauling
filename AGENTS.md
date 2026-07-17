# Barnes Hauling and Disposal Agent Instructions

## Mission

Build a fast, accessible, mobile-first website and operations platform for Barnes Hauling and Disposal. The primary conversion goals are qualified quote requests and completed bookings. The platform must eventually support hauling, dumpster rentals, scheduling, signed agreements, payments, customer communication, and internal operations without weakening security or inventing business rules.

## Source of truth

Read the relevant files in `docs/requirements/` before implementing a feature. Start with:

- `docs/requirements/01-project-vision-and-architecture.md`
- `docs/requirements/02-customer-journeys.md`
- `docs/requirements/17-development-phases.md`
- `docs/requirements/18-out-of-scope.md`
- `docs/requirements/19-ai-agent-instructions.md`

Then read the feature-specific documents and original material under `docs/reference/`.

The supplied set is missing section `15`. Do not infer its contents. Flag missing business, legal, operational, pricing, or service-area decisions for the user.

## Current technology

- Next.js App Router
- React with strict TypeScript
- SCSS and SCSS Modules
- Supabase Postgres, Auth, and Storage
- Stripe, Resend, Twilio, Google Maps, and Cloudflare Turnstile when their phases begin
- Vercel deployment target

## Next.js rules

This version of Next.js may contain APIs, conventions, and file structures that differ from older training material. Read the relevant guide in `node_modules/next/dist/docs/` before using an unfamiliar or version-sensitive API. Follow deprecation notices.

- Use Server Components by default.
- Add `"use client"` only when browser-side interactivity requires it.
- Use Server Actions or Route Handlers for trusted server operations.
- Keep secrets and privileged clients out of browser bundles.
- Handle loading, error, empty, and success states.

## Security boundaries

- Never expose a Supabase secret or service-role key.
- Never place a secret in a `NEXT_PUBLIC_` environment variable.
- Never commit `.env.local` or customer data.
- Enable Row Level Security on every exposed Supabase table.
- Do not bypass RLS to solve an authorization problem.
- Use ownership-based policies for customer records.
- Keep staff-only records and internal notes inaccessible to customers.
- Store customer photos, signed documents, and evidence in private buckets.
- Use expiring signed URLs for private file access.
- Validate all external input on the server.
- Verify webhook signatures and make webhook processing idempotent.
- Never store raw payment-card numbers, expiration dates, or security codes.
- Use Stripe identifiers and approved payment-method references only.
- Do not log secrets, payment data, signatures, or unnecessary personal data.

## Business and legal integrity

- Do not fabricate prices, service areas, availability, testimonials, guarantees, company history, or operational capacity.
- Treat the rental PDF as reference material, not automatically approved production configuration.
- Store money as integer cents.
- Store timestamps in UTC and convert only for presentation.
- Version pricing rules and legal documents.
- Preserve the exact agreement version and content a customer signs.
- Require legal review before production use of waivers, rental agreements, payment authorizations, and cancellation language.
- Require explicit authorization before saving a payment method or charging a later overage.
- Require staff review before charging overages.

## Architecture and implementation discipline

- Prefer small, maintainable, typed solutions.
- Centralize business configuration instead of duplicating hardcoded values.
- Use UUID primary keys, foreign keys, constraints, and audit timestamps.
- Preserve immutable financial, pricing, signature, and audit history.
- Avoid unnecessary dependencies.
- Commit lockfiles.
- Do not rewrite unrelated files.
- Do not remove working behavior without a documented reason.
- Keep public marketing concerns separate from customer, crew, and administrative authorization boundaries.
- Meet WCAG 2.2 AA where practical and test mobile layouts.

## Required workflow

Before implementation:

1. Read the relevant requirement documents.
2. Inspect existing code and current Next.js documentation.
3. State assumptions and identify unresolved requirements.
4. Identify affected files and authorization boundaries.
5. Implement the smallest complete solution.

Before handoff:

1. Run `npm run lint`.
2. Run `npm run typecheck`.
3. Run `npm run build`.
4. Test responsive and accessibility behavior when UI changes.
5. Test authentication, RLS, and data-ownership boundaries when data access changes.
6. Report changed files, verification results, and unresolved risks.

## Database and migration rules

- Use reviewed, version-controlled migrations.
- Do not make untracked production schema changes.
- Include RLS policies with exposed tables rather than postponing security.
- Use least-privilege policies; avoid broad anonymous write access.
- Generate and commit updated TypeScript database types after schema changes.
- Verify security and performance advisors after material migrations.

## Release gate

Do not represent the platform as production-ready until payment webhooks, RLS, private storage, booking-conflict prevention, legal review, cancellation and overage policies, communication opt-outs, and mobile booking have all been verified.
