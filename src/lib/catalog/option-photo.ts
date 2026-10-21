/**
 * Option photos come from the physical dumpsters, never a separate upload.
 * An option shows the photo of the dumpster chosen for it (photo_dumpster_id);
 * if none is chosen, or that dumpster has no photo or is retired, it shows the
 * first in-service dumpster of the same size that has one.
 */
export type PhotoDumpster = {
  id: string;
  asset_number: string;
  dumpster_size_id: string | null;
  image_path: string | null;
  status: string;
};

export type PhotoOption = {
  dumpster_size_id: string | null;
  photo_dumpster_id: string | null;
};

/** In-service dumpsters of one size that have a photo, by dumpster number. */
export function photoDumpstersForSize(
  dumpsters: readonly PhotoDumpster[],
  sizeId: string | null,
): PhotoDumpster[] {
  return dumpsters
    .filter(
      (dumpster) =>
        dumpster.image_path &&
        dumpster.status !== "retired" &&
        dumpster.dumpster_size_id === sizeId,
    )
    .sort((a, b) => a.asset_number.localeCompare(b.asset_number));
}

export function resolveOptionPhotoPath(
  option: PhotoOption,
  dumpsters: readonly PhotoDumpster[],
): string | null {
  const candidates = photoDumpstersForSize(dumpsters, option.dumpster_size_id);
  const chosen = option.photo_dumpster_id
    ? candidates.find((dumpster) => dumpster.id === option.photo_dumpster_id)
    : undefined;
  return (chosen ?? candidates[0])?.image_path ?? null;
}
