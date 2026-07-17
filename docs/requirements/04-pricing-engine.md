# Pricing Engine

## Purpose

Pricing should be controlled by database rules rather than hardcoded inside components. Administrators should be able to change pricing without a full code deployment.

## Dumpster-rental pricing

```text
Base container price
+ delivery zone charge
+ rental duration adjustment
+ debris-type surcharge
+ additional tonnage
+ additional days
+ prohibited-material charge
+ failed-delivery charge
+ container relocation charge
+ applicable taxes
- valid discounts
```

## Hauling pricing

```text
Minimum service charge
+ item pricing or truck-volume pricing
+ labor adjustment
+ stairs or access difficulty
+ unusually heavy materials
+ disposal fees
+ travel zone
+ specialty handling
- valid discounts
```

## Pricing-rule structure

Each pricing rule should include:

- Rule name
- Service type
- Service area or zone
- Effective start date
- Effective end date
- Calculation type
- Value
- Priority
- Eligibility conditions
- Active status
- Internal description

## Price versioning

Every quote and booking must preserve the exact pricing rules used when the price was calculated.

Changing a pricing rule must not alter previous bookings.

Store:

- Pricing version
- Line items
- Quantity
- Unit price
- Adjustments
- Discounts
- Taxes
- Final total

## Quote behavior

### Instant price

Use for:

- Standard dumpster rentals
- Known single-item pickups
- Curbside pickups
- Fixed-price services

### Estimated range

Use for:

- Full property cleanouts
- Estate cleanouts
- Construction debris with uncertain volume
- Difficult access
- Mixed or unknown materials

### Onsite confirmation

The customer should approve the final quote before the crew begins work.

## Pricing transparency

Clearly display:

- What is included
- Rental duration
- Included tonnage
- Extra-day rate
- Overage rate
- Taxes
- Deposit
- Cancellation terms
- Potential conditional charges
