"use client";

import { useEffect } from "react";

import { clearBookingDraft } from "../draft-storage";

/** Payment went through, so the saved in-progress booking is no longer needed. */
export function ClearBookingDraft() {
  useEffect(() => {
    clearBookingDraft();
  }, []);
  return null;
}
