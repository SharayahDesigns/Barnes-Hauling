import { formatCents } from "@/config/public-content";
import { createPageMetadata } from "@/lib/page-metadata";
import { humanizeStatus, isAssignmentActive } from "@/lib/admin/dumpster-status";
import {
  photoDumpstersForSize,
  resolveOptionPhotoPath,
  type PhotoDumpster,
} from "@/lib/catalog/option-photo";
import { deleteDumpster } from "@/lib/admin/inventory";
import { createAdminClient } from "@/lib/supabase/admin";

import styles from "../../admin.module.scss";
import { AddDumpsterForm } from "./add-dumpster-form";
import { AddListingForm } from "./add-listing-form";
import { AddSizeForm } from "./add-size-form";
import { EditDetailsForm } from "./edit-details-form";
import { ListingStatusForm } from "./listing-status-form";
import type { PhotoChoice } from "./photo-picker";
import { ServiceItemPricingForm } from "./service-item-pricing-form";
import { UpdateStatusForm } from "./update-status-form";

const DUMPSTER_IMAGE_BUCKET = "dumpster-images";

export const metadata = createPageMetadata(
  "Dumpster inventory",
  "Manage Barnes dumpster inventory.",
  "/admin/inventory",
  { noIndex: true },
);

type SizeRow = {
  id: string;
  name: string;
  status: string;
  capacity_cubic_yards: number;
  length_feet: number | null;
  width_feet: number | null;
  wall_height_feet: number | null;
};

type DumpsterAssignmentRow = {
  status: string;
  starts_at: string;
  ends_at: string;
  bookings: {
    booking_number: number;
    customer_addresses: { address_line_1: string; city: string } | null;
  } | null;
};

type DumpsterRow = {
  id: string;
  asset_number: string;
  status: string;
  dumpster_size_id: string;
  current_location: string | null;
  condition_notes: string | null;
  image_path: string | null;
  dumpster_assignments: DumpsterAssignmentRow[] | null;
};

type ServiceItemRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  dumpster_size_id: string | null;
  photo_dumpster_id: string | null;
  rental_price_cents: number | null;
  max_weight_tons: number | null;
  materials_allowed: string[];
  materials_not_allowed: string[];
  rental_duration_days: number[];
};

// Statuses staff set when a container can't go out.
const unavailableStatuses = new Set([
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "America/Denver",
  }).format(new Date(value));
}

