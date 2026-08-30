import { ImageResponse } from "next/og";

// Shared social-share preview used by both app/opengraph-image and
// app/twitter-image. Mirrors the homepage hero: mountain background + gradient,
// white-deer brand lockup (Barlow Condensed), Anton headline with the accented
// "dumpster rental", and the dumpster image. Assets are referenced with
// import.meta.url so Next bundles them for serverless.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";
export const OG_ALT =
  "Barnes Hauling and Disposal — book the right dumpster rental for your project.";

const BRAND_SOFT = "#7e9552";

async function asset(path: string): Promise<ArrayBuffer> {
  return fetch(new URL(path, import.meta.url)).then((res) => res.arrayBuffer());
}

// Edge runtime has no Buffer; build the base64 data URI manually via btoa.
function toDataUri(buffer: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${mime};base64,${btoa(binary)}`;
}

export async function renderOgPreview(): Promise<ImageResponse> {
  const [bg, deer, dump, anton, barlowCond, barlow, barlowSemi] =
    await Promise.all([
      asset("./assets/mountain-bg.jpg"),
      asset("./assets/deer.png"),
      asset("./assets/dump.png"),
      asset("./fonts/Anton-Regular.ttf"),
      asset("./fonts/BarlowCondensed-Bold.ttf"),
      asset("./fonts/Barlow-Regular.ttf"),
      asset("./fonts/Barlow-SemiBold.ttf"),
    ]);

  const bgSrc = toDataUri(bg, "image/jpeg");
  const deerSrc = toDataUri(deer, "image/png");
  const dumpSrc = toDataUri(dump, "image/png");

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: "#0b0c0a",
          fontFamily: "Barlow",
        }}
      >
        {/* Background photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bgSrc}
          alt=""
          width={1200}
          height={630}
          style={{ position: "absolute", top: 0, left: 0 }}
        />
        {/* Left-to-right dark gradient (matches the hero overlay) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            backgroundImage:
              "linear-gradient(90deg, rgba(11,12,10,0.95) 0%, rgba(11,12,10,0.80) 48%, rgba(11,12,10,0.35) 100%)",
          }}
        />
        {/* Dumpster, bottom-right and slightly off-canvas like the hero */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dumpSrc}
          alt=""
          width={620}
          style={{ position: "absolute", right: -40, bottom: 46 }}
        />

        {/* Content */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 26,
            padding: "0 72px",
            width: 820,
            height: "100%",
          }}
        >
          {/* Brand lockup */}
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={deerSrc} alt="" height={72} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                paddingLeft: 18,
                borderLeft: "1px solid rgba(255,255,255,0.28)",
              }}
            >
              <span
                style={{
                  fontFamily: "Barlow Condensed",
                  fontWeight: 700,
                  fontSize: 40,
                  color: "#ffffff",
                  textTransform: "uppercase",
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                Barnes
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 16,
                  color: BRAND_SOFT,
                  textTransform: "uppercase",
                  letterSpacing: 3,
                  marginTop: 6,
                }}
              >
                Hauling &amp; Disposal
              </span>
            </div>
          </div>

          {/* Eyebrow */}
          <span
            style={{
              fontWeight: 600,
              fontSize: 22,
              color: BRAND_SOFT,
              textTransform: "uppercase",
              letterSpacing: 3,
            }}
          >
            Hauling &amp; disposal, without the guesswork
          </span>

          {/* Headline (Anton) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Anton",
              fontSize: 84,
              lineHeight: 0.9,
              letterSpacing: -1,
              textTransform: "uppercase",
              color: "#ffffff",
            }}
          >
            <span>Book the right</span>
            <span style={{ color: BRAND_SOFT }}>Dumpster rental</span>
            <span>for your project.</span>
          </div>

          {/* Summary */}
          <span
            style={{
              fontWeight: 400,
              fontSize: 26,
              lineHeight: 1.45,
              color: "rgba(255,255,255,0.78)",
              maxWidth: 620,
            }}
          >
            Compare sizes, review confirmed pricing, and choose the container that
            fits your cleanup, remodel, or jobsite.
          </span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Anton", data: anton, weight: 400, style: "normal" },
        { name: "Barlow Condensed", data: barlowCond, weight: 700, style: "normal" },
        { name: "Barlow", data: barlow, weight: 400, style: "normal" },
        { name: "Barlow", data: barlowSemi, weight: 600, style: "normal" },
      ],
    },
  );
}
