import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

// Shared social-share preview used by both app/opengraph-image and
// app/twitter-image. Mirrors the homepage hero.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";
export const OG_ALT =
  "Barnes Hauling and Disposal — book the right dumpster rental for your project.";

export async function renderOgPreview(): Promise<ImageResponse> {
  const logo = await readFile(
    join(process.cwd(), "public/images/barnes-brand-mark.png"),
  );
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#ffffff",
          backgroundColor: "#0b0c0a",
          backgroundImage:
            "linear-gradient(135deg, rgba(78,106,42,0.45) 0%, rgba(11,12,10,0) 55%), radial-gradient(1200px 600px at 85% 120%, rgba(126,149,82,0.30), rgba(11,12,10,0) 60%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* next/image is unsupported inside ImageResponse (Satori needs a raw img). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={132} height={82} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>
              Barnes Hauling &amp; Disposal
            </span>
            <span style={{ fontSize: 20, color: "#b7c69a" }}>Herriman, Utah</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 2,
              color: "#7e9552",
            }}
          >
            Hauling &amp; disposal, without the guesswork
          </span>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.04,
              letterSpacing: -1.5,
            }}
          >
            <span>Book the right&nbsp;</span>
            <span style={{ color: "#7e9552" }}>dumpster rental&nbsp;</span>
            <span>for your project.</span>
          </div>
          <span
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.82)",
              maxWidth: 900,
            }}
          >
            Compare sizes, review confirmed pricing, and choose the container that
            fits your cleanup, remodel, or jobsite.
          </span>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {["Upfront pricing", "On-time service", "Local & trusted"].map(
            (label) => (
              <span
                key={label}
                style={{
                  display: "flex",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#0b0c0a",
                  backgroundColor: "#7e9552",
                  borderRadius: 999,
                  padding: "10px 22px",
                }}
              >
                {label}
              </span>
            ),
          )}
        </div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
