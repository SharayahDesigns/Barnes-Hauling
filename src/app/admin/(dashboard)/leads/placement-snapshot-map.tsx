"use client";

import { useEffect, useRef, useState } from "react";

import { loadGoogleMaps } from "@/lib/maps/loader";

import styles from "../../admin.module.scss";

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type SnapshotMapProps = {
  latitude: number | null;
  longitude: number | null;
  label: string;
  compact?: boolean;
};

export function PlacementSnapshotMap({
  latitude,
  longitude,
  label,
  compact = false,
}: Readonly<SnapshotMapProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "error">("idle");

  useEffect(() => {
    if (
      !MAPS_API_KEY ||
      !containerRef.current ||
      latitude == null ||
      longitude == null
    ) {
      return;
    }

    let cancelled = false;

    loadGoogleMaps(MAPS_API_KEY)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        const center = { lat: latitude, lng: longitude };
        const map = new maps.maps.Map(containerRef.current, {
          center,
          zoom: compact ? 18 : 20,
          mapTypeId: "satellite",
          disableDefaultUI: true,
          gestureHandling: "none",
          keyboardShortcuts: false,
          clickableIcons: false,
        });

        new maps.maps.Marker({
          map,
          position: center,
          title: label,
        });

        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [compact, label, latitude, longitude]);

  if (latitude == null || longitude == null) {
    return <span>—</span>;
  }

  if (!MAPS_API_KEY) {
    return <span>Map unavailable</span>;
  }

  return (
    <div className={styles.snapshotMapWrap}>
      <div
        ref={containerRef}
        className={compact ? styles.tableSnapshotMap : styles.detailSnapshotMap}
        aria-label={label}
      />
      {status === "error" ? (
        <span className={styles.snapshotMapFallback}>Map unavailable</span>
      ) : null}
    </div>
  );
}
