/**
 * Loads the Google Maps JavaScript API once per page and resolves when
 * `google.maps` is ready. Uses a singleton promise so concurrent callers (and
 * re-mounts of the placement step) share a single script tag.
 *
 * The API key is a public, referrer-restricted browser key
 * (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`). Restrict it by HTTP referrer and enabled
 * APIs in the Google Cloud console before production.
 */

let loaderPromise: Promise<typeof google> | null = null;

const CALLBACK_NAME = "__barnesInitGoogleMaps__";

export function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }
  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = new Promise((resolve, reject) => {
    const globalWindow = window as unknown as Record<string, unknown>;
    globalWindow[CALLBACK_NAME] = () => {
      resolve(window.google);
      delete globalWindow[CALLBACK_NAME];
    };

    const params = new URLSearchParams({
      key: apiKey,
      libraries: "marker,places",
      v: "weekly",
      loading: "async",
      callback: CALLBACK_NAME,
    });

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Failed to load Google Maps."));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}
