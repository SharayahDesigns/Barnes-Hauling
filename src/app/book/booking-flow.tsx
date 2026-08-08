"use client";

import { useEffect, useRef, useState } from "react";

import { formatCents } from "@/config/public-content";
import {
  checkPostalCodeAction,
  submitBookingDraft,
  submitCustomQuoteRequest,
} from "@/lib/booking/actions";
import { createBookingCheckout } from "@/lib/booking/checkout";
import { DUMPSTER_YARD_ADDRESS } from "@/lib/booking/delivery-zone";
import {
  getBookingSizeOption,
  PREPAYMENT_AGREEMENT_TERMS,
  resolveBookingPrice,
  SMS_UPDATES_ENABLED,
  TRANSACTIONAL_CONSENT_LANGUAGE,
  type BookingSizeOption,
} from "@/lib/booking/options";
import type { SizeKey } from "@/lib/booking/schema";
import type { DeliveryAvailability, PostalCodeCheck } from "@/lib/booking/types";
import { loadGoogleMaps } from "@/lib/maps/loader";

type SuggestedAddress = {
  formatted: string;
  addressLine1: string;
  city: string;
  region: string;
  postalCode: string;
  lat?: number;
  lng?: number;
};

type AddressModalState = {
  entered: string;
  suggestion: SuggestedAddress | null;
  loading: boolean;
};

type CustomQuoteFormState = {
  sizeKey: string;
  rentalDays: string;
  neededDate: string;
  postalCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  customerNote: string;
};

type CustomQuoteErrors = Partial<Record<keyof CustomQuoteFormState, string>>;

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
  rentalDays: number | null;
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
  rentalDays: null,
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
  if (step === "size" && (!form.rentalDays || form.rentalDays <= 0)) {
    errors.rentalDays = "Choose a rental duration.";
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

function splitMaterialRules(materialRules: readonly string[]) {
  const allowed: string[] = [];
  const notAllowed: string[] = [];

  for (const rule of materialRules) {
    const trimmed = rule.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("No ")) {
      notAllowed.push(trimmed.slice(3).trim());
      continue;
    }
    allowed.push(trimmed);
  }

  return { allowed, notAllowed };
}

function formatEnteredAddress(form: FormState): string {
  return [
    form.addressLine1.trim(),
    form.addressLine2.trim(),
    [form.city.trim(), form.region.trim()].filter(Boolean).join(", "),
    form.postalCode.trim(),
  ]
    .filter(Boolean)
    .join(", ");
}

async function geocodeAddress(query: string): Promise<SuggestedAddress | null> {
  if (!MAPS_API_KEY) return null;
  try {
    const maps = await loadGoogleMaps(MAPS_API_KEY);
    const geocoder = new maps.maps.Geocoder();
    const { results } = await geocoder.geocode({
      address: query,
      componentRestrictions: { country: "us" },
    });
    const best = results?.[0];
    if (!best) return null;

    const part = (type: string, short = false) => {
      const found = best.address_components.find((component) =>
        component.types.includes(type),
      );
      return found ? (short ? found.short_name : found.long_name) : "";
    };

    const line1 = [part("street_number"), part("route")]
      .filter(Boolean)
      .join(" ");
    const location = best.geometry?.location;

    return {
      formatted: best.formatted_address ?? query,
      addressLine1: line1,
      city: part("locality") || part("sublocality") || part("postal_town"),
      region: part("administrative_area_level_1", true),
      postalCode: part("postal_code"),
      lat: location?.lat(),
      lng: location?.lng(),
    };
  } catch {
    return null;
  }
}

