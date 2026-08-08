# Barnes Hauling and Disposal — What We Need From You

**Prepared:** August 8, 2026
**For:** Business owner
**About:** The new website and booking system

---

## Where the project stands

The website and online booking system are built and working. A customer can pick a dumpster, choose a delivery date, drop a pin showing where they want it placed, and pay by card. On the back end you have an admin dashboard to see every request, manage your containers, approve quotes, take payments, and issue refunds.

Right now it's all running in **test mode** — real cards can't be charged yet, and no emails are going out.

Getting from test mode to taking real money needs a set of things only you can do: accounts must be opened in the business's name, and a few numbers, facts, and policies need your sign-off. This document lists all of it in one place.

**Nothing here is a technical task for you.** It's accounts, information, and decisions.

---

## The short version

| What | Why it matters | How long |
|---|---|---|
| 1. Website address access | Blocks email and the live site | 15 min |
| 2. Open a Stripe account | Required to take card payments | 30 min + 1–3 days review |
| 3. Set up your Google listings | Local search, maps, reviews, site traffic | 20 min + verification wait |
| 4. Open a Resend account | Turns on customer emails | 15 min |
| 5. Answer 6 questions about the business | Website shows placeholders until then | 20 min |
| 6. Confirm your pricing | Prices can't go live unconfirmed | 30–60 min |
| 7. Decide your cancellation policy | Needed before taking real payments | 20 min |
| 8. Accountant answers a tax question | Affects what customers are charged | Their timeline |

Items 2, 3, and 8 involve waiting on other people — **please start those first.**

---

# 1. Website address access

**What I need:** the login for wherever `barneshaulinganddisposal.com` was purchased — GoDaddy, Namecheap, Google Domains, or similar.

**Why:** that account controls both your web address and your business email routing. I can't send customer emails, put the site on your real address, or finish the Stripe application without changing settings there.

**Best option:** move the domain into an account owned by the business, and add me as a user. You keep ownership; I get the access to do the work.

**If you'd rather not share the login:** I'll send you a short list of settings to paste in yourself. It works, it's just slower back and forth.

> ⚠️ This one blocks the most other work. It's the first thing I'd ask for.

---

# 2. Open a Stripe account

Stripe processes the card payments. **This account must be in your name and your business's name** — it's tied to your bank account, your tax reporting, and your liability if a customer disputes a charge. It should not be created under me.

Go to **stripe.com** and sign up with a business email address you control.

### Have ready

- [ ] Legal business name and structure (sole proprietor, LLC, etc.) exactly as registered
- [ ] EIN, or your Social Security number if you operate as a sole proprietor
- [ ] Business address and phone number
- [ ] Business bank account and routing number — this is where your money lands
- [ ] Driver's license or passport for identity verification
- [ ] A rough estimate of your average job size and monthly volume

### After you sign up

Stripe reviews new businesses before releasing payments. Usually same day to about **three business days**. They look at your public website during that review, so having the real site live helps.

Once you're approved, add me to the account as a team member and I'll handle the technical setup.

> 💡 Start this early even if everything else is still in progress. The review clock is out of our hands.

---

# 3. Set up your Google listings

Three free Google tools, all under one Google account — ideally the same one as your business email. Budget about 20 minutes total. Add me as a user on each and I'll handle the technical side.

### a) Google Business Profile — do this one first

This is what puts you in Google Maps and in the local results when someone searches "dumpster rental near me." It's also where customer reviews live.

**This has the biggest effect on new business of anything in this document.**

Only you can do it — Google verifies the business is real by mailing a postcard or calling. That can take several days, which is why it's worth starting early.

If you already have a listing claimed, just add me to it.

### b) Google Analytics

Shows how many people visit the site, which pages they look at, and how many go on to book.

**Worth setting up before we launch, not after** — it can't look backwards. Whatever traffic arrives before it's installed is simply not recorded.

### c) Google Search Console

Shows what people typed into Google to find you, and warns us if pages stop showing up in search. Free, and the site is already built to connect to it.

---

# 4. Open a Resend account

Resend sends your customer emails — booking confirmations, payment receipts, and the payment links you send after quoting someone over the phone.

**None of these are going out right now.** That's the single biggest missing piece for day-to-day use.

Go to **resend.com**, sign up with your business email, add me as a team member, and I'll connect it to your domain.

This depends on item 1 (domain access), so they go together.

---

# 5. Six questions about the business

The website is built to never invent facts about your company. Where I don't have an answer, it shows a placeholder rather than a guess — especially for anything a customer could hold you to.

Please confirm:

