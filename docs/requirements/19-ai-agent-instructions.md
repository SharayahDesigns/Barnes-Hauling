# AI Agent Instructions

## Project purpose

Build a modern, fast, accessible, mobile-first website and operations platform for Barnes Hauling and Disposal.

## Primary conversion goal

Generate qualified quote requests and completed bookings.

## Technology

- Next.js App Router
- TypeScript with strict mode
- SCSS Modules
- Supabase
- React Hook Form
- Zod
- Stripe
- Resend
- Twilio
- Vercel

## Engineering rules

- Use Server Components by default.
- Add `use client` only when browser interactivity requires it.
- Never expose secret environment variables.
- Never expose Supabase service-role credentials.
- Never store raw payment card data.
- Validate external input on the server with Zod.
- Do not rely on client-side validation alone.
- Enable RLS on every exposed Supabase table.
- Use private storage for customer documents and photos.
- Verify all webhook signatures.
- Make webhook handlers idempotent.
- Avoid unnecessary dependencies.
- Commit lockfiles.
- Use reusable typed configuration.
- Avoid duplicated hardcoded business information.
- Use semantic HTML.
- Meet WCAG 2.2 AA where practical.
- Optimize for mobile performance.
- Handle loading, error, empty, and success states.
- Never fabricate reviews, prices, service areas, guarantees, or company history.
- Use clear placeholders for missing business facts.

## Legal and financial safeguards

- Version every agreement.
- Preserve the exact signed document.
- Record signature audit evidence.
- Require explicit authorization for saved payment methods.
- Require staff review before charging overages.
- Keep customer and internal records separated.
- Do not provide legal conclusions in the product UI.
- Mark legal text as requiring attorney approval until approved.

## Workflow

Before implementing:

1. Read the relevant project documents.
2. Inspect existing code patterns.
3. State assumptions.
4. Identify affected files.
5. Implement the smallest maintainable solution.
6. Run linting and type checking.
7. Test responsive behavior.
8. Test authorization boundaries.
9. Report changes and unresolved risks.

## Change discipline

- Do not rewrite unrelated files.
- Do not remove working code without reason.
- Do not expose secrets in logs.
- Do not commit customer data.
- Do not bypass RLS to fix permission errors.
- Do not use permissive anonymous policies without documented justification.
