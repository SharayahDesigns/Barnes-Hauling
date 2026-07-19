import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  TRANSACTIONAL_CONSENT_LANGUAGE,
  TRANSACTIONAL_CONSENT_VERSION,
} from "./options";
import { normalizePhone, type BookingDraftInput } from "./schema";
import { checkServiceArea, type ServiceAreaResult } from "./service-area";

/**
 * Shared server-only persistence helpers for the booking flow, used by both the
 * quote-draft path (`actions.ts`) and the paid checkout path (`checkout.ts`).
 * Not a `"use server"` module — these are plain server utilities.
 */

// The untyped service-role client (createAdminClient) resolves to this shape.
type AdminDb = SupabaseClient;

const DENVER_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Denver",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function denverDate(value: string | Date): string {
  return DENVER_DATE.format(typeof value === "string" ? new Date(value) : value);
}

export function todayInDenver(): string {
  return denverDate(new Date());
}

export async function verifyTurnstile(
  token: string | undefined,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Turnstile is not configured during the test-mode build; allow submissions
  // through so the flow is exercisable. Once the secret is set this enforces.
  if (!secret) return true;
  if (!token) return false;

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
    },
  );
  const data = (await response.json()) as { success?: boolean };
  return Boolean(data.success);
}

export async function resolveDumpsterServiceId(
  supabase: AdminDb,
): Promise<string> {
  const { data, error } = await supabase
    .from("services")
    .select("id")
    .eq("code", "dumpster_rental")
    .single();
  if (error || !data) {
    throw new Error("Dumpster service is unavailable.");
  }
  return data.id as string;
}

export async function resolveServiceItemId(
  supabase: AdminDb,
  code: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("service_items")
    .select("id")
    .eq("code", code)
    .single();
  if (error || !data) {
    throw new Error("That container option is unavailable.");
  }
  return data.id as string;
}

export type CustomerAndAddress = {
  customerId: string;
  serviceAddressId: string;
  serviceArea: ServiceAreaResult;
};

export async function createCustomerAndAddress(
  supabase: AdminDb,
  input: BookingDraftInput,
): Promise<CustomerAndAddress> {
  const serviceArea = await checkServiceArea(input.postalCode);
  const confirmed = serviceArea.status === "validated";

  const customer = await supabase
    .from("customers")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      phone: normalizePhone(input.phone),
    })
    .select("id")
    .single();
  if (customer.error || !customer.data) {
    throw new Error("Could not save your contact details.");
  }
  const customerId = customer.data.id as string;

  const address = await supabase
    .from("customer_addresses")
    .insert({
      customer_id: customerId,
      address_line_1: input.addressLine1,
      address_line_2: input.addressLine2 ?? null,
      city: input.city,
      region: input.region,
      postal_code: input.postalCode,
      country_code: "US",
      latitude: input.placementLatitude ?? null,
      longitude: input.placementLongitude ?? null,
      validation_status: confirmed ? "validated" : "pending",
      service_area_id: confirmed ? serviceArea.serviceAreaId : null,
      service_zone_id: confirmed ? serviceArea.serviceZoneId : null,
      is_default: true,
    })
    .select("id")
    .single();
  if (address.error || !address.data) {
    throw new Error("Could not save your delivery address.");
  }

  return {
    customerId,
    serviceAddressId: address.data.id as string,
    serviceArea,
  };
}

export async function recordTransactionalConsents(
  supabase: AdminDb,
  customerId: string,
  input: BookingDraftInput,
): Promise<void> {
  const consents: Array<Record<string, unknown>> = [];
  const base = {
    customer_id: customerId,
    consent_type: "transactional" as const,
    status: "granted" as const,
    language_version: TRANSACTIONAL_CONSENT_VERSION,
    language_shown: TRANSACTIONAL_CONSENT_LANGUAGE,
    source: "booking_flow",
  };
  if (input.emailUpdates) {
    consents.push({ ...base, channel: "email", destination: input.email });
  }
  if (input.smsUpdates) {
    consents.push({
      ...base,
      channel: "sms",
      destination: normalizePhone(input.phone),
    });
  }
  if (consents.length > 0) {
    // Non-fatal: a consent write failure should not lose the saved request.
    await supabase.from("notification_consents").insert(consents);
  }
}
