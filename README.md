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

## Project structure

```text
docs/
  reference/       Original business reference material
  requirements/    Product, operational, security, and release requirements
public/images/     Public brand and marketing assets
src/app/           Next.js routes and global styles
src/lib/supabase/  Browser and server Supabase clients
```

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
