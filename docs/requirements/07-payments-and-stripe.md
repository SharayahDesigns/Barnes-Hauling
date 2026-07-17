# Payments and Stripe

## Payment provider

Use Stripe Checkout or Stripe Payment Element. Barnes systems must never store raw card numbers, expiration dates, or card security codes.

## Dumpster-rental payment model

Recommended flow:

1. Collect the rental price at booking.
2. Save the customer's payment method through Stripe.
3. Obtain explicit consent for later documented charges.
4. Calculate overages from agreed rules.
5. Require staff review before charging.
6. Send an itemized overage notice.
7. Attach supporting weight-ticket or damage documentation.
8. Charge the saved payment method.
9. Send a final receipt.

## Hauling payment model

Support:

- No deposit for free onsite estimates
- Reservation deposit for high-demand appointment windows
- Full payment for fixed-price pickups
- Final payment after onsite quote approval
- Partial refund or cancellation fee
- In-person payment through Stripe Terminal later

## Payment records

Store:

- Stripe customer ID
- Stripe payment intent ID
- Stripe checkout session ID
- Payment status
- Amount
- Currency
- Booking ID
- Invoice or receipt URL
- Payment method summary
- Refund amount
- Failure reason
- Created and updated timestamps

## Webhooks

All payment state changes must come from verified Stripe webhooks.

Required protections:

- Verify webhook signatures.
- Make webhook processing idempotent.
- Store processed event IDs.
- Never trust browser redirects as proof of payment.
- Retry safely.
- Log failures without exposing secrets.

## Card-on-file authorization

The customer agreement must explain:

- Why the payment method is saved
- What future charges may occur
- How those charges are calculated
- When the customer will be notified
- How disputes or questions are handled

## Refunds and adjustments

The system should support:

- Full refund
- Partial refund
- Deposit retention
- Discount adjustment
- Service credit
- Failed-payment retry
- Internal approval for large refunds
