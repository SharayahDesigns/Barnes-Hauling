import { formatCents } from "@/config/public-content";
import { createPageMetadata } from "@/lib/page-metadata";
import { humanizeStatus } from "@/lib/admin/dumpster-status";
import { deleteDumpster } from "@/lib/admin/inventory";
import { createAdminClient } from "@/lib/supabase/admin";

import styles from "../../admin.module.scss";
import { AddDumpsterForm } from "./add-dumpster-form";
import { EditDetailsForm } from "./edit-details-form";
import { UpdateStatusForm } from "./update-status-form";

const DUMPSTER_IMAGE_BUCKET = "dumpster-images";

export const metadata = createPageMetadata(
  "Dumpster inventory",
  "Manage Barnes dumpster inventory.",
  "/admin/inventory",
  { noIndex: true },
);

type DumpsterRow = {
  id: string;
  asset_number: string;
  status: string;
  service_item_id: string | null;
  current_location: string | null;
  condition_notes: string | null;
  image_path: string | null;
  image_public_url?: string | null;
  materials_allowed: string[];
  materials_not_allowed: string[];
  rental_duration_days: number[];
  max_weight_tons: number | null;
  rental_price_cents: number | null;
  assignment_count: number;
  status_history_count: number;
  active_assignment_count: number;
  dumpster_sizes: {
    id: string;
    name: string;
    length_feet: number | null;
    width_feet: number | null;
    wall_height_feet: number | null;
  } | null;
  service_items: {
    id: string;
    name: string;
  } | null;
  dumpster_assignments:
    | DumpsterAssignmentRow[]
    | null;
};

type DumpsterAssignmentRow = {
  status: string;
  starts_at: string;
  ends_at: string;
  bookings:
    | {
        booking_number: number;
        customer_addresses:
          | {
              address_line_1: string;
              city: string;
            }
          | null;
      }
    | null;
};

const activeAssignmentStatuses = new Set(["reserved", "assigned"]);
const manualUnavailableStatuses = new Set([
  "inspection_required",
  "maintenance",
  "unavailable",
  "retired",
]);

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/Denver",
  }).format(new Date(value));
}

function formatDenverDateKey(value: string | Date): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(typeof value === "string" ? new Date(value) : value);
}

function isAssignmentActiveOnDate(
  assignment: DumpsterAssignmentRow,
  dateKey: string,
): boolean {
  const startsOn = formatDenverDateKey(assignment.starts_at);
  const endsOn = formatDenverDateKey(assignment.ends_at);
  return startsOn <= dateKey && dateKey <= endsOn;
}

function resolveDisplayStatus(
  dumpsterStatus: string,
  assignment: DumpsterAssignmentRow | null,
): string {
  if (manualUnavailableStatuses.has(dumpsterStatus)) {
    return dumpsterStatus;
  }

  if (assignment) {
    return "reserved";
  }

  return "available";
}

function formatAvailability(
  dumpsterStatus: string,
  assignment: DumpsterAssignmentRow | null,
): string {
  if (assignment) {
    return `${formatDate(assignment.starts_at)} to ${formatDate(
      assignment.ends_at,
    )}`;
  }

  if (dumpsterStatus === "available") {
    return "Available now";
  }

  return "Unavailable";
}

function formatMaterials(materials: string[]): string {
  if (materials.length === 0) return "—";
  return materials.join(", ");
}

function formatRentalDurations(days: number[]): string {
  if (days.length === 0) return "—";
  return days.map((day) => `${day}-day`).join(", ");
}

function formatDimensions(size: DumpsterRow["dumpster_sizes"]): string {
  if (!size?.length_feet || !size.width_feet) return "—";
  const walls = size.wall_height_feet ? ` × ${size.wall_height_feet} ft walls` : "";
  return `${size.width_feet} ft × ${size.length_feet} ft${walls}`;
}

function canDeleteDumpster(dumpster: DumpsterRow): boolean {
  if (dumpster.active_assignment_count > 0) return false;
  if (dumpster.assignment_count === 0 && dumpster.status_history_count === 0) return true;
  return dumpster.status === "retired";
}

