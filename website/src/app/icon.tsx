import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#8b4d35",
          borderRadius: "8px",
          color: "#fffaf2",
          display: "flex",
          fontSize: "20px",
          fontWeight: 700,
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        N
      </div>
    ),
    size,
  );
}
