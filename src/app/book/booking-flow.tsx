"use client";

import { useEffect, useRef, useState } from "react";

import { formatCents } from "@/config/public-content";
import {
  checkPostalCodeAction,
  submitBookingDraft,
} from "@/lib/booking/actions";
import { createBookingCheckout } from "@/lib/booking/checkout";
import {
  bookingSizeOptions,
  getBookingSizeOption,
  PREPAYMENT_AGREEMENT_TERMS,
  TRANSACTIONAL_CONSENT_LANGUAGE,
} from "@/lib/booking/options";
import type { SizeKey } from "@/lib/booking/schema";
import type { DeliveryAvailability, PostalCodeCheck } from "@/lib/booking/types";
import { loadGoogleMaps } from "@/lib/maps/loader";

import styles from "./booking-flow.module.scss";
import { DateCalendar } from "./date-calendar";
import { PlacementMap } from "./placement-map";

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type StepId =
  | "area"
  | "size"
  | "schedule"
  | "contact"
  | "placement"
  | "review";

const STEPS: ReadonlyArray<{ id: StepId; label: string }> = [
  { id: "area", label: "Service area" },
  { id: "size", label: "Container" },
  { id: "schedule", label: "Delivery date" },
  { id: "contact", label: "Contact" },
  { id: "placement", label: "Placement" },
  { id: "review", label: "Review" },
];

type FormState = {
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  sizeKey: SizeKey | "";
  neededDate: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emailUpdates: boolean;
  smsUpdates: boolean;
  placementNotes: string;
  placementLatitude: number | null;
  placementLongitude: number | null;
  agreementAccepted: boolean;
};

const EMPTY_FORM: FormState = {
  postalCode: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  sizeKey: "",
  neededDate: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  emailUpdates: true,
  smsUpdates: false,
  placementNotes: "",
  placementLatitude: null,
  placementLongitude: null,
  agreementAccepted: false,
};

const STORAGE_KEY = "barnes-booking-draft-v1";

type Errors = Partial<Record<keyof FormState, string>>;

function todayIsoDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function validateStep(step: StepId, form: FormState): Errors {
  const errors: Errors = {};
  const has = (value: string) => value.trim().length > 0;

  if (step === "area") {
    if (!/^\d{5}$/.test(form.postalCode.trim()))
      errors.postalCode = "Enter a valid 5-digit ZIP code.";
    if (!has(form.addressLine1)) errors.addressLine1 = "Street address is required.";
    if (!has(form.city)) errors.city = "City is required.";
    if (!/^[A-Za-z]{2}$/.test(form.region.trim()))
      errors.region = "Use the 2-letter state code (for example, UT).";
  }

  if (step === "size" && !form.sizeKey) {
    errors.sizeKey = "Choose a container.";
  }

  if (step === "schedule") {
    if (!form.neededDate) errors.neededDate = "Choose a delivery date.";
    else if (form.neededDate < todayIsoDate())
      errors.neededDate = "Choose a date that is today or later.";
  }

  if (step === "contact") {
    if (!has(form.firstName)) errors.firstName = "First name is required.";
    if (!has(form.lastName)) errors.lastName = "Last name is required.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()))
      errors.email = "Enter a valid email address.";
    if (form.phone.replace(/\D/g, "").length < 10)
      errors.phone = "Enter a valid phone number.";
  }

  if (step === "review" && !form.agreementAccepted) {
    errors.agreementAccepted =
      "You must accept the load and weight terms to continue.";
  }

  return errors;
}

