import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 108,
        background: "#266348",
        color: "#e4f7ec",
        fontSize: 270,
        fontWeight: 700,
        letterSpacing: "-0.09em",
        paddingRight: 28,
      }}
    >
      M
    </div>,
    size,
  );
}
