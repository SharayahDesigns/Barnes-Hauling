"use client";

import { useEffect, type ReactNode } from "react";

import styles from "../../admin.module.scss";
import { PlusIcon } from "./inventory-icons";

/**
 * Shared pop-up shell for the inventory add/edit forms. The form itself is
 * passed as children and linked to the footer's submit button by `formId`.
 */
export function InventoryModal({
  id,
  title,
  subtitle,
  formId,
  submitLabel,
  pending,
  onClose,
  children,
}: Readonly<{
  id: string;
  title: string;
  subtitle?: string;
  formId: string;
  submitLabel: string;
  pending: boolean;
  onClose: () => void;
  children: ReactNode;
}>) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, pending]);

  return (
    <div
      className={styles.editModalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      id={id}
      onClick={() => {
        if (!pending) onClose();
      }}
    >
      <div className={styles.editModalCard} onClick={(event) => event.stopPropagation()}>
        <div className={styles.editModalHeader}>
          <div>
            <h2 id={`${id}-title`} className={styles.editModalTitle}>
              {title}
            </h2>
            {subtitle ? <p className={styles.editModalSub}>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className={styles.editModalClose}
            onClick={onClose}
            disabled={pending}
            aria-label={`Close ${title}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        {children}
        <div className={styles.editModalFooter}>
          <div className={styles.editModalActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="submit"
              form={formId}
              className={styles.editSaveButton}
              disabled={pending}
            >
              {pending ? "Saving…" : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small "+ Add …" button used in each table's heading row. */
export function AddButton({
  label,
  onClick,
  expanded,
  controls,
}: Readonly<{ label: string; onClick: () => void; expanded: boolean; controls: string }>) {
  return (
    <button
      type="button"
      className={styles.tableAddButton}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-controls={controls}
    >
      <PlusIcon />
      {label}
    </button>
  );
}