export function BookingFlow({
  availability,
}: Readonly<{ availability: DeliveryAvailability }>) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [areaCheck, setAreaCheck] = useState<PostalCodeCheck["status"] | null>(
    null,
  );
  const [checkingArea, setCheckingArea] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    quoteNumber: number;
    serviceAreaConfirmed: boolean;
  } | null>(null);
  const restored = useRef(false);

  // Restore an in-progress draft after mount. This must run in an effect (not a
  // lazy initializer) because the page is statically prerendered — reading
  // sessionStorage during render would diverge from the server HTML and break
  // hydration. Restoring once, post-mount, is the correct pattern here.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time post-hydration restore from browser storage
      if (saved) setForm({ ...EMPTY_FORM, ...JSON.parse(saved) });
    } catch {
      // Ignore malformed drafts.
    }
  }, []);

  // Persist progress so a refresh does not lose the customer's work.
  useEffect(() => {
    if (!restored.current) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // Storage may be unavailable (private mode); progress is best-effort.
    }
  }, [form]);

  const step = STEPS[stepIndex];

  const selectedOption = form.sizeKey ? getBookingSizeOption(form.sizeKey) : null;
  const reviewButtonLabel =
    selectedOption?.price.type === "fixed"
      ? `Pay ${formatCents(selectedOption.price.amountCents)} & reserve`
      : "Submit quote request";

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function runAreaCheck(zipArg?: string) {
    const zip = (zipArg ?? form.postalCode).trim();
    if (!/^\d{5}$/.test(zip)) {
      setAreaCheck(null);
      return;
    }
    setCheckingArea(true);
    try {
      const result = await checkPostalCodeAction(zip);
      setAreaCheck(result.status);
    } catch {
      setAreaCheck(null);
    } finally {
      setCheckingArea(false);
    }
  }

  function goNext() {
    const stepErrors = validateStep(step.id, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  }

  function goBack() {
    setErrors({});
    setStepIndex((index) => Math.max(index - 1, 0));
  }

  async function handleSubmit() {
    const stepErrors = validateStep("review", form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setSubmitting(true);
    setFormError(null);

    const payload = {
      postalCode: form.postalCode.trim(),
      addressLine1: form.addressLine1.trim(),
      addressLine2: form.addressLine2.trim() || undefined,
      city: form.city.trim(),
      region: form.region.trim(),
      sizeKey: form.sizeKey,
      neededDate: form.neededDate,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      emailUpdates: form.emailUpdates,
      smsUpdates: form.smsUpdates,
      placementNotes: form.placementNotes.trim() || undefined,
      placementLatitude: form.placementLatitude ?? undefined,
      placementLongitude: form.placementLongitude ?? undefined,
      agreementAccepted: form.agreementAccepted,
    };

    const option = form.sizeKey ? getBookingSizeOption(form.sizeKey) : null;

    try {
      // Priced sizes go to Stripe Checkout; quote-required sizes save a lead.
      if (option?.price.type === "fixed") {
        const result = await createBookingCheckout(payload);
        if (!result.ok) {
          setFormError(result.error);
          if (result.fieldErrors) setErrors(result.fieldErrors as Errors);
          return;
        }
        window.sessionStorage.removeItem(STORAGE_KEY);
        window.location.href = result.url;
        return;
      }

      const result = await submitBookingDraft(payload);
      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors as Errors);
        return;
      }
      window.sessionStorage.removeItem(STORAGE_KEY);
      setConfirmation({
        quoteNumber: result.quoteNumber,
        serviceAreaConfirmed: result.serviceAreaConfirmed,
      });
    } catch {
      setFormError("Something went wrong. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.panel}>
          <div className={styles.confirmation}>
            <span className={styles.confirmationBadge} aria-hidden="true">
              ✓
            </span>
            <h1 className={styles.stepTitle}>Request received</h1>
            <p className={styles.confirmationNumber}>
              Reference #{confirmation.quoteNumber}
            </p>
            <p className={styles.stepSummary}>
              We saved your dumpster request. A Barnes team member will confirm
              {confirmation.serviceAreaConfirmed
                ? " your delivery date and finalize pricing."
                : " that your address is within our service area, then confirm your date and pricing."}
            </p>
            <p className={styles.helpText}>
              Online payment and the emailed rental agreement are being finalized
              and are not active in this preview. No card was charged.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.layout}>
        <ol className={styles.progress} aria-label="Booking progress">
          {STEPS.map((item, index) => {
            const state =
              index === stepIndex
                ? styles.progressItemActive
                : index < stepIndex
                  ? styles.progressItemDone
                  : "";
            return (
              <li
                key={item.id}
                className={`${styles.progressItem} ${state}`}
                aria-current={index === stepIndex ? "step" : undefined}
              >
                <span className={styles.progressDot}>
                  {index < stepIndex ? "✓" : index + 1}
                </span>
                {item.label}
              </li>
            );
          })}
        </ol>

        <div className={styles.panel}>
          <p className={styles.testBanner}>
            Preview mode — you can walk through the full request. Payment and the
            emailed agreement are coming next; no card is charged.
          </p>

          {step.id === "area" && (
            <StepArea
              form={form}
              errors={errors}
              areaCheck={areaCheck}
              checkingArea={checkingArea}
              onChange={update}
              onZipBlur={runAreaCheck}
            />
          )}
          {step.id === "size" && (
            <StepSize form={form} errors={errors} onChange={update} />
          )}
          {step.id === "schedule" && (
            <StepSchedule
              form={form}
              errors={errors}
              onChange={update}
              availability={availability}
            />
          )}
          {step.id === "contact" && (
            <StepContact form={form} errors={errors} onChange={update} />
          )}
          {step.id === "placement" && (
            <StepPlacement form={form} onChange={update} />
          )}
          {step.id === "review" && (
            <StepReview form={form} errors={errors} onChange={update} />
          )}

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}

          <div className={styles.actions}>
            {stepIndex > 0 && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={goBack}
                disabled={submitting}
              >
                Back
              </button>
            )}
            {step.id === "review" ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Working…" : reviewButtonLabel}
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={goNext}
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type StepProps = {
  form: FormState;
  errors: Errors;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

function Field({
  id,
  label,
  error,
  optional,
  children,
}: Readonly<{
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {optional && <span className={styles.optional}> (optional)</span>}
      </label>
      {children}
      {error && (
        <p className={styles.errorText} id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

function StepArea({
  form,
  errors,
  areaCheck,
  checkingArea,
  onChange,
  onZipBlur,
}: StepProps & {
  areaCheck: PostalCodeCheck["status"] | null;
  checkingArea: boolean;
  onZipBlur: (zip?: string) => void;
}) {
  const addressRef = useRef<HTMLInputElement>(null);
  const [verified, setVerified] = useState<string | null>(null);

  // Keep the latest callbacks without re-attaching the autocomplete each render.
  const callbacks = useRef({ onChange, onZipBlur });
  useEffect(() => {
    callbacks.current = { onChange, onZipBlur };
  }, [onChange, onZipBlur]);

  useEffect(() => {
    if (!MAPS_API_KEY || !addressRef.current) return;
    let cancelled = false;
    let autocomplete: google.maps.places.Autocomplete | null = null;

    loadGoogleMaps(MAPS_API_KEY)
      .then((maps) => {
        if (cancelled || !addressRef.current) return;
        autocomplete = new maps.maps.places.Autocomplete(addressRef.current, {
          types: ["address"],
          componentRestrictions: { country: "us" },
          fields: ["address_components", "geometry", "formatted_address"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          if (!place?.address_components) return;
          const part = (type: string, short = false) => {
            const found = place.address_components?.find((c) =>
              c.types.includes(type),
            );
            return found ? (short ? found.short_name : found.long_name) : "";
          };

          const { onChange: change, onZipBlur: checkZip } = callbacks.current;
          const line1 = [part("street_number"), part("route")]
            .filter(Boolean)
            .join(" ");
          if (line1) change("addressLine1", line1);
          const city = part("locality") || part("sublocality") || part("postal_town");
          if (city) change("city", city);
          const region = part("administrative_area_level_1", true);
          if (region) change("region", region);
          const postal = part("postal_code");
          if (postal) change("postalCode", postal);

          const location = place.geometry?.location;
          if (location) {
            change("placementLatitude", location.lat());
            change("placementLongitude", location.lng());
          }

          setVerified(place.formatted_address ?? line1);
          if (postal) checkZip(postal);
        });
      })
      .catch(() => {
        // Autocomplete unavailable — manual entry still works.
      });

    return () => {
      cancelled = true;
      if (autocomplete && window.google) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, []);

  return (
    <>
      <header className={styles.stepHeader}>
        <p className={styles.stepEyebrow}>Step 1 of 6</p>
        <h1 className={styles.stepTitle}>Where should we deliver?</h1>
        <p className={styles.stepSummary}>
          Enter the delivery address so we can confirm service-area coverage.
        </p>
      </header>
      <fieldset className={styles.fieldset}>
        <div className={`${styles.fieldRow} ${styles.fieldRowZip}`}>
          <Field id="postalCode" label="ZIP code" error={errors.postalCode}>
            <input
              id="postalCode"
              className={`${styles.input} ${errors.postalCode ? styles.inputError : ""}`}
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              value={form.postalCode}
              onChange={(event) =>
                onChange("postalCode", event.target.value.replace(/\D/g, ""))
              }
              onBlur={() => onZipBlur()}
              aria-invalid={Boolean(errors.postalCode)}
            />
          </Field>
          <Field id="city" label="City" error={errors.city}>
            <input
              id="city"
              className={`${styles.input} ${errors.city ? styles.inputError : ""}`}
              autoComplete="address-level2"
              value={form.city}
              onChange={(event) => onChange("city", event.target.value)}
            />
          </Field>
        </div>

        {areaCheck && (
          <p
            className={`${styles.statusNote} ${
              areaCheck === "validated"
                ? styles.statusValidated
                : styles.statusPending
            }`}
            role="status"
          >
            <span aria-hidden="true">
              {areaCheck === "validated" ? "✓" : "ℹ"}
            </span>
            {areaCheck === "validated"
              ? "Great news — that ZIP is in our confirmed service area."
              : areaCheck === "invalid"
                ? "That ZIP code doesn't look right. Please double-check it."
                : "We'll confirm your address is within our service area before scheduling."}
          </p>
        )}
        {checkingArea && <p className={styles.helpText}>Checking coverage…</p>}

        <Field
          id="addressLine1"
          label="Street address"
          error={errors.addressLine1}
        >
          <input
            id="addressLine1"
            ref={addressRef}
            className={`${styles.input} ${errors.addressLine1 ? styles.inputError : ""}`}
            autoComplete="off"
            placeholder="Start typing to search…"
            value={form.addressLine1}
            onChange={(event) => {
              onChange("addressLine1", event.target.value);
              if (verified) setVerified(null);
            }}
          />
          {verified && (
            <p
              className={`${styles.statusNote} ${styles.statusValidated}`}
              role="status"
            >
              <span aria-hidden="true">✓</span>
              {verified}
            </p>
          )}
        </Field>

        <div className={`${styles.fieldRow} ${styles.fieldRowTwo}`}>
          <Field id="addressLine2" label="Apt / unit" optional>
            <input
              id="addressLine2"
              className={styles.input}
              autoComplete="address-line2"
              value={form.addressLine2}
              onChange={(event) => onChange("addressLine2", event.target.value)}
            />
          </Field>
          <Field id="region" label="State" error={errors.region}>
            <input
              id="region"
              className={`${styles.input} ${errors.region ? styles.inputError : ""}`}
              autoComplete="address-level1"
              maxLength={2}
              placeholder="UT"
              value={form.region}
              onChange={(event) =>
                onChange("region", event.target.value.toUpperCase())
              }
            />
          </Field>
        </div>
      </fieldset>
    </>
  );
}

function StepSize({ form, errors, onChange }: StepProps) {
  return (
    <>
      <header className={styles.stepHeader}>
        <p className={styles.stepEyebrow}>Step 2 of 6</p>
        <h1 className={styles.stepTitle}>Choose your container</h1>
        <p className={styles.stepSummary}>
          Each rental includes a 5-day period and up to 3 tons of disposal.
        </p>
      </header>
      {errors.sizeKey && (
        <p className={styles.errorText} role="alert">
          {errors.sizeKey}
        </p>
      )}
      <div className={styles.sizeGrid}>
        {bookingSizeOptions.map((option) => {
          const selected = form.sizeKey === option.key;
          return (
            <button
              type="button"
              key={option.key}
              className={`${styles.sizeCard} ${selected ? styles.sizeCardSelected : ""}`}
              onClick={() => onChange("sizeKey", option.key)}
              aria-pressed={selected}
            >
              <div className={styles.sizeCardHead}>
                <div>
                  <p className={styles.sizeName}>
                    {option.size} — {option.use}
                  </p>
                  <p className={styles.sizeUse}>{option.dimensions}</p>
                </div>
                {option.price.type === "fixed" ? (
                  <span className={styles.sizePrice}>
                    {formatCents(option.price.amountCents)}
                  </span>
                ) : (
                  <span className={styles.sizePriceQuote}>
                    {option.price.label}
                  </span>
                )}
              </div>
              <ul className={styles.sizeRules}>
                {option.materialRules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      <p className={styles.helpText}>
        Prices shown are the base 5-day rate. Taxes and any delivery charge are
        confirmed before payment.
      </p>
    </>
  );
}

function StepSchedule({
  form,
  errors,
  onChange,
  availability,
}: StepProps & { availability: DeliveryAvailability }) {
  return (
    <>
      <header className={styles.stepHeader}>
        <p className={styles.stepEyebrow}>Step 3 of 6</p>
        <h1 className={styles.stepTitle}>When do you need it?</h1>
        <p className={styles.stepSummary}>
          Pick your preferred delivery date. Greyed-out days are unavailable.
        </p>
      </header>
      <fieldset className={styles.fieldset}>
        <DateCalendar
          minDate={availability.minDate}
          maxDate={availability.maxDate}
          unavailable={
            form.sizeKey ? (availability.bySizeKey[form.sizeKey] ?? []) : []
          }
          value={form.neededDate}
          onChange={(date) => onChange("neededDate", date)}
        />
        {errors.neededDate && (
          <p className={styles.errorText} role="alert">
            {errors.neededDate}
          </p>
        )}
        <p className={styles.helpText}>
          {form.neededDate
            ? `Selected: ${form.neededDate}. We'll confirm the exact delivery window.`
            : "Same-day and next-day availability depends on the schedule and is confirmed by our team."}
        </p>
      </fieldset>
    </>
  );
}

function StepContact({ form, errors, onChange }: StepProps) {
  return (
    <>
      <header className={styles.stepHeader}>
        <p className={styles.stepEyebrow}>Step 4 of 6</p>
        <h1 className={styles.stepTitle}>Your contact details</h1>
        <p className={styles.stepSummary}>
          We use these to confirm your booking and send delivery updates.
        </p>
      </header>
      <fieldset className={styles.fieldset}>
        <div className={`${styles.fieldRow} ${styles.fieldRowTwo}`}>
          <Field id="firstName" label="First name" error={errors.firstName}>
            <input
              id="firstName"
              className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
              autoComplete="given-name"
              value={form.firstName}
              onChange={(event) => onChange("firstName", event.target.value)}
            />
          </Field>
          <Field id="lastName" label="Last name" error={errors.lastName}>
            <input
              id="lastName"
              className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
              autoComplete="family-name"
              value={form.lastName}
              onChange={(event) => onChange("lastName", event.target.value)}
            />
          </Field>
        </div>
        <Field id="email" label="Email" error={errors.email}>
          <input
            id="email"
            type="email"
            className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
            autoComplete="email"
            value={form.email}
            onChange={(event) => onChange("email", event.target.value)}
          />
        </Field>
        <Field id="phone" label="Phone" error={errors.phone}>
          <input
            id="phone"
            type="tel"
            className={`${styles.input} ${errors.phone ? styles.inputError : ""}`}
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => onChange("phone", event.target.value)}
          />
        </Field>

        <div className={styles.checkRow}>
          <input
            id="emailUpdates"
            type="checkbox"
            checked={form.emailUpdates}
            onChange={(event) => onChange("emailUpdates", event.target.checked)}
          />
          <label className={styles.checkLabel} htmlFor="emailUpdates">
            <span className={styles.checkLabelTitle}>Email updates</span>
            <span className={styles.checkLabelText}>
              {TRANSACTIONAL_CONSENT_LANGUAGE}
            </span>
          </label>
        </div>
        <div className={styles.checkRow}>
          <input
            id="smsUpdates"
            type="checkbox"
            checked={form.smsUpdates}
            onChange={(event) => onChange("smsUpdates", event.target.checked)}
          />
          <label className={styles.checkLabel} htmlFor="smsUpdates">
            <span className={styles.checkLabelTitle}>Text (SMS) updates</span>
            <span className={styles.checkLabelText}>
              Get delivery and pickup reminders by text. Reply STOP to opt out at
              any time.
            </span>
          </label>
        </div>
      </fieldset>
    </>
  );
}

function StepPlacement({
  form,
  onChange,
}: Pick<StepProps, "form" | "onChange">) {
  return (
    <>
      <header className={styles.stepHeader}>
        <p className={styles.stepEyebrow}>Step 5 of 6</p>
        <h1 className={styles.stepTitle}>Where should it go?</h1>
        <p className={styles.stepSummary}>
          Tell us exactly where to place the dumpster on your property.
        </p>
      </header>
      <PlacementMap
        address={{
          line1: form.addressLine1,
          line2: form.addressLine2 || undefined,
          city: form.city,
          region: form.region,
          postalCode: form.postalCode,
        }}
        value={
          form.placementLatitude !== null && form.placementLongitude !== null
            ? { lat: form.placementLatitude, lng: form.placementLongitude }
            : null
        }
        onChange={(position) => {
          onChange("placementLatitude", position.lat);
          onChange("placementLongitude", position.lng);
        }}
      />
      <fieldset className={styles.fieldset} style={{ marginTop: "var(--space-4)" }}>
        <Field id="placementNotes" label="Placement instructions" optional>
          <textarea
            id="placementNotes"
            className={styles.textarea}
            placeholder="e.g. On the left side of the driveway, clear of the garage door and cars."
            value={form.placementNotes}
            onChange={(event) => onChange("placementNotes", event.target.value)}
          />
        </Field>
        <p className={styles.helpText}>
          Please note steep grades, soft ground, low branches, gates, or existing
          surface damage so we can protect your property.
        </p>
      </fieldset>
    </>
  );
}

function StepReview({ form, errors, onChange }: StepProps) {
  const option = form.sizeKey ? getBookingSizeOption(form.sizeKey) : null;

  return (
    <>
      <header className={styles.stepHeader}>
        <p className={styles.stepEyebrow}>Step 6 of 6</p>
        <h1 className={styles.stepTitle}>Review and confirm</h1>
        <p className={styles.stepSummary}>
          Check your details, then accept the load and weight terms.
        </p>
      </header>

      <dl className={styles.summaryList}>
        <div className={styles.summaryRow}>
          <dt className={styles.summaryTerm}>Delivery address</dt>
          <dd className={styles.summaryValue}>
            {form.addressLine1}
            {form.addressLine2 ? `, ${form.addressLine2}` : ""}, {form.city}{" "}
            {form.region} {form.postalCode}
          </dd>
        </div>
        <div className={styles.summaryRow}>
          <dt className={styles.summaryTerm}>Container</dt>
          <dd className={styles.summaryValue}>
            {option ? `${option.size} — ${option.use}` : "—"}
          </dd>
        </div>
        <div className={styles.summaryRow}>
          <dt className={styles.summaryTerm}>Delivery date</dt>
          <dd className={styles.summaryValue}>{form.neededDate || "—"}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt className={styles.summaryTerm}>Contact</dt>
          <dd className={styles.summaryValue}>
            {form.firstName} {form.lastName} · {form.email} · {form.phone}
          </dd>
        </div>
        {(form.placementNotes ||
          form.placementLatitude !== null) && (
          <div className={styles.summaryRow}>
            <dt className={styles.summaryTerm}>Placement</dt>
            <dd className={styles.summaryValue}>
              {form.placementNotes}
              {form.placementLatitude !== null &&
                form.placementLongitude !== null && (
                  <>
                    {form.placementNotes ? " · " : ""}
                    <span className={styles.summaryTerm}>
                      Pin {form.placementLatitude.toFixed(5)},{" "}
                      {form.placementLongitude.toFixed(5)}
                    </span>
                  </>
                )}
            </dd>
          </div>
        )}
      </dl>

      <div className={styles.priceCard}>
        <div className={styles.priceRow}>
          <span className={styles.summaryTerm}>Base rental (5 days, 3 tons)</span>
          {option && option.price.type === "fixed" ? (
            <span className={styles.priceAmount}>
              {formatCents(option.price.amountCents)}
            </span>
          ) : (
            <span className={styles.sizePriceQuote}>Priced after review</span>
          )}
        </div>
        <p className={styles.helpText} style={{ marginTop: "var(--space-2)" }}>
          Taxes and any delivery charge are confirmed before payment. Overweight
          loads are billed at $50 per ton after the included 3 tons.
        </p>
      </div>

      <div className={styles.agreementCard}>
        <h2 className={styles.agreementTitle}>Load and weight terms</h2>
        <ul className={styles.agreementTerms}>
          {PREPAYMENT_AGREEMENT_TERMS.map((term) => (
            <li key={term}>{term}</li>
          ))}
        </ul>
        <div className={styles.checkRow}>
          <input
            id="agreementAccepted"
            type="checkbox"
            checked={form.agreementAccepted}
            onChange={(event) =>
              onChange("agreementAccepted", event.target.checked)
            }
            aria-invalid={Boolean(errors.agreementAccepted)}
          />
          <label className={styles.checkLabel} htmlFor="agreementAccepted">
            <span className={styles.checkLabelTitle}>
              I understand and accept these terms.
            </span>
            <span className={styles.checkLabelText}>
              A full rental agreement copy will be emailed to you after payment.
            </span>
          </label>
        </div>
        {errors.agreementAccepted && (
          <p className={styles.errorText}>{errors.agreementAccepted}</p>
        )}
      </div>

      <div className={styles.payStub}>
        {option && option.price.type === "fixed" ? (
          <>
            <strong>Next: secure payment with Stripe.</strong>
            <span>
              You&apos;ll be taken to Stripe&apos;s secure checkout to pay the
              base rental and save a card for any documented overage charges.
              Taxes and delivery are confirmed by Barnes before your booking is
              finalized.
            </span>
          </>
        ) : (
          <>
            <strong>This size is priced by quote.</strong>
            <span>
              Submit your request and Barnes will follow up with the current rate
              for this container. No payment is collected now.
            </span>
          </>
        )}
      </div>
    </>
  );
}
