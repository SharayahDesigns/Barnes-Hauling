"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import {
  createManualBooking,
  type ManualBookingFormState,
} from "@/lib/admin/leads";
import { BOOKING_STATUSES } from "@/lib/admin/booking-status";
import { humanizeStatus } from "@/lib/admin/dumpster-status";
import { loadGoogleMaps } from "@/lib/maps/loader";

import styles from "../../admin.module.scss";

const INITIAL: ManualBookingFormState = {};
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type VerifyState = { ok: boolean; text: string } | null;

export function AddBookingForm({
  items,
}: Readonly<{ items: ReadonlyArray<{ id: string; name: string }> }>) {
  const [state, formAction, pending] = useActionState(
    createManualBooking,
    INITIAL,
  );

  const addressRef = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const regionRef = useRef<HTMLInputElement>(null);
  const postalRef = useRef<HTMLInputElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const placeIdRef = useRef<HTMLInputElement>(null);
  const [verify, setVerify] = useState<VerifyState>(null);

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
          fields: ["address_components", "geometry", "formatted_address", "place_id"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete?.getPlace();
          if (!place?.address_components) {
            setVerify({ ok: false, text: "Pick an address from the suggestions." });
            return;
          }

          const component = (type: string, short = false) => {
            const found = place.address_components?.find((c) =>
              c.types.includes(type),
            );
            return found ? (short ? found.short_name : found.long_name) : "";
          };

          const line1 = [component("street_number"), component("route")]
            .filter(Boolean)
            .join(" ");
          if (addressRef.current && line1) addressRef.current.value = line1;
          if (cityRef.current) {
            cityRef.current.value =
              component("locality") ||
              component("sublocality") ||
              component("postal_town");
          }
          if (regionRef.current) {
            regionRef.current.value = component("administrative_area_level_1", true);
          }
          if (postalRef.current) postalRef.current.value = component("postal_code");

          const location = place.geometry?.location;
          if (latRef.current) latRef.current.value = location ? String(location.lat()) : "";
          if (lngRef.current) lngRef.current.value = location ? String(location.lng()) : "";
          if (placeIdRef.current) placeIdRef.current.value = place.place_id ?? "";

          setVerify({
            ok: true,
            text: `Verified: ${place.formatted_address ?? line1}`,
          });
        });
      })
      .catch(() => {
        if (!cancelled) {
          setVerify({
            ok: false,
            text: "Address lookup is unavailable — enter the address manually.",
          });
        }
      });

    return () => {
      cancelled = true;
      if (autocomplete && window.google) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, []);

  // Manual edits invalidate a prior Google verification.
  function handleAddressInput() {
    if (latRef.current) latRef.current.value = "";
    if (lngRef.current) lngRef.current.value = "";
    if (placeIdRef.current) placeIdRef.current.value = "";
    setVerify(null);
  }

  return (
    <details className={styles.card}>
      <summary className={styles.accordionSummary}>
        <span className={styles.cardTitle}>Add booking manually</span>
        <span className={styles.accordionHint}>Open form</span>
      </summary>
      <form action={formAction} className={styles.accordionBody}>
        {state.error && (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className={styles.notice} role="status">
            {state.success}
          </p>
        )}

        <input type="hidden" name="latitude" ref={latRef} />
        <input type="hidden" name="longitude" ref={lngRef} />
        <input type="hidden" name="placeId" ref={placeIdRef} />

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="firstName">
              First name
            </label>
            <input id="firstName" name="firstName" className={styles.input} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="lastName">
              Last name
            </label>
            <input id="lastName" name="lastName" className={styles.input} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" className={styles.input} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="addressLine1">
              Address
            </label>
            <input
              id="addressLine1"
              name="addressLine1"
              className={styles.input}
              ref={addressRef}
              onChange={handleAddressInput}
              autoComplete="off"
              placeholder="Start typing to search…"
              required
            />
            {verify && (
              <p
                className={verify.ok ? styles.notice : styles.calendarSub}
                role="status"
                style={{ margin: "var(--space-2) 0 0" }}
              >
                {verify.ok ? "✓ " : ""}
                {verify.text}
              </p>
            )}
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="city">
              City
            </label>
            <input id="city" name="city" className={styles.input} ref={cityRef} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="region">
              State
            </label>
            <input
              id="region"
              name="region"
              className={styles.input}
              defaultValue="UT"
              ref={regionRef}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="postalCode">
              ZIP code
            </label>
            <input
              id="postalCode"
              name="postalCode"
              className={styles.input}
              ref={postalRef}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="serviceItemId">
              Dumpster size
            </label>
            <select
              id="serviceItemId"
              name="serviceItemId"
              className={styles.select}
              defaultValue=""
              required
            >
              <option value="" disabled>
                Choose a dumpster size
              </option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="status">
              Status
            </label>
            <select
              id="status"
              name="status"
              className={styles.select}
              defaultValue="pending_review"
            >
              {BOOKING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {humanizeStatus(status)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="startDate">
              Start date
            </label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="endDate">
              End date
            </label>
            <input
              id="endDate"
              name="endDate"
              type="date"
              className={styles.input}
              required
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="priceCents">
              Price (cents)
            </label>
            <input
              id="priceCents"
              name="priceCents"
              type="number"
              min="0"
              className={styles.input}
              placeholder="Required for confirmed/scheduled"
            />
          </div>
        </div>

        <div className={styles.field} style={{ marginTop: "var(--space-4)" }}>
          <label className={styles.label} htmlFor="customerInstructions">
            Internal/customer instructions
          </label>
          <textarea
            id="customerInstructions"
            name="customerInstructions"
            className={styles.input}
            rows={4}
          />
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.primaryButton} disabled={pending}>
            {pending ? "Saving…" : "Add booking"}
          </button>
        </div>
      </form>
    </details>
  );
}
