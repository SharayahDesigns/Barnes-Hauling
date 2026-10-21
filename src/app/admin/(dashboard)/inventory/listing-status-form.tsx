import { setServiceItemStatus } from "@/lib/admin/service-items";

import styles from "../../admin.module.scss";

/** Archive hides an option from the booking page; Restore brings it back. */
export function ListingStatusForm({
  id,
  name,
  archived,
}: Readonly<{ id: string; name: string; archived: boolean }>) {
  return (
    <form action={setServiceItemStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={archived ? "active" : "inactive"} />
      <button
        type="submit"
        className={styles.tableAction}
        aria-label={`${archived ? "Restore" : "Archive"} option ${name}`}
      >
        {archived ? "Restore" : "Archive"}
      </button>
    </form>
  );
}
