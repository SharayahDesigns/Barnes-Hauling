# Barnes Project Documentation

These documents define the product scope and should be reviewed before implementing related features.

## Requirements index

1. [Project vision and architecture](requirements/01-project-vision-and-architecture.md)
2. [Core platform features](requirements/03-core-platform-features.md)
3. [Scheduling and dispatch](requirements/05-scheduling-and-dispatch.md)
4. [Waivers and electronic signatures](requirements/06-waivers-and-electronic-signatures.md)
5. [Payments and Stripe](requirements/07-payments-and-stripe.md)
6. [Email and SMS communications](requirements/08-email-and-sms-communications.md)
7. [Operations dashboard](requirements/10-operations-dashboard.md)
8. [Photo and file documentation](requirements/12-photo-and-file-documentation.md)
9. [Commercial accounts](requirements/13-commercial-accounts.md)
10. [Database schema](requirements/16-database-schema.md)
11. [Development phases](requirements/17-development-phases.md)
12. [Out of scope for initial release](requirements/18-out-of-scope.md)
13. [AI agent instructions](requirements/19-ai-agent-instructions.md)
14. [Launch success metrics](requirements/20-launch-success-metrics.md)

## Reference material

- [Dumpster rental rates and terms](reference/dumpster-rental-rates-and-terms.pdf)

## Known gaps

The supplied document set does not currently include sections `02`, `04`, `09`, `11`, `14`, or `15`. Their absence should be resolved before implementing features that may depend on them. Do not invent missing business, pricing, legal, service-area, or operational requirements.

## Change discipline

- Preserve original reference documents.
- Update requirements deliberately and review affected features.
- Version pricing and legal documents instead of silently overwriting signed or previously accepted terms.
- Keep implementation details out of business-source documents unless the document is explicitly technical.
