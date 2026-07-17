# Scheduling and Dispatch

## Scheduling purpose

Available appointments must be calculated from actual business capacity. A basic calendar that ignores crews, trucks, dumpsters, travel, and job duration will create double bookings.

## Scheduling inputs

- Crew availability
- Employee availability
- Truck availability
- Dumpster inventory
- Service type
- Estimated job duration
- Service location
- Travel time
- Setup and cleanup buffers
- Same-day booking cutoff
- Daily stop limits
- Disposal-site hours
- Blackout dates
- Equipment requirements

## Hauling scheduling

Customers should select an arrival window rather than an exact arrival minute.

Recommended windows:

- 8:00 AM–10:00 AM
- 10:00 AM–12:00 PM
- 12:00 PM–2:00 PM
- 2:00 PM–4:00 PM
- 4:00 PM–6:00 PM

The actual windows should be configurable.

## Dumpster scheduling

Dumpster rentals require separate operational events:

- Delivery
- Customer possession
- Pickup requested
- Pickup scheduled
- Disposal-site visit
- Return to available inventory
- Maintenance, when needed

## Dispatch board

The internal dispatch board should include:

- Day, week, and timeline views
- Unassigned jobs
- Jobs grouped by crew or truck
- Delivery and pickup routes
- Drag-and-drop assignment
- Capacity warnings
- Travel estimates
- Customer contact shortcuts
- Job status updates
- Failed-delivery handling

## Rescheduling rules

The system should enforce:

- Allowed rescheduling window
- Cancellation deadline
- Same-day restrictions
- Deposit treatment
- Staff approval for exceptions
- Notification of all affected employees and customers

## Audit requirements

Every schedule change should record:

- Previous date and time
- New date and time
- User making the change
- Timestamp
- Reason
- Customer notification status
