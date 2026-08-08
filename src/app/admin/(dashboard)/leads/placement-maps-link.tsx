"use client";

import type { ReactNode } from "react";

/**
 * Opens the customer's placement pin in Google Maps, after confirming.
 *
 * The confirm exists because this navigates away to a third-party app — on a
 * phone it hands off to the Maps application, which is disruptive if the row
 * was tapped while scrolling.
 */
export function PlacementMapsLink({
  latitude,
  longitude,
  bookingNumber,
  className,
  children,
}: Readonly<{
  latitude: number;
  longitude: number;
  bookingNumber: number;
  className?: string;
  children: ReactNode;
}>) {
  const coords = `${latitude},${longitude}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={`Open placement for booking ${bookingNumber} in Google Maps`}
      aria-label={`Open placement pin for booking ${bookingNumber} in Google Maps`}
      onClick={(event) => {
        if (
          !window.confirm(
            `Open the placement pin for booking #${bookingNumber} in Google Maps?`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </a>
  );
}