export function BookingFlow({
  availability,
  sizeOptions,
}: Readonly<{
  availability: DeliveryAvailability;
  sizeOptions: readonly BookingSizeOption[];
}>) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [addressModal, setAddressModal] = useState<AddressModalState | null>(
    null,
  );
  const [customQuoteOpen, setCustomQuoteOpen] = useState(false);
  const [customQuoteForm, setCustomQuoteForm] = useState<CustomQuoteFormState>({
    sizeKey: "",
    rentalDays: "",
    neededDate: "",
    postalCode: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    customerNote: "",
  });
  const [customQuoteErrors, setCustomQuoteErrors] = useState<CustomQuoteErrors>({});
  const [customQuoteError, setCustomQuoteError] = useState<string | null>(null);
  const [customQuoteSubmitting, setCustomQuoteSubmitting] = useState(false);
  const [areaCheck, setAreaCheck] = useState<PostalCodeCheck | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    referenceNumber: number;
    serviceAreaConfirmed: boolean;
    kind: "booking" | "quote";
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

  const selectedOption = form.sizeKey
    ? getBookingSizeOption(sizeOptions, form.sizeKey)
    : null;
  const selectedRentalDays =
    selectedOption && form.rentalDays && form.rentalDays > 0
      ? form.rentalDays
      : selectedOption?.rentalDayOptions[0] ?? null;
  const deliverySurchargeCents = areaCheck?.surchargeCents ?? 0;
  const resolvedPrice =
    selectedOption && selectedRentalDays
      ? resolveBookingPrice(selectedOption, selectedRentalDays)
      : selectedOption?.price ?? null;
  const fixedPriceTotalCents =
    resolvedPrice?.type === "fixed"
      ? resolvedPrice.amountCents + deliverySurchargeCents
      : null;
  const reviewButtonLabel =
    resolvedPrice?.type === "fixed"
      ? `Continue to secure payment for ${formatCents(
          fixedPriceTotalCents ?? resolvedPrice.amountCents,
        )}`
      : "Submit quote request";

  function seedCustomQuoteForm(): CustomQuoteFormState {
    return {
      sizeKey: form.sizeKey || sizeOptions[0]?.key || "",
      rentalDays: selectedRentalDays ? String(selectedRentalDays) : "",
      neededDate: form.neededDate || availability.minDate || todayIsoDate(),
      postalCode: form.postalCode,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      customerNote: "",
    };
  }

  function openCustomQuote() {
    setCustomQuoteForm(seedCustomQuoteForm());
    setCustomQuoteErrors({});
    setCustomQuoteError(null);
    setCustomQuoteOpen(true);
  }

  function closeCustomQuote() {
    if (customQuoteSubmitting) return;
    setCustomQuoteOpen(false);
  }

  function updateCustomQuote<K extends keyof CustomQuoteFormState>(
    key: K,
    value: CustomQuoteFormState[K],
  ) {
    setCustomQuoteForm((prev) => ({ ...prev, [key]: value }));
    if (customQuoteErrors[key]) {
      setCustomQuoteErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (
      key === "postalCode" ||
      key === "addressLine1" ||
      key === "city" ||
      key === "region" ||
      key === "placementLatitude" ||
      key === "placementLongitude"
    ) {
      setAreaCheck(null);
    }
  }

  async function resolveAreaCheck(input: {
    postalCode: string;
    placementLatitude: number | null;
    placementLongitude: number | null;
  }): Promise<PostalCodeCheck | null> {
    if (!/^\d{5}$/.test(input.postalCode.trim())) {
      return { status: "invalid" };
    }

    return checkPostalCodeAction({
      postalCode: input.postalCode.trim(),
      latitude: input.placementLatitude,
      longitude: input.placementLongitude,
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (
        !/^\d{5}$/.test(form.postalCode.trim()) ||
        form.placementLatitude == null ||
        form.placementLongitude == null
      ) {
        return;
      }

      try {
        const result = await resolveAreaCheck({
      postalCode: form.postalCode,
      placementLatitude: form.placementLatitude,
      placementLongitude: form.placementLongitude,
        });
        if (!cancelled) setAreaCheck(result);
      } catch {
        if (!cancelled) setAreaCheck(null);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [form.postalCode, form.placementLatitude, form.placementLongitude]);

  function advance() {
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  }

  async function goNext() {
    const stepErrors = validateStep(step.id, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setFormError(null);

    // On the address step, confirm the address (and offer a Google-standardized
    // suggestion) before moving on, instead of gating on the service-area DB.
    // If the address was already chosen from Google autocomplete (coordinates
    // are set), it's verified — skip the confirmation popup.
    if (step.id === "area") {
      if (form.placementLatitude != null && form.placementLongitude != null) {
        advance();
        return;
      }
      const entered = formatEnteredAddress(form);
      setAddressModal({ entered, suggestion: null, loading: true });
      const suggestion = await geocodeAddress(entered);
      setAddressModal((current) =>
        current ? { ...current, suggestion, loading: false } : current,
      );
      return;
    }

    advance();
  }

  async function confirmEnteredAddress() {
    const nextForm = { ...form };
    if (
      nextForm.placementLatitude == null &&
      nextForm.placementLongitude == null &&
      addressModal?.suggestion?.lat != null &&
      addressModal.suggestion.lng != null
    ) {
      nextForm.placementLatitude = addressModal.suggestion.lat;
      nextForm.placementLongitude = addressModal.suggestion.lng;
      update("placementLatitude", addressModal.suggestion.lat);
      update("placementLongitude", addressModal.suggestion.lng);
    }

    const result = await resolveAreaCheck({
      postalCode: nextForm.postalCode,
      placementLatitude: nextForm.placementLatitude,
      placementLongitude: nextForm.placementLongitude,
    });
    setAreaCheck(result);
    setAddressModal(null);
    if (result?.status === "out_of_range") {
      setFormError(
        `This address is ${result.distanceMiles?.toFixed(1)} miles from ${DUMPSTER_YARD_ADDRESS}. Online booking currently supports deliveries up to ${result.maxMiles} miles.`,
      );
      return;
    }
    advance();
  }

  async function confirmSuggestedAddress(suggestion: SuggestedAddress) {
    const nextForm = {
      ...form,
      addressLine1: suggestion.addressLine1 || form.addressLine1,
      city: suggestion.city || form.city,
      region: suggestion.region || form.region,
      postalCode: suggestion.postalCode || form.postalCode,
      placementLatitude: suggestion.lat ?? form.placementLatitude,
      placementLongitude: suggestion.lng ?? form.placementLongitude,
    };

    if (suggestion.addressLine1) update("addressLine1", suggestion.addressLine1);
    if (suggestion.city) update("city", suggestion.city);
    if (suggestion.region) update("region", suggestion.region);
    if (suggestion.postalCode) update("postalCode", suggestion.postalCode);
    if (suggestion.lat != null) update("placementLatitude", suggestion.lat);
    if (suggestion.lng != null) update("placementLongitude", suggestion.lng);

    const result = await resolveAreaCheck({
      postalCode: nextForm.postalCode,
      placementLatitude: nextForm.placementLatitude,
      placementLongitude: nextForm.placementLongitude,
    });
    setAreaCheck(result);
    setAddressModal(null);
    if (result?.status === "out_of_range") {
      setFormError(
        `This address is ${result.distanceMiles?.toFixed(1)} miles from ${DUMPSTER_YARD_ADDRESS}. Online booking currently supports deliveries up to ${result.maxMiles} miles.`,
      );
      return;
    }
    advance();
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
    if (areaCheck?.status === "out_of_range") {
      setFormError(
        `This address is outside the current ${areaCheck.maxMiles}-mile delivery range from ${DUMPSTER_YARD_ADDRESS}.`,
      );
      return;
    }
    setSubmitting(true);
    setFormError(null);

    const payload = new FormData();
    payload.set("postalCode", form.postalCode.trim());
    payload.set("addressLine1", form.addressLine1.trim());
    payload.set("addressLine2", form.addressLine2.trim());
    payload.set("city", form.city.trim());
    payload.set("region", form.region.trim());
    payload.set("sizeKey", form.sizeKey);
    if (selectedRentalDays) {
      payload.set("rentalDays", String(selectedRentalDays));
    }
    payload.set("neededDate", form.neededDate);
    payload.set("firstName", form.firstName.trim());
    payload.set("lastName", form.lastName.trim());
    payload.set("email", form.email.trim());
    payload.set("phone", form.phone.trim());
    payload.set("emailUpdates", String(form.emailUpdates));
    payload.set("smsUpdates", String(form.smsUpdates));
    payload.set("placementNotes", form.placementNotes.trim());
    if (form.placementLatitude !== null) {
      payload.set("placementLatitude", String(form.placementLatitude));
    }
    if (form.placementLongitude !== null) {
      payload.set("placementLongitude", String(form.placementLongitude));
    }
    payload.set("agreementAccepted", String(form.agreementAccepted));

    const option = form.sizeKey
      ? getBookingSizeOption(sizeOptions, form.sizeKey)
      : null;

    try {
      // Fixed-price sizes continue into hosted Stripe Checkout.
      if (option?.price.type === "fixed") {
        const result = await createBookingCheckout(payload);
        if (!result.ok) {
          setFormError(result.error);
          if (result.fieldErrors) setErrors(result.fieldErrors as Errors);
          return;
        }
        window.sessionStorage.removeItem(STORAGE_KEY);
        window.location.assign(result.checkoutUrl);
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
        referenceNumber: result.quoteNumber,
        serviceAreaConfirmed: result.serviceAreaConfirmed,
        kind: "quote",
      });
    } catch {
      setFormError("Something went wrong. Please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCustomQuoteSubmit() {
    setCustomQuoteSubmitting(true);
    setCustomQuoteError(null);
    setCustomQuoteErrors({});

    const payload = new FormData();
    payload.set("postalCode", customQuoteForm.postalCode.trim());
    payload.set("addressLine1", form.addressLine1.trim());
    payload.set("addressLine2", form.addressLine2.trim());
    payload.set("city", form.city.trim());
    payload.set("region", form.region.trim());
    payload.set("sizeKey", customQuoteForm.sizeKey);
    payload.set("rentalDays", customQuoteForm.rentalDays.trim());
    payload.set("neededDate", customQuoteForm.neededDate);
    payload.set("firstName", customQuoteForm.firstName.trim());
    payload.set("lastName", customQuoteForm.lastName.trim());
    payload.set("email", customQuoteForm.email.trim());
    payload.set("phone", customQuoteForm.phone.trim());
    payload.set("customerNote", customQuoteForm.customerNote.trim());
    if (form.placementLatitude !== null) {
      payload.set("placementLatitude", String(form.placementLatitude));
    }
    if (form.placementLongitude !== null) {
      payload.set("placementLongitude", String(form.placementLongitude));
    }

    try {
      const result = await submitCustomQuoteRequest(payload);
      if (!result.ok) {
        setCustomQuoteError(result.error);
        if (result.fieldErrors) {
          setCustomQuoteErrors(result.fieldErrors as CustomQuoteErrors);
        }
        return;
      }

      window.sessionStorage.removeItem(STORAGE_KEY);
      setCustomQuoteOpen(false);
      setConfirmation({
        referenceNumber: result.quoteNumber,
        serviceAreaConfirmed: result.serviceAreaConfirmed,
        kind: "quote",
      });
    } catch {
      setCustomQuoteError("Something went wrong. Please retry.");
    } finally {
      setCustomQuoteSubmitting(false);
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
              {confirmation.kind === "booking" ? "Booking" : "Reference"} #
              {confirmation.referenceNumber}
            </p>
            <p className={styles.stepSummary}>
              {confirmation.kind === "booking"
                ? `We saved your dumpster booking${
                    confirmation.serviceAreaConfirmed
                      ? " and routed it into the admin queue for staff review."
                      : " and flagged the address for service-area review before staff finalize it."
                  }`
                : `We received your dumpster quote request. Barnes will review it within 24 hours and contact you${
                    confirmation.serviceAreaConfirmed
                      ? " to confirm your delivery date and pricing."
                      : " after confirming your address is within our service area."
                  }`}
            </p>
            <p className={styles.helpText}>
              {confirmation.kind === "booking"
                ? "Please check your email for a confirmation and receipt with your request details. If it&apos;s not in your inbox, check your spam folder."
                : "A Barnes team member will follow up using the contact information you provided."}
            </p>
            {confirmation.kind === "booking" ? (
              <p className={styles.helpText}>
                Test mode is on. No card was charged, but the booking was
                created so you can test scheduling, assignment, and admin
                workflows.
              </p>
            ) : null}
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
          {step.id === "area" && (
            <StepArea
              form={form}
              errors={errors}
              onChange={update}
              areaCheck={areaCheck}
            />
          )}
          {step.id === "size" && (
            <StepSize
              form={form}
              errors={errors}
              onChange={update}
              areaCheck={areaCheck}
              sizeOptions={sizeOptions}
              onOpenCustomQuote={openCustomQuote}
            />
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
            <StepReview
              form={form}
              errors={errors}
              onChange={update}
              areaCheck={areaCheck}
              sizeOptions={sizeOptions}
            />
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
              <div className={styles.submitGroup}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleSubmit}
                  disabled={submitting || !form.agreementAccepted}
                  aria-describedby={
                    !form.agreementAccepted && !submitting
                      ? "agreementGate"
                      : undefined
                  }
                >
                  {submitting ? "Working…" : reviewButtonLabel}
                </button>
                {/* A disabled button with no explanation reads as a broken
                    page, so always say what is blocking it. */}
                {!form.agreementAccepted && !submitting && (
                  <p id="agreementGate" className={styles.submitHint}>
                    Accept the load and weight terms above to continue.
                  </p>
                )}
              </div>
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

      {addressModal && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="address-modal-title"
        >
          <div className={styles.modalCard}>
            <h2 id="address-modal-title" className={styles.modalTitle}>
              Confirm your delivery address
            </h2>

            {addressModal.loading ? (
              <p className={styles.helpText}>Checking your address…</p>
            ) : (
              <>
                <div className={styles.addressOption}>
                  <p className={styles.addressOptionLabel}>You entered</p>
                  <p className={styles.addressOptionValue}>
                    {addressModal.entered}
                  </p>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={confirmEnteredAddress}
                  >
                    Use this address
                  </button>
                </div>

                {addressModal.suggestion &&
                addressModal.suggestion.formatted !== addressModal.entered ? (
                  <div className={styles.addressOption}>
                    <p className={styles.addressOptionLabel}>
                      Suggested by Google
                    </p>
                    <p className={styles.addressOptionValue}>
                      {addressModal.suggestion.formatted}
                    </p>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() =>
                        confirmSuggestedAddress(addressModal.suggestion!)
                      }
                    >
                      Use suggested address
                    </button>
                  </div>
                ) : null}
              </>
            )}

            <button
              type="button"
              className={styles.modalDismiss}
              onClick={() => setAddressModal(null)}
            >
              Edit address
            </button>
          </div>
        </div>
      )}

      {customQuoteOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-quote-title"
        >
          <div className={`${styles.modalCard} ${styles.customQuoteModalCard}`}>
            <h2 id="custom-quote-title" className={styles.modalTitle}>
              Get a custom dumpster quote
            </h2>
            <p className={styles.helpText}>
              Use this for a custom rental length or a longer project. No payment is
              collected here.
            </p>
            <div className={styles.addressOption}>
              <p className={styles.addressOptionLabel}>Using delivery address</p>
              <p className={styles.addressOptionValue}>
                {formatEnteredAddress(form)}
              </p>
            </div>

            {customQuoteError ? (
              <p className={styles.formError} role="alert">
                {customQuoteError}
              </p>
            ) : null}

            <div className={styles.customQuoteFormGrid}>
              <Field
                id="custom-size"
                label="Dumpster"
                error={customQuoteErrors.sizeKey}
              >
                <select
                  id="custom-size"
                  className={`${styles.select} ${customQuoteErrors.sizeKey ? styles.inputError : ""}`}
                  value={customQuoteForm.sizeKey}
                  onChange={(event) => updateCustomQuote("sizeKey", event.target.value)}
                  aria-invalid={Boolean(customQuoteErrors.sizeKey)}
                >
                  <option value="" disabled>
                    Choose a dumpster
                  </option>
                  {sizeOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.size} — {option.use}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                id="custom-rental-days"
                label="How many days?"
                error={customQuoteErrors.rentalDays}
              >
                <input
                  id="custom-rental-days"
                  type="number"
                  min="1"
                  className={`${styles.input} ${customQuoteErrors.rentalDays ? styles.inputError : ""}`}
                  value={customQuoteForm.rentalDays}
                  onChange={(event) => updateCustomQuote("rentalDays", event.target.value)}
                  aria-invalid={Boolean(customQuoteErrors.rentalDays)}
                />
              </Field>

              <Field
                id="custom-needed-date"
                label="What day do you want it?"
                error={customQuoteErrors.neededDate}
              >
                <input
                  id="custom-needed-date"
                  type="date"
                  min={availability.minDate}
                  className={`${styles.input} ${customQuoteErrors.neededDate ? styles.inputError : ""}`}
                  value={customQuoteForm.neededDate}
                  onChange={(event) => updateCustomQuote("neededDate", event.target.value)}
                  aria-invalid={Boolean(customQuoteErrors.neededDate)}
                />
              </Field>

              <Field
                id="custom-postal-code"
                label="ZIP code"
                error={customQuoteErrors.postalCode}
              >
                <input
                  id="custom-postal-code"
                  inputMode="numeric"
                  maxLength={5}
                  className={`${styles.input} ${customQuoteErrors.postalCode ? styles.inputError : ""}`}
                  value={customQuoteForm.postalCode}
                  onChange={(event) =>
                    updateCustomQuote(
                      "postalCode",
                      event.target.value.replace(/\D/g, "").slice(0, 5),
                    )
                  }
                  aria-invalid={Boolean(customQuoteErrors.postalCode)}
                />
              </Field>

              <Field
                id="custom-first-name"
                label="First name"
                error={customQuoteErrors.firstName}
              >
                <input
                  id="custom-first-name"
                  className={`${styles.input} ${customQuoteErrors.firstName ? styles.inputError : ""}`}
                  value={customQuoteForm.firstName}
                  onChange={(event) => updateCustomQuote("firstName", event.target.value)}
                  aria-invalid={Boolean(customQuoteErrors.firstName)}
                />
              </Field>

              <Field
                id="custom-last-name"
                label="Last name"
                error={customQuoteErrors.lastName}
              >
                <input
                  id="custom-last-name"
                  className={`${styles.input} ${customQuoteErrors.lastName ? styles.inputError : ""}`}
                  value={customQuoteForm.lastName}
                  onChange={(event) => updateCustomQuote("lastName", event.target.value)}
                  aria-invalid={Boolean(customQuoteErrors.lastName)}
                />
              </Field>

              <Field
                id="custom-email"
                label="Email"
                error={customQuoteErrors.email}
              >
                <input
                  id="custom-email"
                  type="email"
                  className={`${styles.input} ${customQuoteErrors.email ? styles.inputError : ""}`}
                  value={customQuoteForm.email}
                  onChange={(event) => updateCustomQuote("email", event.target.value)}
                  aria-invalid={Boolean(customQuoteErrors.email)}
                />
              </Field>

              <Field
                id="custom-phone"
                label="Phone"
                error={customQuoteErrors.phone}
              >
                <input
                  id="custom-phone"
                  type="tel"
                  className={`${styles.input} ${customQuoteErrors.phone ? styles.inputError : ""}`}
                  value={customQuoteForm.phone}
                  onChange={(event) => updateCustomQuote("phone", event.target.value)}
                  aria-invalid={Boolean(customQuoteErrors.phone)}
                />
              </Field>

              <div className={styles.customQuoteFullWidth}>
                <Field
                  id="custom-note"
                  label="Anything else we should know?"
                  optional
                >
                  <textarea
                    id="custom-note"
                    className={styles.textarea}
                    rows={4}
                    value={customQuoteForm.customerNote}
                    onChange={(event) =>
                      updateCustomQuote("customerNote", event.target.value)
                    }
                  />
                </Field>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={closeCustomQuote}
                disabled={customQuoteSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleCustomQuoteSubmit}
                disabled={customQuoteSubmitting}
              >
                {customQuoteSubmitting ? "Sending…" : "Send custom quote request"}
              </button>
            </div>

            <button
              type="button"
              className={styles.modalDismiss}
              onClick={closeCustomQuote}
            >
              Back to booking options
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type StepProps = {
  form: FormState;
  errors: Errors;
  onChange: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

function areaCheckTone(status: PostalCodeCheck["status"] | undefined): string {
  if (status === "validated" || status === "extended") {
    return styles.statusValidated;
  }
  if (status === "out_of_range" || status === "invalid") {
    return styles.statusInvalid;
  }
  return styles.statusPending;
}

function areaCheckMessage(areaCheck: PostalCodeCheck | null): string | null {
  if (!areaCheck) return null;

  if (areaCheck.status === "validated") {
    return `Within the included ${areaCheck.includedMiles}-mile delivery area from ${DUMPSTER_YARD_ADDRESS}.`;
  }

  if (areaCheck.status === "extended") {
    return `${areaCheck.distanceMiles?.toFixed(1)} miles from the yard. Delivery surcharge: ${formatCents(areaCheck.surchargeCents ?? 0)}.`;
  }

  if (areaCheck.status === "out_of_range") {
    return `${areaCheck.distanceMiles?.toFixed(1)} miles from the yard. Online booking currently supports deliveries up to ${areaCheck.maxMiles} miles.`;
  }

  if (areaCheck.status === "invalid") {
    return "That ZIP code doesn't look right. Please double-check it.";
  }

  return "We couldn't verify the delivery distance automatically yet. You can continue and staff can review it if needed.";
}

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
  onChange,
  areaCheck,
}: StepProps & { areaCheck: PostalCodeCheck | null }) {
  const addressRef = useRef<HTMLInputElement>(null);
  const [verified, setVerified] = useState<string | null>(null);

  // Keep the latest callback without re-attaching the autocomplete each render.
  const callbacks = useRef({ onChange });
  useEffect(() => {
    callbacks.current = { onChange };
  }, [onChange]);

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

          const { onChange: change } = callbacks.current;
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
          Enter the delivery address so we can confirm mileage and any delivery surcharge.
        </p>
      </header>
      <fieldset className={styles.fieldset}>
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

        {areaCheckMessage(areaCheck) ? (
          <p
            className={`${styles.statusNote} ${areaCheckTone(areaCheck?.status)}`}
            role="status"
          >
            <span aria-hidden="true">
              {areaCheck?.status === "validated" || areaCheck?.status === "extended"
                ? "✓"
                : areaCheck?.status === "out_of_range" || areaCheck?.status === "invalid"
                  ? "!"
                  : "ℹ"}
            </span>
            {areaCheckMessage(areaCheck)}
          </p>
        ) : null}

      </fieldset>
    </>
  );
}

function StepSize({
  form,
  errors,
  onChange,
  areaCheck,
  sizeOptions,
  onOpenCustomQuote,
}: StepProps & {
  areaCheck: PostalCodeCheck | null;
  sizeOptions: readonly BookingSizeOption[];
  onOpenCustomQuote: () => void;
}) {
  const surchargeCents = areaCheck?.surchargeCents ?? 0;
  const selectedOption = form.sizeKey
    ? getBookingSizeOption(sizeOptions, form.sizeKey)
    : null;

  return (
    <>
      <header className={styles.stepHeader}>
        <p className={styles.stepEyebrow}>Step 2 of 6</p>
        <h1 className={styles.stepTitle}>Choose your container</h1>
        <p className={styles.stepSummary}>
          Choose your container and rental duration. Included weight depends on the container and approved material type.
        </p>
      </header>
      {errors.sizeKey && (
        <p className={styles.errorText} role="alert">
          {errors.sizeKey}
        </p>
      )}
      <div className={styles.sizeGrid}>
        {sizeOptions.map((option) => {
          const selected = form.sizeKey === option.key;
          const { allowed, notAllowed } = splitMaterialRules(option.materialRules);
          const optionRentalDays =
            option.rentalDayOptions.includes(form.rentalDays ?? -1)
              ? (form.rentalDays as number)
              : (option.rentalDayOptions[0] ?? option.rentalDays);
          const optionPrice = resolveBookingPrice(option, optionRentalDays);
          return (
            <button
              type="button"
              key={option.key}
              className={`${styles.sizeCard} ${selected ? styles.sizeCardSelected : ""}`}
              onClick={() => {
                onChange("sizeKey", option.key);
                onChange(
                  "rentalDays",
                  option.rentalDayOptions.includes(form.rentalDays ?? -1)
                    ? (form.rentalDays as number)
                    : (option.rentalDayOptions[0] ?? option.rentalDays),
                );
              }}
              aria-pressed={selected}
            >
              {option.image ? (
                <div className={styles.sizeMediaWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={option.image}
                    alt={`${option.size} dumpster`}
                    className={styles.sizeMedia}
                  />
                </div>
              ) : null}
              <div className={styles.sizeDetails}>
                <div className={styles.sizeCardHead}>
                  <div className={styles.sizeTitleBlock}>
                    <p className={styles.sizeName}>
                      {option.size} — {option.use}
                    </p>
                    <p className={styles.sizeUse}>{option.dimensions}</p>
                  </div>
                  {optionPrice.type === "fixed" ? (
                    <div className={styles.sizePriceBlock}>
                      <span className={styles.sizePrice}>
                        {formatCents(optionPrice.amountCents + surchargeCents)}
                      </span>
                      {surchargeCents > 0 ? (
                        <span className={styles.sizePriceDetail}>
                          Includes {formatCents(surchargeCents)} delivery distance
                        </span>
                      ) : areaCheck?.status === "validated" ? (
                        <span className={styles.sizePriceDetail}>
                          Delivery included within 20 miles
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className={styles.sizePriceQuote}>
                      {optionPrice.label}
                    </span>
                  )}
                </div>
                <div className={styles.sizeMeta}>
                  <span className={`${styles.sizeMetaPill} ${styles.sizeMetaPillWeight}`}>
                    {option.includedWeightLabel}
                  </span>
                  <span className={styles.sizeMetaPill}>
                    {option.rentalDayOptions.map((days) => `${days}-day`).join(", ")}
                  </span>
                </div>
                <div className={styles.sizeRuleGroups}>
                  {allowed.length > 0 ? (
                    <div className={styles.sizeRuleGroup}>
                      <span className={styles.sizeRuleLabel}>Allowed</span>
                      <div className={styles.sizeRuleChips}>
                        {allowed.map((rule) => (
                          <span key={rule} className={styles.sizeRuleChip}>
                            {rule}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {notAllowed.length > 0 ? (
                    <div className={styles.sizeRuleGroup}>
                      <span
                        className={`${styles.sizeRuleLabel} ${styles.sizeRuleLabelDanger}`}
                      >
                        Not allowed
                      </span>
                      <div className={styles.sizeRuleChips}>
                        {notAllowed.map((rule) => (
                          <span
                            key={rule}
                            className={`${styles.sizeRuleChip} ${styles.sizeRuleChipDanger}`}
                          >
                            {rule}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {selectedOption ? (
        <fieldset className={styles.fieldset} style={{ marginTop: "var(--space-4)" }}>
          <Field id="rentalDays" label="Rental duration" error={errors.rentalDays}>
            <select
              id="rentalDays"
              className={`${styles.select} ${errors.rentalDays ? styles.inputError : ""}`}
              value={form.rentalDays ?? ""}
              onChange={(event) => onChange("rentalDays", Number(event.target.value))}
              aria-invalid={Boolean(errors.rentalDays)}
            >
              <option value="" disabled>
                Choose rental duration
              </option>
              {selectedOption.rentalDayOptions.map((days) => (
                <option key={days} value={days}>
                  {days} day{days === 1 ? "" : "s"}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>
      ) : null}
      <p className={styles.helpText}>
        {areaCheck?.status === "extended"
          ? `Prices below include the extra distance charge for this address: ${areaCheck.distanceMiles?.toFixed(1)} miles from the yard, with ${formatCents(areaCheck.surchargeCents ?? 0)} added for the excess miles beyond the 20-mile included area.`
          : areaCheck?.status === "validated"
            ? "Prices below include delivery inside the standard 20-mile service area. Taxes are confirmed before payment."
            : "Prices shown are the base rental rate for the selected duration. Taxes and any delivery charge are confirmed once your address is verified."}
      </p>
      <div className={styles.customQuoteCallout}>
        <div className={styles.customQuoteCalloutBody}>
          <p className={styles.customQuoteEyebrow}>Need a longer rental?</p>
          <h2 className={styles.customQuoteTitle}>Get a custom quote</h2>
          <p className={styles.customQuoteText}>
            Request a custom number of rental days or a longer project timeline and
            Barnes will review pricing and availability.
          </p>
        </div>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onOpenCustomQuote}
        >
          Get custom quote
        </button>
      </div>
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
        {SMS_UPDATES_ENABLED ? (
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
                Get delivery and pickup reminders by text. Reply STOP to opt out
                at any time.
              </span>
            </label>
          </div>
        ) : null}
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

function StepReview({
  form,
  errors,
  onChange,
  areaCheck,
  sizeOptions,
}: StepProps & {
  areaCheck: PostalCodeCheck | null;
  sizeOptions: readonly BookingSizeOption[];
}) {
  const option = form.sizeKey ? getBookingSizeOption(sizeOptions, form.sizeKey) : null;
  const rentalDays =
    option && form.rentalDays && form.rentalDays > 0
      ? form.rentalDays
      : option?.rentalDayOptions[0] ?? null;
  const surchargeCents = areaCheck?.surchargeCents ?? 0;
  const resolvedPrice =
    option && rentalDays ? resolveBookingPrice(option, rentalDays) : option?.price ?? null;
  const totalCents =
    resolvedPrice?.type === "fixed"
      ? resolvedPrice.amountCents + surchargeCents
      : null;

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
          <dt className={styles.summaryTerm}>Rental duration</dt>
          <dd className={styles.summaryValue}>
            {rentalDays ? `${rentalDays} day${rentalDays === 1 ? "" : "s"}` : "—"}
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
        {(form.placementNotes || form.placementLatitude !== null) && (
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
          <span className={styles.summaryTerm}>
            Base rental ({rentalDays ?? option?.rentalDays ?? 0} day{(rentalDays ?? option?.rentalDays ?? 0) === 1 ? "" : "s"}{option ? `, ${option.includedWeightLabel.toLowerCase()}` : ""})
          </span>
          {resolvedPrice?.type === "fixed" ? (
            <span className={styles.priceAmount}>
              {formatCents(resolvedPrice.amountCents)}
            </span>
          ) : (
            <span className={styles.sizePriceQuote}>Priced after review</span>
          )}
        </div>
        {resolvedPrice?.type === "fixed" && areaCheck && areaCheck.surchargeCents ? (
          <>
            <div className={styles.priceRow}>
              <span className={styles.summaryTerm}>
                Extended delivery charge
              </span>
              <span className={styles.priceAmount}>
                {formatCents(areaCheck.surchargeCents)}
              </span>
            </div>
            <div className={styles.priceRow}>
              <span className={styles.summaryTerm}>Estimated total before tax</span>
              <span className={styles.priceAmount}>
                {formatCents(totalCents ?? resolvedPrice.amountCents)}
              </span>
            </div>
          </>
        ) : null}
        <p className={styles.helpText} style={{ marginTop: "var(--space-2)" }}>
          {areaCheck?.status === "validated"
            ? `Delivery is included inside the standard ${areaCheck.includedMiles}-mile area from ${DUMPSTER_YARD_ADDRESS}.`
            : areaCheck?.status === "extended"
              ? `This address is ${areaCheck.distanceMiles?.toFixed(1)} miles from the yard, so ${formatCents(areaCheck.surchargeCents ?? 0)} has been added for the excess miles beyond ${areaCheck.includedMiles} miles.`
              : "Taxes and any delivery charge are confirmed before payment. Residential overage is billed at $50 per ton above the included weight allowance."}
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
        {resolvedPrice?.type === "fixed" ? (
          <>
            <strong>Next: pay in Stripe Checkout.</strong>
            <span>
              You&apos;ll review the total, pay securely, and authorize Barnes
              to save your payment method for later documented overage charges
              described in the rental terms.
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
