import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_DESCRIPTION } from "@/constants/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// See apple-icon.tsx for why this is a hex approximation of the brand blue.
const BRAND_BLUE = "#2563eb";
const INK = "#23262f";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "80px",
        background: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 72,
          height: 72,
          borderRadius: 16,
          background: BRAND_BLUE,
          marginBottom: 48,
        }}
      >
        <span style={{ fontSize: 40, fontWeight: 700, color: "white" }}>N</span>
      </div>
      <div style={{ fontSize: 64, fontWeight: 700, color: INK, letterSpacing: -1 }}>
        {SITE_NAME}
      </div>
      <div style={{ fontSize: 30, color: "#6b7280", marginTop: 20 }}>{SITE_DESCRIPTION}</div>
    </div>,
    { ...size },
  );
}
