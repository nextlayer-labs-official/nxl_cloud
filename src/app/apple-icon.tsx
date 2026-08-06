import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// next/og's renderer (Satori) doesn't support oklch(); #2563eb is a close sRGB
// match to the site's brand blue (oklch(0.55 0.18 255)) for this asset only —
// the actual site continues to use the exact oklch() value via CSS everywhere.
const BRAND_BLUE = "#2563eb";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_BLUE,
        borderRadius: 40,
      }}
    >
      <span style={{ fontSize: 96, fontWeight: 700, color: "white" }}>N</span>
    </div>,
    { ...size },
  );
}
