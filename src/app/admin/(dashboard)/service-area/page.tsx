import { createPageMetadata } from "@/lib/page-metadata";
import {
  removePostalCode,
  setAreaStatus,
  setZoneStatus,
} from "@/lib/admin/service-area";
import { createAdminClient } from "@/lib/supabase/admin";

import styles from "../../admin.module.scss";
import { AddCoverageForm } from "./add-coverage-form";

export const metadata = createPageMetadata(
  "Service area",
  "Manage Barnes service-area ZIP coverage.",
  "/admin/service-area",
  { noIndex: true },
);

type PostalRow = { id: string; postal_code: string };
type ZoneRow = {
  id: string;
  name: string;
  status: string;
  service_zone_postal_codes: PostalRow[] | null;
};
type AreaRow = {
  id: string;
  name: string;
  status: string;
  service_zones: ZoneRow[] | null;
};

export default async function ServiceAreaPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("service_areas")
    .select(
      "id, name, status, service_zones(id, name, status, service_zone_postal_codes(id, postal_code))",
    )
    .order("name");

  const areas = (data as AreaRow[] | null) ?? [];

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Service area</h1>
        <p className={styles.pageSub}>
          ZIP codes here control the booking flow&apos;s coverage check. Only
          ZIPs in an active area and active zone count as covered.
        </p>
      </div>

      <AddCoverageForm />

      {areas.length === 0 ? (
        <div className={styles.tableWrap}>
          <p className={styles.empty}>
            No service areas yet. Add coverage above.
          </p>
        </div>
      ) : (
        areas.map((area) => (
          <div key={area.id} className={styles.card}>
            <div className={styles.areaHead}>
              <div>
                <h2 className={styles.cardTitle} style={{ marginBottom: 0 }}>
                  {area.name}
                </h2>
                <span className={styles.statusPill}>{area.status}</span>
              </div>
              <form action={setAreaStatus}>
                <input type="hidden" name="id" value={area.id} />
                <input
                  type="hidden"
                  name="status"
                  value={area.status === "active" ? "inactive" : "active"}
                />
                <button type="submit" className={styles.smallButton}>
                  {area.status === "active" ? "Deactivate" : "Activate"}
                </button>
              </form>
            </div>

            {(area.service_zones ?? []).map((zone) => (
              <div key={zone.id} className={styles.zoneBlock}>
                <div className={styles.areaHead}>
                  <div>
                    <strong>{zone.name}</strong>{" "}
                    <span className={styles.statusPill}>{zone.status}</span>
                  </div>
                  <form action={setZoneStatus}>
                    <input type="hidden" name="id" value={zone.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={zone.status === "active" ? "inactive" : "active"}
                    />
                    <button type="submit" className={styles.smallButton}>
                      {zone.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </form>
                </div>
                <div className={styles.chips}>
                  {(zone.service_zone_postal_codes ?? []).length === 0 ? (
                    <span className={styles.pageSub}>No ZIP codes yet.</span>
                  ) : (
                    (zone.service_zone_postal_codes ?? []).map((zip) => (
                      <span key={zip.id} className={styles.chip}>
                        {zip.postal_code}
                        <form action={removePostalCode}>
                          <input type="hidden" name="id" value={zip.id} />
                          <button
                            type="submit"
                            className={styles.chipRemove}
                            aria-label={`Remove ${zip.postal_code}`}
                          >
                            ×
                          </button>
                        </form>
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </>
  );
}
