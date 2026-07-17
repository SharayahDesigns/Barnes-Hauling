# Photo and File Documentation

## File categories

- Quote photos
- Before-service photos
- After-service photos
- Dumpster placement photos
- Driveway condition photos
- Container condition photos
- Prohibited-material evidence
- Damage evidence
- Weight tickets
- Donation receipts
- Recycling receipts
- Signed agreements
- Commercial account documents
- Tax-exempt certificates

## Storage requirements

Use private Supabase Storage buckets.

Requirements:

- No public customer-document buckets
- Signed URLs with expiration
- File ownership records
- Allowed file type validation
- File size limits
- Malware-scanning strategy before large-scale launch
- Secure deletion rules
- Retention policies
- Audit logging

## Metadata

Store:

- File ID
- Storage path
- Original filename
- MIME type
- File size
- Booking ID
- Customer ID
- Category
- Uploaded by
- Upload timestamp
- Description
- Visibility
- Retention date
- Hash when required

## Image behavior

- Compress large uploads.
- Preserve sufficient evidence quality.
- Strip unnecessary metadata when appropriate.
- Generate thumbnails.
- Never depend on filenames for security.
- Validate files on the server.

## Privacy

Customer photos may contain addresses, vehicles, people, documents, or private property. They must not be reused in public galleries without explicit documented permission.
