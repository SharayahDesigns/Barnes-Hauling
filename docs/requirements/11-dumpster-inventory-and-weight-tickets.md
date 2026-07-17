# Dumpster Inventory and Weight Tickets

## Dumpster inventory

Every physical dumpster should have its own record.

Store:

- Internal asset number
- Dumpster size
- Current status
- Current location
- Condition
- Purchase date
- Maintenance notes
- Photos
- Last inspection
- Current booking
- Availability date

## Dumpster statuses

```text
Available
Reserved
Scheduled for delivery
In transit
At customer
Pickup requested
Scheduled for pickup
In transit to disposal site
At disposal site
Returning
Inspection required
Maintenance
Unavailable
Retired
```

## Status history

Every status change should record:

- Previous status
- New status
- Employee
- Timestamp
- Location
- Booking
- Notes

## Weight-ticket workflow

1. Upload or photograph the disposal-site ticket.
2. Record gross weight.
3. Record tare weight.
4. Calculate net weight.
5. Compare against included tonnage.
6. Calculate overage from the booking's pricing version.
7. Require employee review.
8. Notify customer.
9. Charge the approved payment method.
10. Attach ticket and calculation to the receipt.

## Overage controls

- Staff must verify the ticket before charging.
- The system must prevent duplicate charges.
- Calculations must be reproducible.
- Customer notices must be itemized.
- Supporting documentation must remain available.

## Additional operational charges

Support:

- Extra days
- Additional tonnage
- Prohibited materials
- Failed delivery
- Blocked pickup
- Container relocation
- Damage
- Cleaning
- Permit-related delay
