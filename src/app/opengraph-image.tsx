import {
  OG_ALT,
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgPreview,
} from "@/lib/og/preview";

export const runtime = "edge";
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  return renderOgPreview();
}
