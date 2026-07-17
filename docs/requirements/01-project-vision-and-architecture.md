# Project Vision and Architecture

## Product vision

Barnes Hauling and Disposal needs a modern website that generates leads and also supports the daily operation of the business.

The platform should combine:

- Marketing website
- Online quote system
- Service scheduling
- Dumpster rental booking
- Electronic waivers and agreements
- Online payments
- Customer communication
- Customer portal
- Internal operations dashboard

## Primary goals

1. Increase qualified quote requests.
2. Increase online bookings.
3. Reduce phone-based scheduling work.
4. Prevent booking conflicts.
5. Collect signed agreements before service.
6. Securely collect payments and approved overages.
7. Keep customers informed automatically.
8. Improve local search visibility.
9. Give employees one reliable source of truth.
10. Create a foundation that can grow with the business.

## Core architecture

```text
Customer Website
    ↓
Next.js Server Actions and Route Handlers
    ↓
Supabase Database and Storage
    ↓
Stripe, Resend, Twilio, Maps, Turnstile
    ↓
Admin and Crew Operations Dashboard
```

## Recommended stack

- Next.js App Router
- TypeScript
- SCSS Modules
- Supabase Postgres
- Supabase Auth
- Supabase Storage
- Stripe
- Resend
- Twilio
- Google Maps Platform
- Cloudflare Turnstile
- Vercel
- GitHub

## Two service models

The platform must support two separate customer flows.

### Hauling and junk removal

Pricing may depend on:

- Item count
- Truck volume
- Labor
- Weight
- Stairs
- Access difficulty
- Distance
- Disposal fees
- Specialty handling

Large or complex jobs should use photo-assisted estimates or onsite quotes.

### Dumpster and disposal rentals

Pricing is usually more predictable and can be calculated from:

- Container size
- Delivery area
- Rental duration
- Debris type
- Included weight
- Extra days
- Additional tonnage
- Special handling
- Taxes

## Architectural principles

- Server Components by default
- Server-side validation for all external input
- Row Level Security on exposed Supabase tables
- No payment card data stored in Barnes systems
- No secrets exposed to browser code
- Versioned pricing and legal documents
- Mobile-first interfaces
- Reusable configuration instead of duplicated hardcoded values
- Clear audit trails for financial and legal events
