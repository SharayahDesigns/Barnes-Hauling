import "server-only";

const STATIC_MAPS_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;

export function placementSnapshotUrl(
  latitude: number | string | null,
  longitude: number | string | null,
  options?: {
    zoom?: number;
    width?: number;
    height?: number;
    scale?: 1 | 2;
  },
): string | null {
  const lat = typeof latitude === "string" ? Number(latitude) : latitude;
  const lng = typeof longitude === "string" ? Number(longitude) : longitude;

  if (
    !STATIC_MAPS_KEY ||
    lat == null ||
    lng == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: String(options?.zoom ?? 20),
    size: `${options?.width ?? 1200}x${options?.height ?? 800}`,
    scale: String(options?.scale ?? 2),
    maptype: "satellite",
    markers: `color:green|label:D|${lat},${lng}`,
    key: STATIC_MAPS_KEY,
  });

  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}
