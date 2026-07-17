# Waivers and Electronic Signatures

## Purpose

The platform must send agreements to customers, capture legally meaningful signatures, preserve the exact signed version, and maintain a complete audit trail.

## Signing flow

```text
Admin or system selects document template
    ↓
System creates a frozen document snapshot
    ↓
Customer receives secure email or SMS link
    ↓
Customer reviews the complete agreement
    ↓
Customer agrees to electronic transactions
    ↓
Customer provides typed or drawn signature
    ↓
System records signature evidence
    ↓
Signed PDF is generated
    ↓
Customer and Barnes receive copies
```

## Required signature evidence

Store:

- Customer legal name
- Email address
- Phone number
- Signature image or typed signature value
- Date and exact timestamp
- IP address
- User agent
- Document template ID
- Document version
- Document content hash
- Booking ID
- Consent to electronic records
- Consent to card-on-file terms, when applicable
- Complete signature audit events
- Final signed PDF

## Document types

- General service authorization
- Property-access waiver
- Driveway and surface-damage waiver
- Dumpster rental agreement
- Prohibited-material acknowledgement
- Card-on-file and overage authorization
- Container placement acknowledgement
- Permit-responsibility acknowledgement
- Cancellation policy
- Failed-delivery policy
- Construction-debris acknowledgement
- Appliance or refrigerant handling agreement
- Before-and-after condition confirmation
- Commercial account agreement

## Versioning

Documents must be immutable after signing.

When a template changes:

- Create a new version.
- Preserve the previous version.
- Keep previous signed PDFs unchanged.
- Record which version each customer signed.

## Security

- Use expiring secure signing links.
- Prevent reuse after completion.
- Require server-side validation.
- Store signed PDFs in private storage.
- Use signed URLs for document access.
- Log document views and signature events.
- Never expose other customers' documents.

## Legal review

An electronic signature system does not guarantee that the language of a waiver is enforceable. All final waiver, payment authorization, rental, and cancellation language should be reviewed by a qualified attorney before production use.
