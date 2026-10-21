"use client";

import { useEffect, useRef, useState } from "react";

import { businessConfig, isConfirmedBusinessFact } from "@/config/business";
import { formatCents } from "@/config/public-content";
import {
  checkPostalCodeAction,
  submitBookingDraft,
  submitCustomQuoteRequest,
} from "@/lib/booking/actions";
import { createBookingCheckout } from "@/lib/booking/checkout";
import { DUMPSTER_YARD_ADDRESS } from "@/lib/booking/delivery-zone";
import { rentalPickupDate, rentalWindowConflict } from "@/lib/booking/rental-window";
import {
  getBookingSizeOption,
  PREPAYMENT_AGREEMENT_TERMS,
  resolveBookingPrice,
  SMS_UPDATES_ENABLED,
  TRANSACTIONAL_CONSENT_LANGUAGE,
  type BookingPreselection,
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
import {
  BOOKING_DRAFT_KEY,
  clearBookingDraft,
  LEGACY_BOOKING_DRAFT_KEY,
} from "./draft-storage";
import { PlacementMap } from "./placement-map";

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type StepId = "size" | "load" | "schedule" | "area" | "contact" | "review";

// Ordered to keep customers moving: start with the dumpster (often already
// picked on the home page), show availability next, and ask for the address
// and contact details only once they're invested. "load" is skipped
// automatically when the chosen size has a single option.
const STEPS: ReadonlyArray<{ id: StepId; label: string }> = [
  { id: "size", label: "Dumpster size" },
  { id: "load", label: "What's going in" },
  { id: "schedule", label: "Delivery date" },
  { id: "area", label: "Address" },
  { id: "contact", label: "Your details" },
  { id: "review", label: "Review & pay" },
];

function stepIndexOf(id: StepId): number {
  return STEPS.findIndex((item) => item.id === id);
}

function stepEyebrow(id: StepId): string {
  return `Step ${stepIndexOf(id) + 1} of ${STEPS.length}`;
}

type FormState = {
  postalCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  /** Chosen size (sizeGroupKey); the option within it is sizeKey. */
  sizeGroupKey: string;
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
  sizeGroupKey: "",
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

  if (step === "size" && !form.sizeGroupKey) {
    errors.sizeKey = "Choose a dumpster size.";
  }
  if (step === "load" && !form.sizeKey) {
    errors.sizeKey = "Choose what you're putting in it.";
  }
  if (step === "load" && (!form.rentalDays || form.rentalDays <= 0)) {
    errors.rentalDays = "Choose a rental length.";
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

/** Rental length to start with for an option, keeping a valid current choice. */
function defaultRentalDays(option: BookingSizeOption, current: number | null): number {
  return option.rentalDayOptions.includes(current ?? -1)
    ? (current as number)
    : (option.rentalDayOptions[0] ?? option.rentalDays);
}

/**
 * The furthest step (up to `target`) a restored draft can resume at: the
 * first earlier step that no longer checks out wins, so a refresh never skips
 * a validation, a rental-window check, or the address confirmation.
 */
function resumableStepIndex(
  draft: FormState,
  target: number,
  sizeOptions: readonly BookingSizeOption[],
  availability: DeliveryAvailability,
): number {
  const singleOption =
    sizeOptions.filter((option) => option.sizeGroupKey === draft.sizeGroupKey).length === 1;
  const last = Math.min(Math.max(target, 0), STEPS.length - 1);
  for (let index = 0; index < last; index += 1) {
    const id = STEPS[index].id;
    if (id === "load" && singleOption) continue;
    if (Object.keys(validateStep(id, draft)).length > 0) return index;
    if (id === "schedule") {
      const conflict = rentalWindowConflict(
        availability.bySizeKey[draft.sizeKey] ?? [],
        draft.neededDate,
        draft.rentalDays ?? 1,
      );
      if (conflict) return index;
    }
    // The address step only completes once the address is confirmed.
    if (id === "area" && (draft.placementLatitude == null || draft.placementLongitude == null)) {
      return index;
    }
  }
  return STEPS[last].id === "load" && singleOption ? last + 1 : last;
}

/** Applies a dumpster chosen before arriving (home/size page link). */
function applyPreselection(
  rawForm: FormState,
  preselection: BookingPreselection | null,
  sizeOptions: readonly BookingSizeOption[],
): FormState {
  // Drafts saved before sizes were chosen separately carry only sizeKey.
  const savedOption = sizeOptions.find((item) => item.key === rawForm.sizeKey);
  const form: FormState = savedOption
    ? { ...rawForm, sizeGroupKey: savedOption.sizeGroupKey }
    : {
        ...rawForm,
        sizeKey: "",
        sizeGroupKey:
          !rawForm.sizeKey &&
          sizeOptions.some((item) => item.sizeGroupKey === rawForm.sizeGroupKey)
            ? rawForm.sizeGroupKey
            : "",
      };
  if (!preselection) return form;
  const option = preselection.sizeKey
    ? sizeOptions.find((item) => item.key === preselection.sizeKey)
    : undefined;
  if (option) {
    return {
      ...form,
      sizeGroupKey: option.sizeGroupKey,
      sizeKey: option.key,
      rentalDays: defaultRentalDays(option, form.rentalDays),
    };
  }
  // Size chosen but not the load: clear a load from another size.
  return form.sizeGroupKey === preselection.groupKey
    ? form
    : { ...form, sizeGroupKey: preselection.groupKey, sizeKey: "", rentalDays: null };
}

export function BookingFlow({
  availability,
  sizeOptions,
  preselection = null,
}: Readonly<{
  availability: DeliveryAvailability;
  sizeOptions: readonly BookingSizeOption[];
  preselection?: BookingPreselection | null;
}>) {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(() =>
    applyPreselection(EMPTY_FORM, preselection, sizeOptions),
  );
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
  // Quick, approximate ZIP check on step 1 (exact price comes with the address).
  const [zipCheck, setZipCheck] = useState<ZipCheckState | null>(null);
  // Shown after a refresh or a return from Stripe without paying.
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    referenceNumber: number;
    serviceAreaConfirmed: boolean;
    kind: "booking" | "quote";
  } | null>(null);
  const restored = useRef(false);

  // Restore an in-progress draft after mount: answers, the step they were
  // on, and the ZIP check. This must run in an effect (not a lazy
  // initializer) because the page is prerendered; reading sessionStorage
  // during render would diverge from the server HTML and break hydration.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const params = new URLSearchParams(window.location.search);
    const returnedFromCheckout = params.get("checkout") === "canceled";
    try {
      const raw =
        window.sessionStorage.getItem(BOOKING_DRAFT_KEY) ??
        window.sessionStorage.getItem(LEGACY_BOOKING_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as
          | { form?: Partial<FormState>; stepIndex?: number; zipCheck?: ZipCheckState | null }
          | Partial<FormState>;
        const savedForm = "form" in parsed && parsed.form ? parsed.form : (parsed as Partial<FormState>);
        const savedStep =
          "stepIndex" in parsed && typeof parsed.stepIndex === "number" ? parsed.stepIndex : 0;
        // A dumpster picked on the way in wins over the saved draft's choice.
        // Consent is never restored: it has to be given in this visit.
        const nextForm = applyPreselection(
          { ...EMPTY_FORM, ...savedForm, agreementAccepted: false },
          preselection,
          sizeOptions,
        );
        const target = returnedFromCheckout ? STEPS.length - 1 : savedStep;
        const resumeAt = resumableStepIndex(nextForm, target, sizeOptions, availability);
        /* eslint-disable react-hooks/set-state-in-effect -- one-time post-hydration restore from browser storage */
        setForm(nextForm);
        setStepIndex(resumeAt);
        if ("zipCheck" in parsed && parsed.zipCheck && parsed.zipCheck.status === "done") {
          setZipCheck(parsed.zipCheck);
        }
        if (returnedFromCheckout) {
          setResumeNotice("Payment wasn't completed. Your details are saved, so you can try again whenever you're ready.");
        } else if (resumeAt > 0) {
          setResumeNotice("Welcome back — we saved your progress.");
        }
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      // Ignore malformed drafts.
    }
    // The ?size= / ?load= / ?checkout= link has done its job; drop it so a
    // later refresh doesn't overwrite choices made since.
    if (window.location.search) {
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
    // Runs once (guarded by restored.current).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist progress so a refresh does not lose the customer's work.
  useEffect(() => {
    if (!restored.current) return;
    try {
      window.sessionStorage.setItem(
        BOOKING_DRAFT_KEY,
        JSON.stringify({
          form: { ...form, agreementAccepted: false },
          stepIndex,
          zipCheck: zipCheck?.status === "done" ? zipCheck : null,
        }),
      );
      window.sessionStorage.removeItem(LEGACY_BOOKING_DRAFT_KEY);
    } catch {
      // Storage may be unavailable (private mode); progress is best-effort.
    }
  }, [form, stepIndex, zipCheck]);

  const step = STEPS[stepIndex];
  const groupOptions = sizeOptions.filter(
    (option) => option.sizeGroupKey === form.sizeGroupKey,
  );
  // A size with one option has nothing to ask on the "What's going in" step.
  const loadStepSkipped = groupOptions.length === 1;

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
    setStepIndex((index) => {
      const next = Math.min(index + 1, STEPS.length - 1);
      return STEPS[next].id === "load" && loadStepSkipped ? next + 1 : next;
    });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  /** Jump back to an earlier step (summary "Change" links, progress rail). */
  function goTo(id: StepId) {
    const target = stepIndexOf(id);
    if (target < 0 || target >= stepIndex) return;
    setErrors({});
    setFormError(null);
    setStepIndex(id === "load" && loadStepSkipped ? stepIndexOf("size") : target);
  }

  function chooseSize(groupKey: string) {
    const options = sizeOptions.filter((option) => option.sizeGroupKey === groupKey);
    setForm((prev) => {
      if (options.length === 1) {
        return {
          ...prev,
          sizeGroupKey: groupKey,
          sizeKey: options[0].key,
          rentalDays: defaultRentalDays(options[0], prev.rentalDays),
        };
      }
      // Switching size means choosing the load again for that size.
      return prev.sizeGroupKey === groupKey
        ? prev
        : { ...prev, sizeGroupKey: groupKey, sizeKey: "", rentalDays: null };
    });
    if (errors.sizeKey) setErrors((prev) => ({ ...prev, sizeKey: undefined }));
  }

  async function runZipCheck(postalCode: string) {
    const zip = postalCode.trim();
    if (!/^\d{5}$/.test(zip)) {
      setZipCheck({ zip, status: "invalid" });
      return;
    }
    update("postalCode", zip);
    setZipCheck({ zip, status: "checking" });
    try {
      const place = await geocodeAddress(`${zip}, USA`);
      if (place?.lat == null || place.lng == null) {
        setZipCheck({ zip, status: "unknown" });
        return;
      }
      const result = await checkPostalCodeAction({
        postalCode: zip,
        latitude: place.lat,
        longitude: place.lng,
      });
      setZipCheck({ zip, status: "done", city: place.city, result });
    } catch {
      setZipCheck({ zip, status: "unknown" });
    }
  }

  async function goNext() {
    const stepErrors = validateStep(step.id, form);
    if (step.id === "schedule" && form.neededDate && form.sizeKey && !stepErrors.neededDate) {
      // The whole rental must fit (also catches a length changed after picking a date).
      const conflict = rentalWindowConflict(
        availability.bySizeKey[form.sizeKey] ?? [],
        form.neededDate,
        selectedRentalDays ?? 1,
      );
      if (conflict) stepErrors.neededDate = conflict.message;
    }
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
    setFormError(null);
    setStepIndex((index) => {
      const previous = Math.max(index - 1, 0);
      return STEPS[previous].id === "load" && loadStepSkipped ? previous - 1 : previous;
    });
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
        // Keep the draft: if they back out of Stripe they return with it.
        // The confirmation page clears it once payment succeeds.
        window.location.assign(result.checkoutUrl);
        return;
      }

      const result = await submitBookingDraft(payload);
      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) setErrors(result.fieldErrors as Errors);
        return;
      }
      clearBookingDraft();
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

      clearBookingDraft();
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
        <aside className={styles.aside}>
          <ol className={styles.progress} aria-label="Booking progress">
            {STEPS.map((item, index) => {
              const done =
                index < stepIndex || (item.id === "load" && loadStepSkipped && stepIndex > index);
              const state =
                index === stepIndex
                  ? styles.progressItemActive
                  : done
                    ? styles.progressItemDone
                    : "";
              const content = (
                <>
                  <span className={styles.progressDot}>{done ? "✓" : index + 1}</span>
                  {item.label}
                </>
              );
              return (
                <li
                  key={item.id}
                  className={`${styles.progressItem} ${state}`}
                  aria-current={index === stepIndex ? "step" : undefined}
                >
                  {done && !(item.id === "load" && loadStepSkipped) ? (
                    <button
                      type="button"
                      className={styles.progressButton}
                      onClick={() => goTo(item.id)}
                      aria-label={`Go back to ${item.label}`}
                    >
                      {content}
                    </button>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ol>
          <RentalSummary
            form={form}
            option={selectedOption}
            groupOptions={groupOptions}
            rentalDays={selectedRentalDays}
            price={resolvedPrice}
            surchargeCents={deliverySurchargeCents}
            areaConfirmed={areaCheck?.status === "validated" || areaCheck?.status === "extended"}
            stepIndex={stepIndex}
            onChange={goTo}
          />
        </aside>

        <div className={styles.panel}>
          {resumeNotice ? (
            <div className={styles.resumeNotice} role="status">
              <span>{resumeNotice}</span>
              <button
                type="button"
                className={styles.resumeNoticeClose}
                onClick={() => setResumeNotice(null)}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          ) : null}
          {step.id === "size" && (
            <StepSize
              form={form}
              errors={errors}
              sizeOptions={sizeOptions}
              onChooseSize={chooseSize}
              zipCheck={zipCheck}
              onCheckZip={runZipCheck}
            />
          )}
          {step.id === "load" && (
            <StepLoad
              form={form}
              errors={errors}
              onChange={update}
              areaCheck={areaCheck}
              options={groupOptions}
              onOpenCustomQuote={openCustomQuote}
            />
          )}
          {step.id === "area" && (
            <StepArea
              form={form}
              errors={errors}
              onChange={update}
              areaCheck={areaCheck}
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
            <>
              <StepContact form={form} errors={errors} onChange={update} />
              <StepPlacement form={form} onChange={update} />
            </>
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
          {isConfirmedBusinessFact(businessConfig.contact.phone) ? (
            <p className={styles.callLine}>
              Prefer to talk it through? Call{" "}
              <a href={`tel:${businessConfig.contact.phone.value}`}>
                {businessConfig.contact.phone.value}
              </a>{" "}
              and we&apos;ll book it with you.
            </p>
          ) : null}
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
        <p className={styles.stepEyebrow}>{stepEyebrow("area")}</p>
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

type SizeGroup = {
  key: string;
  sizeName: string;
  dimensions: string;
  image: string;
  options: BookingSizeOption[];
  fromCents: number | null;
};

/** Options of the same physical size, cheapest first. */
function groupSizeOptions(sizeOptions: readonly BookingSizeOption[]): SizeGroup[] {
  const groups = new Map<string, SizeGroup>();
  for (const option of sizeOptions) {
    let group = groups.get(option.sizeGroupKey);
    if (!group) {
      group = {
        key: option.sizeGroupKey,
        sizeName: option.sizeName,
        dimensions: option.dimensions,
        image: "",
        options: [],
        fromCents: null,
      };
      groups.set(option.sizeGroupKey, group);
    }
    group.options.push(option);
  }
  const priceOf = (option: BookingSizeOption) =>
    option.price.type === "fixed" ? option.price.amountCents : Number.MAX_SAFE_INTEGER;
  for (const group of groups.values()) {
    group.options.sort((x, y) => priceOf(x) - priceOf(y));
    const fixed = group.options.filter((option) => option.price.type === "fixed");
    group.fromCents = fixed.length > 0 ? priceOf(fixed[0]) : null;
    group.image = group.options.find((option) => option.image)?.image ?? "";
  }
  return [...groups.values()];
}

type ZipCheckState =
  | { zip: string; status: "invalid" | "checking" | "unknown" }
  | { zip: string; status: "done"; city: string; result: PostalCodeCheck };

/**
 * Quick delivery check by ZIP, measured to the ZIP's center. It's an
 * estimate: the exact delivery price comes from the full address in the
 * Address step. Optional, so it never blocks anyone from continuing.
 */
function ZipCheck({
  initialZip,
  state,
  onCheck,
}: Readonly<{
  initialZip: string;
  state: ZipCheckState | null;
  onCheck: (zip: string) => void;
}>) {
  const [zip, setZip] = useState(initialZip);
  const checking = state?.status === "checking";

  let message: { tone: "ok" | "warn" | "bad"; text: string } | null = null;
  if (state?.status === "invalid") {
    message = { tone: "warn", text: "Enter a 5-digit ZIP code." };
  } else if (state?.status === "unknown") {
    message = {
      tone: "warn",
      text: "We couldn't check that ZIP right now. Keep going — we'll confirm with your address.",
    };
  } else if (state?.status === "done") {
    const where = state.city ? `${state.city} (${state.zip})` : state.zip;
    const { result } = state;
    if (result.status === "validated") {
      message = {
        tone: "ok",
        text: `Good news — we deliver to ${where}, and delivery is usually included. Your exact price is confirmed with your address.`,
      };
    } else if (result.status === "extended") {
      message = {
        tone: "ok",
        text: `We deliver to ${where}. It's about ${result.distanceMiles?.toFixed(0)} miles out, so expect a delivery charge of about ${formatCents(result.surchargeCents ?? 0)}. Your exact price is confirmed with your address.`,
      };
    } else if (result.status === "out_of_range") {
      message = {
        tone: "bad",
        text: `${where} looks outside our ${result.maxMiles}-mile delivery area for online booking. Give us a call and we'll see what we can do.`,
      };
    } else {
      message = {
        tone: "warn",
        text: "We couldn't confirm that ZIP yet. Keep going — we'll confirm with your address.",
      };
    }
  }

  return (
    <div className={styles.zipCheck}>
      <label className={styles.zipCheckLabel} htmlFor="zipCheck">
        Check that we deliver to you <span className={styles.optionalTag}>Optional</span>
      </label>
      <div className={styles.zipCheckRow}>
        <input
          id="zipCheck"
          className={styles.input}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="ZIP code"
          value={zip}
          onChange={(event) => setZip(event.target.value.replace(/\D/g, "").slice(0, 5))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCheck(zip);
            }
          }}
        />
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onCheck(zip)}
          disabled={checking}
        >
          {checking ? "Checking…" : "Check"}
        </button>
      </div>
      <p
        className={`${styles.zipCheckResult} ${
          message?.tone === "ok"
            ? styles.zipCheckOk
            : message?.tone === "bad"
              ? styles.zipCheckBad
              : ""
        }`}
        role="status"
        aria-live="polite"
      >
        {message?.text ?? ""}
      </p>
    </div>
  );
}

/** Step 1: pick a size (arrives preselected from home/size page links). */
function StepSize({
  form,
  errors,
  sizeOptions,
  onChooseSize,
  zipCheck,
  onCheckZip,
}: Readonly<{
  form: FormState;
  errors: Errors;
  sizeOptions: readonly BookingSizeOption[];
  onChooseSize: (groupKey: string) => void;
  zipCheck: ZipCheckState | null;
  onCheckZip: (zip: string) => void;
}>) {
  const groups = groupSizeOptions(sizeOptions);

  return (
    <>
      <header className={styles.stepHeader}>
        <p className={styles.stepEyebrow}>{stepEyebrow("size")}</p>
        <h1 className={styles.stepTitle}>Choose your dumpster size</h1>
        <p className={styles.stepSummary}>
          Prices start at the amount shown. Next, you&apos;ll tell us what&apos;s
          going in it.
        </p>
      </header>
      {errors.sizeKey && (
        <p className={styles.errorText} role="alert">
          {errors.sizeKey}
        </p>
      )}
      <div className={styles.sizeGrid}>
        {groups.map((group) => {
          const selected = group.key === form.sizeGroupKey;
          return (
            <button
              type="button"
              key={group.key}
              className={`${styles.sizeCard} ${selected ? styles.sizeCardSelected : ""}`}
              onClick={() => onChooseSize(group.key)}
              aria-pressed={selected}
            >
              <div className={styles.sizeMediaWrap}>
                {group.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={group.image} alt={`${group.sizeName}`} className={styles.sizeMedia} />
                ) : (
                  <span className={styles.sizeMediaEmpty} aria-hidden="true">
                    {group.sizeName.split(" ")[0]}
                  </span>
                )}
              </div>
              <div className={styles.sizeDetails}>
                <div className={styles.sizeCardHead}>
                  <div className={styles.sizeTitleBlock}>
                    <p className={styles.sizeName}>{group.sizeName}</p>
                    <p className={styles.sizeUse}>{group.dimensions}</p>
                  </div>
                  {group.fromCents != null ? (
                    <div className={styles.sizePriceBlock}>
                      <span className={styles.sizePriceDetail}>
                        {group.options.length > 1 ? "From" : "Price"}
                      </span>
                      <span className={styles.sizePrice}>{formatCents(group.fromCents)}</span>
                    </div>
                  ) : (
                    <span className={styles.sizePriceQuote}>Quote required</span>
                  )}
                </div>
                <div className={styles.sizeMeta}>
                  <span className={styles.sizeMetaPill}>
                    {group.options.length > 1
                      ? group.options.map((option) => option.optionLabel).join(" or ")
                      : group.options[0].optionLabel}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <ZipCheck initialZip={form.postalCode} state={zipCheck} onCheck={onCheckZip} />
    </>
  );
}

/** Two short lists, allowed and not allowed, for a load card. */
function LoadMaterials({ materialRules }: Readonly<{ materialRules: readonly string[] }>) {
  const { allowed, notAllowed } = splitMaterialRules(materialRules);
  if (allowed.length === 0 && notAllowed.length === 0) return null;
  return (
    <span className={styles.loadMaterials}>
      {allowed.length > 0 ? (
        <span className={styles.loadMaterialsCol}>
          <span className={styles.loadMaterialsLabel}>Allowed</span>
          <ul className={styles.loadMaterialsList}>
            {allowed.map((item) => (
              <li key={item}>
                <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.loadMaterialsYes}>
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </span>
      ) : null}
      {notAllowed.length > 0 ? (
        <span className={styles.loadMaterialsCol}>
          <span className={`${styles.loadMaterialsLabel} ${styles.loadMaterialsLabelNo}`}>
            Not allowed
          </span>
          <ul className={styles.loadMaterialsList}>
            {notAllowed.map((item) => (
              <li key={item}>
                <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.loadMaterialsNo}>
                  <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </span>
      ) : null}
    </span>
  );
}

/**
 * Step 2: what's going in it. Each choice is one of the chosen size's catalog
 * options, so the booking still records exactly one option (sizeKey) and
 * checkout, pricing, and dumpster assignment are unchanged.
 */
function StepLoad({
  form,
  errors,
  onChange,
  areaCheck,
  options,
  onOpenCustomQuote,
}: StepProps & {
  areaCheck: PostalCodeCheck | null;
  options: readonly BookingSizeOption[];
  onOpenCustomQuote: () => void;
}) {
  const surchargeCents = areaCheck?.surchargeCents ?? 0;
  const selectedOption = options.find((option) => option.key === form.sizeKey) ?? null;
  const priceLabel = (cents: number) => formatCents(cents + surchargeCents);

  function selectOption(option: BookingSizeOption) {
    onChange("sizeKey", option.key);
    onChange("rentalDays", defaultRentalDays(option, form.rentalDays));
  }

  return (
    <>
      <header className={styles.stepHeader}>
        <p className={styles.stepEyebrow}>{stepEyebrow("load")}</p>
        <h1 className={styles.stepTitle}>What are you putting in it?</h1>
        <p className={styles.stepSummary}>
          Choose the one that matches your whole load. Different load types
          can&apos;t be mixed in one dumpster.
        </p>
      </header>
      {errors.sizeKey && (
        <p className={styles.errorText} role="alert">
          {errors.sizeKey}
        </p>
      )}
      <fieldset className={styles.loadFieldset}>
        <legend className={styles.visuallyHidden}>Load type</legend>
        <div className={styles.loadGrid}>
          {options.map((option) => {
            const selected = form.sizeKey === option.key;
            const price = resolveBookingPrice(option, defaultRentalDays(option, form.rentalDays));
            return (
              <label
                key={option.key}
                className={`${styles.loadCard} ${selected ? styles.loadCardSelected : ""}`}
              >
                <span className={styles.loadCardHead}>
                  <input
                    type="radio"
                    name="loadType"
                    value={option.key}
                    checked={selected}
                    onChange={() => selectOption(option)}
                    className={styles.loadRadio}
                  />
                  <span className={styles.loadCardTitle}>
                    <span className={styles.loadCardName}>{option.optionLabel}</span>
                    {option.use ? <span className={styles.loadCardUse}>{option.use}</span> : null}
                  </span>
                  <span className={styles.loadCardPrice}>
                    {price.type === "fixed" ? priceLabel(price.amountCents) : price.label}
                  </span>
                </span>
                <span className={styles.loadCardFacts}>
                  {option.includedTons != null ? (
                    <span>{option.includedTons} tons included</span>
                  ) : (
                    <span>{option.includedWeightLabel}</span>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>
                    {option.rentalDayOptions.length > 1
                      ? `${option.rentalDayOptions.slice(0, -1).join(", ")} or ${option.rentalDayOptions.at(-1)} days`
                      : `${option.rentalDayOptions[0] ?? option.rentalDays} days`}
                  </span>
                </span>
                <LoadMaterials materialRules={option.materialRules} />
              </label>
            );
          })}
        </div>
      </fieldset>

      {selectedOption ? (
        <fieldset className={styles.fieldset} style={{ marginTop: "var(--space-4)" }}>
          <Field id="rentalDays" label="Rental length" error={errors.rentalDays}>
            <select
              id="rentalDays"
              className={`${styles.select} ${errors.rentalDays ? styles.inputError : ""}`}
              value={form.rentalDays ?? ""}
              onChange={(event) => onChange("rentalDays", Number(event.target.value))}
              aria-invalid={Boolean(errors.rentalDays)}
            >
              <option value="" disabled>
                Choose rental length
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
          ? `Prices above include the extra distance charge for your address (${formatCents(areaCheck.surchargeCents ?? 0)}).`
          : "Prices shown are the base rental rate. Taxes and any delivery charge are confirmed once your address is verified."}
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
        <button type="button" className={styles.secondaryButton} onClick={onOpenCustomQuote}>
          Get custom quote
        </button>
      </div>
    </>
  );
}

function formatNeededDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * "Your rental": what's chosen so far and the price, visible on every step
 * with Change links back to earlier steps, so there are no surprises at
 * review.
 */
function RentalSummary({
  form,
  option,
  groupOptions,
  rentalDays,
  price,
  surchargeCents,
  areaConfirmed,
  stepIndex,
  onChange,
}: Readonly<{
  form: FormState;
  option: BookingSizeOption | null;
  groupOptions: readonly BookingSizeOption[];
  rentalDays: number | null;
  price: BookingSizeOption["price"] | null;
  surchargeCents: number;
  areaConfirmed: boolean;
  stepIndex: number;
  onChange: (id: StepId) => void;
}>) {
  const sizeName = option?.sizeName ?? groupOptions[0]?.sizeName ?? null;
  const canChange = (id: StepId) => stepIndexOf(id) < stepIndex;
  const rows: Array<{ label: string; value: string; step: StepId }> = [];
  if (sizeName) rows.push({ label: "Dumpster", value: sizeName, step: "size" });
  if (option && groupOptions.length > 1) {
    rows.push({ label: "Load", value: option.optionLabel, step: "load" });
  }
  if (option && rentalDays) {
    rows.push({ label: "Rental", value: `${rentalDays} day${rentalDays === 1 ? "" : "s"}`, step: "load" });
  }
  if (form.neededDate) {
    rows.push({
      label: "Dates",
      value: rentalDays
        ? `${formatNeededDate(form.neededDate)} → ${formatNeededDate(rentalPickupDate(form.neededDate, rentalDays))}`
        : formatNeededDate(form.neededDate),
      step: "schedule",
    });
  }
  if (areaConfirmed && form.addressLine1) {
    rows.push({ label: "Address", value: `${form.addressLine1}, ${form.city}`, step: "area" });
  }

  const fixed = price?.type === "fixed" ? price.amountCents : null;
  const fromCents =
    !option && groupOptions.length > 0
      ? Math.min(
          ...groupOptions.map((item) =>
            item.price.type === "fixed" ? item.price.amountCents : Number.MAX_SAFE_INTEGER,
          ),
        )
      : null;

  return (
    <section className={styles.summaryCard} aria-labelledby="rental-summary-title">
      <h2 id="rental-summary-title" className={styles.summaryCardTitle}>
        Your rental
      </h2>
      {rows.length === 0 ? (
        <p className={styles.summaryCardEmpty}>Pick a dumpster size to see your price.</p>
      ) : (
        <dl className={styles.summaryCardList}>
          {rows.map((row) => (
            <div key={row.label} className={styles.summaryCardRow}>
              <dt>{row.label}</dt>
              <dd>
                {row.value}
                {canChange(row.step) ? (
                  <button
                    type="button"
                    className={styles.summaryChange}
                    onClick={() => onChange(row.step)}
                    aria-label={`Change ${row.label.toLowerCase()}`}
                  >
                    Change
                  </button>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {fixed != null ? (
        <div className={styles.summaryCardTotal}>
          {surchargeCents > 0 ? (
            <p className={styles.summaryCardLine}>
              <span>Delivery distance</span>
              <span>{formatCents(surchargeCents)}</span>
            </p>
          ) : null}
          <p className={styles.summaryCardPrice}>
            <span>{areaConfirmed ? "Total" : "Price so far"}</span>
            <span>{formatCents(fixed + surchargeCents)}</span>
          </p>
          <p className={styles.summaryCardNote}>
            {areaConfirmed
              ? "Taxes are confirmed before payment."
              : "Delivery charge, if any, is added once we have your address."}
          </p>
        </div>
      ) : price?.type === "quote_required" ? (
        <p className={styles.summaryCardNote}>{price.label}</p>
      ) : fromCents != null && fromCents < Number.MAX_SAFE_INTEGER ? (
        <div className={styles.summaryCardTotal}>
          <p className={styles.summaryCardPrice}>
            <span>From</span>
            <span>{formatCents(fromCents)}</span>
          </p>
          <p className={styles.summaryCardNote}>Depends on what&apos;s going in it.</p>
        </div>
      ) : null}
    </section>
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
        <p className={styles.stepEyebrow}>{stepEyebrow("schedule")}</p>
        <h1 className={styles.stepTitle}>When do you need it?</h1>
        <p className={styles.stepSummary}>
          Pick your delivery day. We&apos;ll show the whole rental through
          pickup. Red days can&apos;t start a rental of this length.
        </p>
      </header>
      <fieldset className={styles.fieldset}>
        <DateCalendar
          minDate={availability.minDate}
          maxDate={availability.maxDate}
          unavailable={
            form.sizeKey ? (availability.bySizeKey[form.sizeKey] ?? []) : []
          }
          rentalDays={form.rentalDays ?? 1}
          value={form.neededDate}
          onChange={(date) => onChange("neededDate", date)}
        />
        {errors.neededDate && (
          <p className={styles.errorText} role="alert">
            {errors.neededDate}
          </p>
        )}
        {form.neededDate && form.rentalDays ? (
          <div className={styles.rentalSpan} role="status" aria-live="polite">
            <span>
              <strong>Delivery</strong>
              {formatNeededDate(form.neededDate)}
            </span>
            <span>
              <strong>Pickup</strong>
              {formatNeededDate(rentalPickupDate(form.neededDate, form.rentalDays))}
            </span>
            <span>
              <strong>Rental</strong>
              {form.rentalDays} day{form.rentalDays === 1 ? "" : "s"}
            </span>
          </div>
        ) : null}
        <p className={styles.helpText}>
          {form.neededDate
            ? "We'll confirm the exact delivery and pickup windows."
            : "Pick the day you want it delivered. We'll show your pickup day."}
        </p>
      </fieldset>
    </>
  );
}

function StepContact({ form, errors, onChange }: StepProps) {
  return (
    <>
      <header className={styles.stepHeader}>
        <p className={styles.stepEyebrow}>{stepEyebrow("contact")}</p>
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
      <div className={styles.subsectionHeader}>
        <h2 className={styles.choiceHeading}>
          Where should it go? <span className={styles.optionalTag}>Optional</span>
        </h2>
        <p className={styles.helpText}>
          Drop a pin or add notes so the driver knows exactly where to place it.
          You can skip this and tell the driver later.
        </p>
      </div>
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
        <p className={styles.stepEyebrow}>{stepEyebrow("review")}</p>
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
          <dt className={styles.summaryTerm}>Delivery</dt>
          <dd className={styles.summaryValue}>
            {form.neededDate ? formatNeededDate(form.neededDate) : "—"}
          </dd>
        </div>
        <div className={styles.summaryRow}>
          <dt className={styles.summaryTerm}>Pickup</dt>
          <dd className={styles.summaryValue}>
            {form.neededDate && rentalDays
              ? formatNeededDate(rentalPickupDate(form.neededDate, rentalDays))
              : "—"}
          </dd>
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
