# Database Schema

## Customer and account tables

```text
customers
customer_addresses
commercial_accounts
commercial_account_users
notification_consents
```

## Service and pricing tables

```text
services
service_items
service_areas
service_zones
pricing_rules
pricing_rule_versions
promotion_codes
```

## Quote tables

```text
quotes
quote_items
quote_photos
quote_revisions
quote_status_history
```

## Booking and scheduling tables

```text
bookings
booking_items
booking_events
booking_resources
booking_status_history
availability_rules
blackout_dates
```

## Operations tables

```text
crews
employees
vehicles
dumpsters
dumpster_status_history
routes
route_stops
```

## Rental and disposal tables

```text
rental_orders
rental_extensions
pickup_requests
dump_tickets
overage_charges
```

## Documents and signatures

```text
waiver_templates
waiver_template_versions
booking_documents
document_signatures
signature_audit_events
```

## Payments

```text
stripe_customers
payments
payment_adjustments
refunds
invoices
processed_webhook_events
```

## Files and communication

```text
files
notifications
notification_deliveries
notification_consents
```

## Marketing and trust

```text
reviews
review_requests
referrals
gallery_items
utm_attribution
```

## Administration

```text
internal_notes
audit_events
site_settings
staff_roles
staff_permissions
```

## Core schema rules

- Use UUID primary keys.
- Include created and updated timestamps.
- Add foreign-key constraints.
- Use status enums or constrained values.
- Enable RLS on exposed tables.
- Use ownership predicates for customer access.
- Store money in integer cents.
- Store timestamps in UTC.
- Preserve pricing and document versions.
- Never store raw card data.
- Keep internal notes inaccessible to customers.
