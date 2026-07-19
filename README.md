# Barnes Hauling and Disposal

Website and operations platform for Barnes Hauling and Disposal. The product is designed to generate qualified leads, support online bookings, schedule hauling and dumpster rentals, collect signed agreements, accept payments, and give staff one operational source of truth.

## Current status

The repository currently contains the application foundation and Supabase connection utilities. The starter interface is temporary; production features and database migrations have not been implemented yet.

## Technology

- Next.js App Router
- React and strict TypeScript
- SCSS and SCSS Modules
- Supabase Postgres, Auth, and Storage
- Stripe, Resend, and Twilio in later phases
- Vercel deployment target

## Local setup

Requirements:

- Node.js 20.9 or newer
- npm

Install dependencies:

```bash
npm install
```

Create the local environment file:

```bash
cp .env.example .env.local
```

Replace the placeholder values in `.env.local` with the Barnes Supabase project URL and publishable key. Never add a Supabase secret or service-role key to a variable beginning with `NEXT_PUBLIC_`.

Start development:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

Run these checks before committing application changes:

```bash
npm run lint
npm run typecheck
npm run build
```

## Resend email setup

Barnes uses Resend for transactional email delivery from the app. Set up email before enabling live contact or booking notifications:

1. Create a Resend account and API key.
2. Verify a Barnes-controlled sending domain or subdomain in Resend. A subdomain such as `mail.yourdomain.com` is recommended.
3. Add the Resend variables from [.env.example](/Users/sharayahhefner/Desktop/Barnes-Hauling/.env.example:1) to `.env.local`.
4. Point `RESEND_FROM_EMAIL` at the verified domain. This must not use the public Gmail address as the sender.
5. Set `RESEND_CONTACT_TO_EMAIL` and `RESEND_BOOKING_TO_EMAIL` to the inbox Barnes should monitor.
6. Register a Resend webhook that targets `/api/webhooks/resend` and store its signing secret in `RESEND_WEBHOOK_SECRET`.

Current application usage:

- Contact-form submissions send an internal Barnes notification and a customer acknowledgement.
- Dumpster booking draft submissions send an internal request alert and a customer confirmation.
- The webhook route verifies Resend signatures and is ready for delivery-event persistence once notification history tables are wired into the app layer.

## Project structure

```text
docs/
  reference/       Original business reference material
  requirements/    Product, operational, security, and release requirements
public/images/     Public brand and marketing assets
src/app/           Next.js routes and global styles
src/config/        Typed business facts, service definitions, and site routes
src/lib/supabase/  Browser and server Supabase clients
```

Business facts that have not been confirmed are represented as typed `pending`
values in `src/config/business.ts`. Public UI must check that status rather than
inventing or publishing a placeholder as a real phone number, service area,
price, policy, or trust claim.

See [docs/README.md](docs/README.md) for the requirements index and identified documentation gaps.

## Security rules

- Keep `.env.local` and every real secret out of Git.
- Never expose a Supabase service-role or secret key to browser code.
- Enable Row Level Security on every exposed table.
- Store customer photos and signed documents in private buckets.
- Validate external input on the server.
- Verify webhook signatures and process webhook events idempotently.
- Never store raw payment-card information.
- Do not fabricate prices, service areas, testimonials, guarantees, or company history.

## Source of truth

Implementation decisions must follow the committed requirements. Rental prices and legal language are business inputs, not developer assumptions. Waivers, payment authorization, cancellation terms, and rental agreements require appropriate business and legal approval before production launch.