function denverDateKey(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function formatMaterials(materials: string[]): string {
  return materials.length === 0 ? "—" : materials.join(", ");
}

function formatRentalDurations(days: number[]): string {
  return days.length === 0 ? "—" : days.map((day) => `${day}-day`).join(", ");
}

function formatDimensions(size: SizeRow): string {
  if (!size.length_feet || !size.width_feet) return "Dimensions not set";
  const walls = size.wall_height_feet ? ` × ${size.wall_height_feet} ft walls` : "";
  return `${size.width_feet} ft × ${size.length_feet} ft${walls}`;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

type ContainerView = {
  dumpster: DumpsterRow;
  imageUrl: string | null;
  displayStatus: string;
  currentAssignment: DumpsterAssignmentRow | null;
  nextAssignment: DumpsterAssignmentRow | null;
  activeAssignmentCount: number;
  assignmentCount: number;
  historyCount: number;
};

/**
 * "Reserved" is derived from bookings, never read from the dumpster's own
 * status column: a dumpster is reserved only while a booking window covers
 * today. Operational states staff set (at customer, maintenance, ...) win.
 */
function resolveDisplayStatus(
  status: string,
  currentAssignment: DumpsterAssignmentRow | null,
): string {
  if (unavailableStatuses.has(status)) return status;
  if (status !== "available" && status !== "reserved") return status;
  return currentAssignment ? "reserved" : "available";
}

function canDeleteContainer(view: ContainerView): boolean {
  if (view.activeAssignmentCount > 0) return false;
  if (view.assignmentCount === 0 && view.historyCount === 0) return true;
  return view.dumpster.status === "retired";
}

/** Drops a leading "15-Yard Dumpster —" since the section already names the size. */
function shortOptionName(name: string, sizeName: string): string {
  if (!name.startsWith(sizeName)) return name;
  const rest = name.slice(sizeName.length).replace(/^[\s—–:-]+/, "").trim();
  return rest || name;
}

function Thumb({ url, alt }: Readonly<{ url: string | null; alt: string }>) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={alt} className={styles.invThumb} loading="lazy" />
  ) : (
    <span className={`${styles.invThumb} ${styles.invThumbEmpty}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m21 16-5-5-9 8" />
      </svg>
    </span>
  );
}

function bookingLabel(assignment: DumpsterAssignmentRow): string {
  const number = assignment.bookings ? `#${assignment.bookings.booking_number} · ` : "";
  return `${number}${formatDate(assignment.starts_at)} – ${formatDate(assignment.ends_at)}`;
}

function OptionsTable({
  items,
  sizeName,
  publicUrl,
  photoDumpsters,
  photoChoices,
  caption,
}: Readonly<{
  items: ServiceItemRow[];
  sizeName: string;
  publicUrl: (path: string | null) => string | null;
  photoDumpsters: readonly PhotoDumpster[];
  photoChoices: readonly PhotoChoice[];
  caption: string;
}>) {
  return (
    <div className={styles.invTableWrap}>
      <table className={styles.invTable}>
        <caption className={styles.visuallyHidden}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Option</th>
            <th scope="col">Price</th>
            <th scope="col">Max weight</th>
            <th scope="col">Rental days</th>
            <th scope="col">Materials</th>
            <th scope="col">
              <span className={styles.visuallyHidden}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const archived = item.status !== "active";
            return (
              <tr key={item.id} className={archived ? styles.invRowMuted : undefined}>
                <td data-label="Option">
                  <div className={styles.invNameCell}>
                    <Thumb
                      url={publicUrl(resolveOptionPhotoPath(item, photoDumpsters))}
                      alt={`Photo customers see for ${item.name}`}
                    />
                    <div>
                      <span className={styles.invPrimary}>
                        {shortOptionName(item.name, sizeName)}
                      </span>
                      {item.description ? (
                        <span className={styles.cellMeta}>{item.description}</span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td data-label="Price">
                  <span className={styles.invPrimary}>
                    {item.rental_price_cents != null
                      ? formatCents(item.rental_price_cents)
                      : "Quote required"}
                  </span>
                </td>
                <td data-label="Max weight">
                  {item.max_weight_tons != null ? `${item.max_weight_tons} tons` : "—"}
                </td>
                <td data-label="Rental days">
                  {formatRentalDurations(item.rental_duration_days)}
                </td>
                <td data-label="Materials" className={styles.invWrap}>
                  <span className={styles.invAllowed}>
                    <span aria-hidden="true">✓ </span>
                    <span className={styles.visuallyHidden}>Allowed: </span>
                    {formatMaterials(item.materials_allowed)}
                  </span>
                  <span className={styles.invNotAllowed}>
                    <span aria-hidden="true">✕ </span>
                    <span className={styles.visuallyHidden}>Not allowed: </span>
                    {formatMaterials(item.materials_not_allowed)}
                  </span>
                </td>
                <td data-label="" className={styles.invActions}>
                  {archived ? null : (
                    <ServiceItemPricingForm
                      serviceItem={{
                        id: item.id,
                        code: item.code,
                        name: item.name,
                        description: item.description,
                        photoDumpsterId: item.photo_dumpster_id,
                        rentalPriceCents: item.rental_price_cents,
                        maxWeightTons: item.max_weight_tons,
                        materialsAllowed: item.materials_allowed,
                        materialsNotAllowed: item.materials_not_allowed,
                        rentalDurationDays: item.rental_duration_days,
                      }}
                      sizeName={sizeName}
                      photoChoices={photoChoices}
                    />
                  )}
                  <ListingStatusForm id={item.id} name={item.name} archived={archived} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DumpstersTable({
  views,
  size,
  caption,
}: Readonly<{ views: ContainerView[]; size: SizeRow; caption: string }>) {
  return (
    <div className={styles.invTableWrap}>
      <table className={styles.invTable}>
        <caption className={styles.visuallyHidden}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Dumpster</th>
            <th scope="col">Status</th>
            <th scope="col">Location</th>
            <th scope="col">Booking</th>
            <th scope="col">Set status</th>
            <th scope="col">
              <span className={styles.visuallyHidden}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {views.map((view) => {
            const { dumpster, displayStatus, currentAssignment, nextAssignment } = view;
            const address = currentAssignment?.bookings?.customer_addresses ?? null;
            return (
              <tr
                key={dumpster.id}
                className={dumpster.status === "retired" ? styles.invRowMuted : undefined}
              >
                <td data-label="Dumpster">
                  <div className={styles.invNameCell}>
                    <Thumb url={view.imageUrl} alt={`Photo of dumpster ${dumpster.asset_number}`} />
                    <div>
                      <span className={styles.invPrimary}>{dumpster.asset_number}</span>
                      {dumpster.condition_notes ? (
                        <span className={styles.cellMeta}>{dumpster.condition_notes}</span>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td data-label="Status">
                  <span
                    className={`${styles.statusPill} ${
                      displayStatus === "available"
                        ? styles.statusPillAvailable
                        : displayStatus === "reserved"
                          ? styles.statusPillReserved
                          : ""
                    }`}
                  >
                    {humanizeStatus(displayStatus)}
                  </span>
                </td>
                <td data-label="Location">{dumpster.current_location ?? "—"}</td>
                <td data-label="Booking" className={styles.invWrap}>
                  {currentAssignment ? (
                    <>
                      <span className={styles.invPrimary}>
                        Now: {bookingLabel(currentAssignment)}
                      </span>
                      {address ? (
                        <span className={styles.cellMeta}>
                          {address.address_line_1}, {address.city}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                  {nextAssignment ? (
                    <span className={styles.cellMeta}>Next: {bookingLabel(nextAssignment)}</span>
                  ) : null}
                  {!currentAssignment && !nextAssignment ? "None scheduled" : null}
                </td>
                <td data-label="Set status">
                  <UpdateStatusForm
                    id={dumpster.id}
                    assetNumber={dumpster.asset_number}
                    status={dumpster.status}
                  />
                </td>
                <td data-label="" className={styles.invActions}>
                  <EditDetailsForm
                    dumpster={{
                      id: dumpster.id,
                      dumpsterSizeId: dumpster.dumpster_size_id,
                      assetNumber: dumpster.asset_number,
                      imagePublicUrl: view.imageUrl,
                      currentLocation: dumpster.current_location,
                      conditionNotes: dumpster.condition_notes,
                      imagePath: dumpster.image_path,
                      lengthFeet: size.length_feet,
                      widthFeet: size.width_feet,
                      wallHeightFeet: size.wall_height_feet,
                    }}
                  />
                  {canDeleteContainer(view) ? (
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
                      role="img"
                      aria-label="Can't delete: this dumpster has booking history"
                      title="Can't delete: this dumpster has booking history"
                    >
                      <LockIcon />
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function InventoryPage() {
  const supabase = createAdminClient();
  const now = new Date();
  const todayKey = denverDateKey(now);

  const [sizesResult, dumpstersResult, serviceItemsResult, assignmentsResult, historyResult] =
    await Promise.all([
      supabase
        .from("dumpster_sizes")
        .select("id, name, status, capacity_cubic_yards, length_feet, width_feet, wall_height_feet")
        .order("capacity_cubic_yards"),
      supabase
        .from("dumpsters")
        .select(
          "id, asset_number, status, dumpster_size_id, current_location, condition_notes, image_path, dumpster_assignments(status, starts_at, ends_at, bookings(booking_number, customer_addresses(address_line_1, city)))",
        )
        .order("asset_number"),
      supabase
        .from("service_items")
        .select(
          "id, code, name, description, status, dumpster_size_id, photo_dumpster_id, rental_price_cents, max_weight_tons, materials_allowed, materials_not_allowed, rental_duration_days",
        )
        .eq("item_kind", "rental_package")
        .order("sort_order"),
      supabase.from("dumpster_assignments").select("dumpster_id"),
      supabase.from("dumpster_status_history").select("dumpster_id"),
    ]);

  const loadError =
    sizesResult.error ?? dumpstersResult.error ?? serviceItemsResult.error ?? null;
  if (loadError) {
    console.error("admin/inventory: load failed", loadError);
  }

  const countBy = (rows: Array<{ dumpster_id: string }> | null) => {
    const counts = new Map<string, number>();
    for (const row of rows ?? []) {
      counts.set(row.dumpster_id, (counts.get(row.dumpster_id) ?? 0) + 1);
    }
    return counts;
  };
  const assignmentCounts = countBy(
    assignmentsResult.data as Array<{ dumpster_id: string }> | null,
  );
  const historyCounts = countBy(historyResult.data as Array<{ dumpster_id: string }> | null);

  const publicUrl = (path: string | null) =>
    path ? supabase.storage.from(DUMPSTER_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl : null;

  const containers: ContainerView[] = (
    (dumpstersResult.data as unknown as DumpsterRow[] | null) ?? []
  ).map((dumpster) => {
    const active = (dumpster.dumpster_assignments ?? [])
      .filter((assignment) => isAssignmentActive(assignment, now))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const currentAssignment =
      active.find((assignment) => denverDateKey(assignment.starts_at) <= todayKey) ?? null;
    const nextAssignment =
      active.find((assignment) => denverDateKey(assignment.starts_at) > todayKey) ?? null;
    return {
      dumpster,
      imageUrl: publicUrl(dumpster.image_path),
      displayStatus: resolveDisplayStatus(dumpster.status, currentAssignment),
      currentAssignment,
      nextAssignment,
      activeAssignmentCount: active.length,
      assignmentCount: assignmentCounts.get(dumpster.id) ?? 0,
      historyCount: historyCounts.get(dumpster.id) ?? 0,
    };
  });

  const listings = (serviceItemsResult.data as unknown as ServiceItemRow[] | null) ?? [];
  const sizes = ((sizesResult.data as unknown as SizeRow[] | null) ?? []).filter(
    (size) =>
      size.status === "active" ||
      containers.some((view) => view.dumpster.dumpster_size_id === size.id) ||
      listings.some((item) => item.dumpster_size_id === size.id),
  );

  const photoDumpsters: PhotoDumpster[] = containers.map((view) => ({
    id: view.dumpster.id,
    asset_number: view.dumpster.asset_number,
    dumpster_size_id: view.dumpster.dumpster_size_id,
    image_path: view.dumpster.image_path,
    status: view.dumpster.status,
  }));
  const photoChoicesForSize = (sizeId: string): PhotoChoice[] =>
    photoDumpstersForSize(photoDumpsters, sizeId).map((dumpster) => ({
      id: dumpster.id,
      assetNumber: dumpster.asset_number,
      imageUrl: publicUrl(dumpster.image_path) ?? "",
    }));

  const statusRank = (status: string) =>
    status === "available" ? 0 : status === "reserved" ? 1 : 2;

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dumpster inventory</h1>
        <p className={styles.pageSub}>
          Each size shows the options customers can book (with price, weight,
          and materials) and the dumpsters you own. Any dumpster of a size can
          be sent out for any of that size&apos;s options.
        </p>
      </div>

      {loadError ? (
        <p className={styles.error} role="alert">
          Some inventory could not be loaded. Refresh the page to try again.
        </p>
      ) : null}

      {sizes.length === 0 ? (
        <div className={styles.tableWrap}>
          <p className={styles.empty}>No dumpster sizes yet. Add your first size below.</p>
        </div>
      ) : null}

      {sizes.map((size) => {
        const sizeContainers = containers
          .filter((view) => view.dumpster.dumpster_size_id === size.id)
          .sort((a, b) => statusRank(a.displayStatus) - statusRank(b.displayStatus));
        const inService = sizeContainers.filter((view) => view.dumpster.status !== "retired");
        const retired = sizeContainers.filter((view) => view.dumpster.status === "retired");
        const sizeListings = listings.filter((item) => item.dumpster_size_id === size.id);
        const activeListings = sizeListings.filter((item) => item.status === "active");
        const archivedListings = sizeListings.filter((item) => item.status !== "active");
        const headingId = `size-${size.id}`;
        const photoChoices = photoChoicesForSize(size.id);

        let warning: string | null = null;
        if (activeListings.length > 0 && inService.length === 0) {
          warning = "Customers can't book this size yet: add at least one dumpster.";
        } else if (inService.length > 0 && activeListings.length === 0) {
          warning = "Customers can't book this size yet: add at least one option.";
        }

        return (
          <section key={size.id} className={styles.sizeSection} aria-labelledby={headingId}>
            <header>
              <h2 id={headingId} className={styles.sizeSectionTitle}>
                {size.name}
              </h2>
              <p className={styles.sizeSectionMeta}>
                {formatDimensions(size)} · {plural(inService.length, "dumpster")} ·{" "}
                {plural(activeListings.length, "option")}
              </p>
            </header>

            {warning ? (
              <p className={styles.sizeWarning} role="status">
                {warning}
              </p>
            ) : null}

            <div className={styles.invBlock}>
              <div className={styles.invBlockHead}>
                <h3 className={styles.invBlockTitle}>Options customers book</h3>
                <AddListingForm
                  sizeId={size.id}
                  sizeName={size.name}
                  photoChoices={photoChoices}
                />
              </div>
              {activeListings.length === 0 ? (
                <p className={styles.invEmpty}>No options yet for this size.</p>
              ) : (
                <OptionsTable
                  items={activeListings}
                  sizeName={size.name}
                  publicUrl={publicUrl}
                  photoDumpsters={photoDumpsters}
                  photoChoices={photoChoices}
                  caption={`${size.name} options customers book`}
                />
              )}
              {archivedListings.length > 0 ? (
                <details className={styles.sizeArchived}>
                  <summary>Archived options ({archivedListings.length})</summary>
                  <OptionsTable
                    items={archivedListings}
                    sizeName={size.name}
                    publicUrl={publicUrl}
                    photoDumpsters={photoDumpsters}
                    photoChoices={photoChoices}
                    caption={`${size.name} archived options`}
                  />
                </details>
              ) : null}
            </div>

            <div className={styles.invBlock}>
              <div className={styles.invBlockHead}>
                <h3 className={styles.invBlockTitle}>
                  Dumpsters you own ({inService.length})
                </h3>
                <AddDumpsterForm sizeId={size.id} sizeName={size.name} />
              </div>
              {inService.length === 0 ? (
                <p className={styles.invEmpty}>No dumpsters of this size yet.</p>
              ) : (
                <DumpstersTable
                  views={inService}
                  size={size}
                  caption={`${size.name} dumpsters you own`}
                />
              )}
              {retired.length > 0 ? (
                <details className={styles.sizeArchived}>
                  <summary>Retired dumpsters ({retired.length})</summary>
                  <DumpstersTable
                    views={retired}
                    size={size}
                    caption={`${size.name} retired dumpsters`}
                  />
                </details>
              ) : null}
            </div>
          </section>
        );
      })}

      <div className={styles.invFooter}>
        <AddSizeForm />
      </div>
    </>
  );
}
