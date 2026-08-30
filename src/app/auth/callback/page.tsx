import { createPageMetadata } from "@/lib/page-metadata";

export const metadata = createPageMetadata(
  "Sign-in handoff",
  "Completing secure authentication for Barnes Hauling and Disposal.",
  "/auth/callback",
  { noIndex: true },
);

export default function AuthCallbackPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
      }}
    >
      <p>Completing sign-in…</p>
    </div>
  );
}
