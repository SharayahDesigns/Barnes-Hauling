import "server-only";

import { randomUUID } from "node:crypto";

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

export function denverDayStart(date: string): string {
  return `${date}T09:00:00-07:00`;
}

export function denverDayEndWithRentalDays(date: string, rentalDays: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + rentalDays);
  return `${dt.toISOString().slice(0, 10)}T18:00:00-07:00`;
}

export function extractBookingSubmission(raw: unknown): {
  input: Record<string, unknown>;
  placementPhoto?: File;
} {
  if (!(raw instanceof FormData)) {
    return { input: raw as Record<string, unknown> };
  }

  const placementPhoto = raw.get("placementPhoto");

  return {
    input: {
      postalCode: String(raw.get("postalCode") ?? ""),
      addressLine1: String(raw.get("addressLine1") ?? ""),
      addressLine2: String(raw.get("addressLine2") ?? ""),
      city: String(raw.get("city") ?? ""),
      region: String(raw.get("region") ?? ""),
      sizeKey: String(raw.get("sizeKey") ?? ""),
      rentalDays: String(raw.get("rentalDays") ?? ""),
      neededDate: String(raw.get("neededDate") ?? ""),
      firstName: String(raw.get("firstName") ?? ""),
      lastName: String(raw.get("lastName") ?? ""),
      email: String(raw.get("email") ?? ""),
      phone: String(raw.get("phone") ?? ""),
      emailUpdates: String(raw.get("emailUpdates") ?? "") === "true",
      smsUpdates: String(raw.get("smsUpdates") ?? "") === "true",
      placementNotes: String(raw.get("placementNotes") ?? ""),
      placementLatitude: raw.get("placementLatitude")
        ? Number(raw.get("placementLatitude"))
        : undefined,
      placementLongitude: raw.get("placementLongitude")
        ? Number(raw.get("placementLongitude"))
        : undefined,
      agreementAccepted: String(raw.get("agreementAccepted") ?? "") === "true",
      turnstileToken: raw.get("turnstileToken")
        ? String(raw.get("turnstileToken"))
        : undefined,
    },
    placementPhoto:
      placementPhoto instanceof File && placementPhoto.size > 0
        ? placementPhoto
        : undefined,
  };
}

function sanitizePathPart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

export async function savePlacementPhoto(
  supabase: AdminDb,
  params: {
    customerId: string;
    bookingId?: string;
    quoteId?: string;
    file: File;
  },
): Promise<{ path?: string; fileId?: string; error?: string }> {
  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ]);
  if (!allowed.has(params.file.type)) {
    return { error: "Placement photo must be a JPG, PNG, WebP, or HEIC image." };
  }
  if (params.file.size > 10 * 1024 * 1024) {
    return { error: "Placement photo must be 10 MB or smaller." };
  }

  const extension = params.file.name.split(".").pop()?.toLowerCase() || "bin";
  const objectPath = `customers/${sanitizePathPart(params.customerId)}/placements/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await params.file.arrayBuffer());

  const upload = await supabase.storage
    .from("customer-photos")
    .upload(objectPath, buffer, {
      contentType: params.file.type,
      upsert: false,
    });
  if (upload.error) {
    return { error: "Could not upload the placement photo. Please retry." };
  }

  const fileInsert = await supabase
    .from("files")
    .insert({
      customer_id: params.customerId,
      quote_id: params.quoteId ?? null,
      booking_id: params.bookingId ?? null,
      bucket_id: "customer-photos",
      object_path: objectPath,
      original_filename: params.file.name,
      extension,
      declared_mime_type: params.file.type || "application/octet-stream",
      size_bytes: params.file.size,
      category: "dumpster_placement_photo",
      visibility: "staff_only",
      validation_status: "pending",
      description: "Customer-submitted dumpster placement photo.",
    })
    .select("id")
    .single();

  if (fileInsert.error || !fileInsert.data) {
    await supabase.storage.from("customer-photos").remove([objectPath]);
    return { error: "Could not save the placement photo record. Please retry." };
  }

  return { path: objectPath, fileId: fileInsert.data.id as string };
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

type CustomerAndAddressInput = Pick<
  BookingDraftInput,
  | "postalCode"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "region"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "placementLatitude"
  | "placementLongitude"
>;

export async function createCustomerAndAddress(
  supabase: AdminDb,
  input: CustomerAndAddressInput,
): Promise<CustomerAndAddress> {
  const serviceArea = await checkServiceArea({
    postalCode: input.postalCode,
    latitude: input.placementLatitude ?? null,
    longitude: input.placementLongitude ?? null,
  });

  if (serviceArea.status === "out_of_range") {
    throw new Error(
      `This address is ${serviceArea.distanceMiles.toFixed(
        1,
      )} miles from the dumpster yard. Online booking currently supports deliveries up to ${serviceArea.maxMiles} miles.`,
    );
  }

  const confirmed =
    serviceArea.status === "validated" || serviceArea.status === "extended";

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
      delivery_distance_miles:
        serviceArea.status === "unconfirmed" ? null : serviceArea.distanceMiles,
      delivery_surcharge_cents:
        serviceArea.status === "unconfirmed" ? null : serviceArea.surchargeCents,
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
