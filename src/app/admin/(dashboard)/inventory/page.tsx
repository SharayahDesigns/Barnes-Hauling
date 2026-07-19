import { createPageMetadata } from "@/lib/page-metadata";
import { humanizeStatus } from "@/lib/admin/dumpster-status";
import { deleteDumpster } from "@/lib/admin/inventory";
import { createAdminClient } from "@/lib/supabase/admin";

import styles from "../../admin.module.scss";
import { AddDumpsterForm } from "./add-dumpster-form";
import { UpdateStatusForm } from "./update-status-form";

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
  current_location: string | null;
  assignment_count: number;
  status_history_count: number;
  active_assignment_count: number;
  dumpster_sizes: { name: string } | null;
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

function canDeleteDumpster(dumpster: DumpsterRow): boolean {
  if (dumpster.active_assignment_count > 0) return false;
  if (dumpster.assignment_count === 0 && dumpster.status_history_count === 0) return true;
  return dumpster.status === "retired";
}

export default async function InventoryPage() {
  const supabase = createAdminClient();

  const [dumpstersResult, sizesResult, assignmentsResult, historyResult] =
    await Promise.all([
    supabase
      .from("dumpsters")
      .select(
        "id, asset_number, status, current_location, dumpster_sizes(name), dumpster_assignments(status, starts_at, ends_at, bookings(booking_number, customer_addresses(address_line_1, city)))",
      )
      .order("asset_number"),
    supabase
      .from("dumpster_sizes")
      .select("id, name")
      .eq("status", "active")
      .order("capacity_cubic_yards"),
    supabase.from("dumpster_assignments").select("id, dumpster_id, status"),
    supabase.from("dumpster_status_history").select("id, dumpster_id"),
  ]);

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

  const dumpsters = (((dumpstersResult.data as DumpsterRow[] | null) ?? []).map((dumpster) => ({
    ...dumpster,
    assignment_count: assignmentCountByDumpster.get(dumpster.id) ?? 0,
    active_assignment_count: activeAssignmentCountByDumpster.get(dumpster.id) ?? 0,
    status_history_count: historyCountByDumpster.get(dumpster.id) ?? 0,
  })) as DumpsterRow[]) ?? [];
  const sizes = (sizesResult.data as Array<{ id: string; name: string }> | null) ?? [];

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Dumpster inventory</h1>
        <p className={styles.pageSub}>
          Track each container, its status, and where it is.
        </p>
      </div>

      <AddDumpsterForm sizes={sizes} />

      <div className={styles.tableWrap}>
        {dumpsters.length === 0 ? (
          <p className={styles.empty}>
            No dumpsters yet. Add your first container above.
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Asset #</th>
                <th>Size</th>
                <th>Location</th>
                <th>Status</th>
                <th>Current booking</th>
                <th>Availability</th>
                <th>Update status</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {dumpsters.map((dumpster) => {
                const activeAssignment =
                  dumpster.dumpster_assignments?.find((assignment) =>
                    activeAssignmentStatuses.has(assignment.status),
                  ) ?? null;
                const booking = activeAssignment?.bookings ?? null;
                const address = booking?.customer_addresses ?? null;

                return (
                  <tr key={dumpster.id}>
                    <td>{dumpster.asset_number}</td>
                    <td>{dumpster.dumpster_sizes?.name ?? "—"}</td>
                    <td>{dumpster.current_location ?? "—"}</td>
                    <td>
                      <span className={styles.statusPill}>
                        {humanizeStatus(dumpster.status)}
                      </span>
                    </td>
                    <td>
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
                    </td>
                    <td>{formatAvailability(dumpster.status, activeAssignment)}</td>
                    <td>
                      <UpdateStatusForm
                        id={dumpster.id}
                        assetNumber={dumpster.asset_number}
                        status={dumpster.status}
                      />
                    </td>
                    <td>
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