export default async function InventoryPage() {
  const supabase = createAdminClient();
  const todayDenver = formatDenverDateKey(new Date());

  const [enhancedDumpstersResult, sizesResult, serviceItemsResult, assignmentsResult, historyResult] =
    await Promise.all([
      supabase
        .from("dumpsters")
        .select(
          "id, asset_number, status, service_item_id, current_location, condition_notes, image_path, materials_allowed, materials_not_allowed, rental_duration_days, max_weight_tons, rental_price_cents, dumpster_sizes(id, name, length_feet, width_feet, wall_height_feet), service_items(id, name), dumpster_assignments(status, starts_at, ends_at, bookings(booking_number, customer_addresses(address_line_1, city)))",
        )
        .order("asset_number"),
      supabase
        .from("dumpster_sizes")
        .select("id, name")
        .eq("status", "active")
        .order("capacity_cubic_yards"),
      supabase
        .from("service_items")
        .select("id, name")
        .eq("item_kind", "rental_package")
        .eq("status", "active")
        .order("sort_order"),
      supabase.from("dumpster_assignments").select("id, dumpster_id, status"),
      supabase.from("dumpster_status_history").select("id, dumpster_id"),
    ]);
  const supportsServiceItemAssignments = !enhancedDumpstersResult.error;

  const dumpstersResult = !supportsServiceItemAssignments
    ? await supabase
        .from("dumpsters")
        .select(
          "id, asset_number, status, current_location, condition_notes, image_path, materials_allowed, materials_not_allowed, rental_duration_days, max_weight_tons, rental_price_cents, dumpster_sizes(id, name, length_feet, width_feet, wall_height_feet), dumpster_assignments(status, starts_at, ends_at, bookings(booking_number, customer_addresses(address_line_1, city)))",
        )
        .order("asset_number")
    : enhancedDumpstersResult;

  const assignmentCountByDumpster = new Map<string, number>();
  const activeAssignmentCountByDumpster = new Map<string, number>();
  for (const assignment of ((assignmentsResult.data as Array<{
    dumpster_id: string;
    status: string;
  }> | null) ?? [])) {
    assignmentCountByDumpster.set(
      assignment.dumpster_id,
      (assignmentCountByDumpster.get(assignment.dumpster_id) ?? 0) + 1,
    );
    if (assignment.status === "reserved" || assignment.status === "assigned") {
      activeAssignmentCountByDumpster.set(
        assignment.dumpster_id,
        (activeAssignmentCountByDumpster.get(assignment.dumpster_id) ?? 0) + 1,
      );
    }
  }

  const historyCountByDumpster = new Map<string, number>();
  for (const row of ((historyResult.data as Array<{ dumpster_id: string }> | null) ?? [])) {
    historyCountByDumpster.set(
      row.dumpster_id,
      (historyCountByDumpster.get(row.dumpster_id) ?? 0) + 1,
    );
  }

  const dumpsters = ((((dumpstersResult.data as DumpsterRow[] | null) ?? []).map(
    (dumpster) => ({
      ...dumpster,
      service_item_id: dumpster.service_item_id ?? null,
      service_items: dumpster.service_items ?? null,
      assignment_count: assignmentCountByDumpster.get(dumpster.id) ?? 0,
      active_assignment_count: activeAssignmentCountByDumpster.get(dumpster.id) ?? 0,
      status_history_count: historyCountByDumpster.get(dumpster.id) ?? 0,
      image_public_url: dumpster.image_path
        ? supabase.storage
            .from(DUMPSTER_IMAGE_BUCKET)
            .getPublicUrl(dumpster.image_path).data.publicUrl
        : null,
    }),
  )) as DumpsterRow[]) ?? [];
  // Ready-to-rent containers first, retired last. Display status is resolved
  // here rather than during render so the list can be ordered by it.
  const statusRank = (status: string): number => {
    if (status === "available") return 0;
    if (status === "reserved") return 1;
    if (status === "retired") return 3;
    return 2;
  };

  const inventory = dumpsters
    .map((dumpster) => {
      const activeAssignment =
        dumpster.dumpster_assignments?.find(
          (assignment) =>
            activeAssignmentStatuses.has(assignment.status) &&
            isAssignmentActiveOnDate(assignment, todayDenver),
        ) ?? null;
      return {
        dumpster,
        activeAssignment,
        displayStatus: resolveDisplayStatus(dumpster.status, activeAssignment),
      };
    })
    // Stable sort, so asset_number order from the query is preserved within a
    // status group.
    .sort((a, b) => statusRank(a.displayStatus) - statusRank(b.displayStatus));

  const sizes = (sizesResult.data as Array<{ id: string; name: string }> | null) ?? [];
  const serviceItems =
    (serviceItemsResult.data as Array<{ id: string; name: string }> | null) ?? [];

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dumpster inventory</h1>
        <p className={styles.pageSub}>
          Track each container, its status, and where it is.
        </p>
      </div>

      {!supportsServiceItemAssignments ? (
        <p className={styles.notice} role="status">
          Booking package assignments are not saving in this environment because the
          `dumpsters.service_item_id` column is missing from the live database. Price
          and inventory edits still save normally.
        </p>
      ) : null}

      <AddDumpsterForm
        sizes={sizes}
        serviceItems={serviceItems}
        supportsServiceItemAssignments={supportsServiceItemAssignments}
      />

      {dumpsters.length === 0 ? (
        <div className={styles.tableWrap}>
          <p className={styles.empty}>
            No dumpsters yet. Add your first container above.
          </p>
        </div>
      ) : (
        <ul className={styles.inventoryGrid}>
          {inventory.map(({ dumpster, activeAssignment, displayStatus }) => {
            const booking = activeAssignment?.bookings ?? null;
            const address = booking?.customer_addresses ?? null;

            return (
              <li
                className={`${styles.inventoryCard} ${
                  displayStatus === "available"
                    ? styles.inventoryCardAvailable
                    : displayStatus === "reserved"
                      ? styles.inventoryCardReserved
                      : displayStatus === "retired"
                        ? styles.inventoryCardRetired
                        : ""
                }`}
                key={dumpster.id}
              >
                <div className={styles.inventoryCardHead}>
                  {dumpster.image_public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={dumpster.image_public_url}
                      alt={`${dumpster.asset_number} dumpster`}
                      className={styles.inventoryCardThumb}
                    />
                  ) : (
                    <span
                      className={`${styles.inventoryCardThumb} ${styles.inventoryCardThumbEmpty}`}
                      aria-hidden="true"
                    >
                      —
                    </span>
                  )}
                  <div>
                    <p className={styles.inventoryCardTitle}>
                      {dumpster.asset_number}
                    </p>
                    <p className={styles.inventoryCardMeta}>
                      {dumpster.dumpster_sizes?.name ?? "—"}
                      {dumpster.service_items?.name
                        ? ` • ${dumpster.service_items.name}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`${styles.statusPill} ${styles.inventoryCardStatus} ${
                      displayStatus === "available"
                        ? styles.statusPillAvailable
                        : displayStatus === "reserved"
                          ? styles.statusPillReserved
                          : ""
                    }`}
                  >
                    {humanizeStatus(displayStatus)}
                  </span>
                </div>

                <dl className={styles.inventoryFacts}>
                  <div>
                    <dt>Price</dt>
                    <dd className={styles.inventoryPrice}>
                      {dumpster.rental_price_cents != null
                        ? formatCents(dumpster.rental_price_cents)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Max weight</dt>
                    <dd>
                      {dumpster.max_weight_tons != null
                        ? `${dumpster.max_weight_tons} tons`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Rental options</dt>
                    <dd>{formatRentalDurations(dumpster.rental_duration_days)}</dd>
                  </div>
                  <div>
                    <dt>Dimensions</dt>
                    <dd>{formatDimensions(dumpster.dumpster_sizes)}</dd>
                  </div>
                  <div>
                    <dt>Location</dt>
                    <dd>{dumpster.current_location ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Availability</dt>
                    <dd>
                      {displayStatus === "available" ? (
                        <span className={styles.availableNow}>
                          <CheckCircleIcon />
                          Available now
                        </span>
                      ) : (
                        formatAvailability(displayStatus, activeAssignment)
                      )}
                    </dd>
                  </div>
                  <div className={styles.inventoryFactFull}>
                    <dt>Current booking</dt>
                    <dd>
                      {booking ? (
                        <>
                          #{booking.booking_number}
                          {address
                            ? ` • ${address.address_line_1}, ${address.city}`
                            : ""}
                        </>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                  <div className={styles.inventoryFactFull}>
                    <dt>Materials allowed</dt>
                    <dd>{formatMaterials(dumpster.materials_allowed)}</dd>
                  </div>
                  <div className={styles.inventoryFactFull}>
                    <dt className={styles.factLabelDanger}>
                      Materials not allowed
                    </dt>
                    <dd className={styles.materialsDanger}>
                      {formatMaterials(dumpster.materials_not_allowed)}
                    </dd>
                  </div>
                </dl>

                <EditDetailsForm
                    dumpster={{
                      id: dumpster.id,
                      dumpsterSizeId: dumpster.dumpster_sizes?.id ?? "",
                      serviceItemId: dumpster.service_item_id,
                      assetNumber: dumpster.asset_number,
                      imagePublicUrl: dumpster.image_public_url ?? null,
                    currentLocation: dumpster.current_location,
                    conditionNotes: dumpster.condition_notes,
                    imagePath: dumpster.image_path,
                    rentalPriceCents: dumpster.rental_price_cents,
                    maxWeightTons: dumpster.max_weight_tons,
                    materialsAllowed: dumpster.materials_allowed,
                    materialsNotAllowed: dumpster.materials_not_allowed,
                    rentalDurationDays: dumpster.rental_duration_days,
                    lengthFeet: dumpster.dumpster_sizes?.length_feet ?? null,
                    widthFeet: dumpster.dumpster_sizes?.width_feet ?? null,
                    wallHeightFeet: dumpster.dumpster_sizes?.wall_height_feet ?? null,
                    }}
                    serviceItems={serviceItems}
                    supportsServiceItemAssignments={supportsServiceItemAssignments}
                />

                <div className={styles.inventoryCardActions}>
                  <UpdateStatusForm
                    id={dumpster.id}
                    assetNumber={dumpster.asset_number}
                    status={dumpster.status}
                  />
                  {canDeleteDumpster(dumpster) ? (
                    <form action={deleteDumpster}>
                      <input type="hidden" name="id" value={dumpster.id} />
                      <button
                        type="submit"
                        className={styles.iconDangerButton}
                        aria-label={`Delete dumpster ${dumpster.asset_number}`}
                        title={`Delete dumpster ${dumpster.asset_number}`}
                      >
                        <TrashIcon />
                      </button>
                    </form>
                  ) : (
                    <span
                      className={styles.lockedIcon}
                      aria-label="Locked"
                      title="Locked"
                    >
                      <LockIcon />
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
