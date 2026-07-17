# Customer Portal

## Access model

Use passwordless secure links or Supabase Auth magic links. Avoid forcing customers to create passwords during the initial release.

## Customer capabilities

- View active bookings
- View past bookings
- Review scheduled dates and arrival windows
- Upload additional photos
- Update service instructions
- Sign outstanding agreements
- Download signed agreements
- Download receipts and invoices
- Pay outstanding balances
- Request rescheduling
- Request cancellation
- Request early dumpster pickup
- Extend a rental
- View documented overages
- Rebook a previous service
- Contact Barnes support

## Security

- Customers can only access their own records.
- Use Row Level Security and ownership checks.
- Use signed URLs for private files.
- Expire sensitive access links.
- Require reauthentication for sensitive payment or account changes.
- Do not expose internal notes.

## Portal states

The interface should clearly communicate:

- Action required
- Awaiting Barnes review
- Scheduled
- Crew assigned
- In progress
- Completed
- Payment due
- Agreement required
- Pickup requested
- Cancelled

## Customer experience

The portal should be optimized for phones and avoid complex navigation. The customer should immediately see the next required action.
