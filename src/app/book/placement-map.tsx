"use client";

import { useEffect, useRef, useState } from "react";

import { loadGoogleMaps } from "@/lib/maps/loader";

import styles from "./booking-flow.module.scss";

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Fallback center (Herriman, UT) used only until the address geocodes.
const DEFAULT_CENTER = { lat: 40.5069, lng: -111.9391 };

export type LatLng = { lat: number; lng: number };

type Address = {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
};

type MapStatus = "nokey" | "loading" | "ready" | "error";

function dumpsterIcon(maps: typeof google): google.maps.Icon {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="46" height="54" viewBox="0 0 46 54">
  <path d="M23 53C23 53 4 31 4 19a19 19 0 1 1 38 0c0 12-19 34-19 34z" fill="#4e6a2a" stroke="#ffffff" stroke-width="2.5"/>
  <g fill="#ffffff">
    <rect x="11" y="12" width="24" height="3.4" rx="1.4"/>
    <path d="M13.5 16.5h19l-2.2 11h-14.6z"/>
    <rect x="17" y="28.5" width="4" height="2.4" rx="1.2"/>
    <rect x="25" y="28.5" width="4" height="2.4" rx="1.2"/>
  </g>
</svg>`.trim();

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.maps.Size(46, 54),
    anchor: new maps.maps.Point(23, 53),
  };
}

export function PlacementMap({
  address,
  value,
  onChange,
}: Readonly<{
  address: Address;
  value: LatLng | null;
  onChange: (position: LatLng) => void;
}>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<MapStatus>(
    MAPS_API_KEY ? "loading" : "nokey",
  );
  // Keep the latest onChange without re-running the one-time init effect.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!MAPS_API_KEY || !containerRef.current) return;
    let cancelled = false;

    loadGoogleMaps(MAPS_API_KEY)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        const start = value ?? DEFAULT_CENTER;
        const map = new maps.maps.Map(containerRef.current, {
          center: start,
          zoom: value ? 20 : 18,
          mapTypeId: "hybrid",
          tilt: 0,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          rotateControl: false,
          gestureHandling: "greedy",
        });

        const marker = new maps.maps.Marker({
          map,
          position: start,
          draggable: true,
          icon: dumpsterIcon(maps),
          title: "Drag to set dumpster placement",
          cursor: "grab",
        });

        const publish = (latLng: google.maps.LatLng) => {
          onChangeRef.current({ lat: latLng.lat(), lng: latLng.lng() });
        };

        marker.addListener("dragend", () => {
          const position = marker.getPosition();
          if (position) publish(position);
        });
        map.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          marker.setPosition(event.latLng);
          publish(event.latLng);
        });

        setStatus("ready");

        // Center on the delivery address unless we already have a placement.
        if (!value) {
          const query = [
            address.line1,
            address.line2,
            address.city,
            `${address.region} ${address.postalCode}`,
          ]
            .filter((part) => part && part.trim())
            .join(", ");

          new maps.maps.Geocoder().geocode({ address: query }, (results, gStatus) => {
            if (cancelled || gStatus !== "OK" || !results?.[0]) return;
            const location = results[0].geometry.location;
            map.setCenter(location);
            map.setZoom(20);
            marker.setPosition(location);
            publish(location);
          });
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
    // Runs once on mount; address/value are read as initial values by design.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "nokey") {
    return (
      <div className={styles.mapPlaceholder} role="note">
        <span aria-hidden="true">🛰️</span>
        <p>
          The placement map isn&apos;t configured yet. Describe the placement
          spot below and our team will confirm it.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        className={styles.map}
        role="application"
        aria-label="Satellite map. Drag the dumpster marker to set the delivery placement."
      />
      {status === "loading" && (
        <p className={styles.helpText}>Loading satellite view…</p>
      )}
      {status === "error" && (
        <p className={styles.errorText} role="alert">
          The map couldn&apos;t load. Describe the placement spot below instead.
        </p>
      )}
      {status === "ready" && (
        <p className={styles.mapCoords} aria-live="polite">
          {value
            ? `Placement set at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}. Drag the marker to adjust.`
            : "Drag the dumpster marker to the exact drop-off spot."}
        </p>
      )}
    </div>
  );
}