- [ ] **Your public address** — the address customers should see
- [ ] **Business hours** — when you answer the phone and when you deliver
- [ ] **Same-day availability** — can you honestly promise same-day service, and under what conditions?
- [ ] **Insurance** — carrier and coverage, exactly as you want it stated publicly
- [ ] **Licensing** — hauling permits or license numbers you want shown
- [ ] **Years in business** — the number you want to advertise

> The insurance and licensing ones matter most. Those are claims a customer or competitor could challenge, so I won't publish anything you haven't approved word for word.

---

# 6. Confirm your pricing

Your rate sheet is loaded but marked **draft** — meaning it isn't authorized to charge customers yet. Seven items need your confirmation:

- [ ] **Service areas** — exactly which cities and ZIP codes you serve
- [ ] **Taxes** — see item 8
- [ ] **Delivery fees outside the base area** — currently set to $2.00 per mile past 20 miles, with a 60-mile limit. Correct?
- [ ] **Extra day rate** — what a customer pays to keep a container longer
- [ ] **Prohibited material fee** — the charge when someone puts in something they shouldn't
- [ ] **Overloaded container fee** — the charge when a container is over the weight limit
- [ ] **Effective date** — when these prices officially start

Once you've confirmed these, I can publish the real rate sheet and the system will start using your actual prices.

---

# 7. Decide your cancellation and refund policy

This is a business decision, and only you can make it. Right now the website has a short FAQ answer but no real policy, and Stripe looks for one during their review.

Please answer these:

- [ ] **How far ahead must someone cancel for a full refund?** (24 hours? 48?)
- [ ] **What happens to a late cancellation?** Partial refund, a flat fee, or no refund?
- [ ] **What if you've already dispatched the truck?** Most haulers charge a trip fee here.
- [ ] **What if the container is already delivered?** Is any of the rental refundable?
- [ ] **What's your fee for keeping a container past the rental period?**
- [ ] **What happens if a customer puts in prohibited material or goes over the weight limit?** You already charge for this — what's the amount, and how much notice do they get?

Write it in your own words and send it over — I'll turn it into a proper policy page and make sure the wording customers agree to at checkout matches it.

> These aren't hypothetical. The system is already set up to charge a saved card for weight overages, so the customer-facing wording needs to match what you'd actually do.

---

# 8. Sales tax question for your accountant

Right now the system charges **$0.00 in sales tax** on every booking, because nobody has confirmed whether you're required to collect it.

**The question to ask:** *"Do I need to collect Utah sales tax on dumpster rentals, and am I registered for it?"*

Utah generally taxes rentals of equipment, so the answer is likely yes. The good news is Utah keeps this simple — the state collects the local portions for you, so it's one registration and one filing, not a separate one per city.

If you're already registered and collecting sales tax on your other work, this may just be a matter of sending me your license number and the rate.

> ⚠️ Please don't guess this one. If tax should have been collected and wasn't, you owe it regardless of what you charged the customer.

---

# What happens after all this

Once the accounts exist and the above is confirmed:

1. I connect everything and switch the system from test mode to live
2. We run one real booking start to finish with a real card, then refund it — the only way to prove live payments genuinely work
3. You start taking bookings

I'll also finish a few remaining pieces on my side, including the signed rental agreement step and mobile testing.

**A few things come after launch, not before:** text-message reminders (business texting requires a separate carrier registration that can take a few weeks), customer reviews, and a customer login area where people can see their own bookings.

---

# About your customer records — no action needed

Your bookings, customer contact details, photos, signed rental terms, and payment history are stored in a database I set up and maintain for you. You don't need an account for it or anything to manage — I handle it.

Two things worth knowing:

**Your payment records also live in Stripe.** Since that account is in your name, you'll always have your own independent record of every charge and refund, regardless of anything on my end.

**I'll set up regular backups** of the booking database, so your signed rental terms and booking history are protected. Those are legal records, so they shouldn't sit in only one place.

If you ever want a copy of your own data, or want it moved somewhere you control directly, just ask — it's your information and that's a straightforward thing to do.

---

# Suggested order

**This week — the things other people control**
1. Send me the domain/website address access
2. Start the Stripe application
3. Claim your Google Business Profile (verification takes days)
4. Ask your accountant the tax question

**When you have a spare hour**
5. Answer the six business questions
6. Confirm your pricing numbers
7. Write down your cancellation and refund rules
8. Create the Resend, Analytics, and Search Console accounts

**Then it's on me** — connecting everything, testing live, and going live.

---

## Questions

If anything here is unclear, or you'd rather talk through a section than read it, just ask. Several of these are quick once you know exactly what's being asked for.

The three worth starting today are **Stripe**, **your Google Business Profile**, and **the domain access** — each one waits on someone else, so everything after them moves faster.
