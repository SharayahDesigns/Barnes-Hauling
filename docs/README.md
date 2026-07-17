# Barnes Project Documentation

These documents define the product scope and should be reviewed before implementing related features.

## Requirements index

1. [Project vision and architecture](requirements/01-project-vision-and-architecture.md)
2. [Customer journeys](requirements/02-customer-journeys.md)
3. [Core platform features](requirements/03-core-platform-features.md)
4. [Pricing engine](requirements/04-pricing-engine.md)
5. [Scheduling and dispatch](requirements/05-scheduling-and-dispatch.md)
6. [Waivers and electronic signatures](requirements/06-waivers-and-electronic-signatures.md)
7. [Payments and Stripe](requirements/07-payments-and-stripe.md)
8. [Email and SMS communications](requirements/08-email-and-sms-communications.md)
9. [Customer portal](requirements/09-customer-portal.md)
10. [Operations dashboard](requirements/10-operations-dashboard.md)
11. [Dumpster inventory and weight tickets](requirements/11-dumpster-inventory-and-weight-tickets.md)
12. [Photo and file documentation](requirements/12-photo-and-file-documentation.md)
13. [Commercial accounts](requirements/13-commercial-accounts.md)
14. [Customer-facing content](requirements/14-customer-facing-content.md)
15. [Database schema](requirements/16-database-schema.md)
16. [Development phases](requirements/17-development-phases.md)
17. [Out of scope for initial release](requirements/18-out-of-scope.md)
18. [AI agent instructions](requirements/19-ai-agent-instructions.md)
19. [Launch success metrics](requirements/20-launch-success-metrics.md)

## Reference material

- [Dumpster rental rates and terms](reference/dumpster-rental-rates-and-terms.pdf)

## Known gap

The supplied document set does not currently include section `15`. Its absence should be resolved before implementing features that may depend on it. Do not invent missing business, legal, service-area, or operational requirements.

## Change discipline

- Preserve original reference documents.
- Update requirements deliberately and review affected features.
- Version pricing and legal documents instead of silently overwriting signed or previously accepted terms.
- Keep implementation details out of business-source documents unless the document is explicitly technical.
