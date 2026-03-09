import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1e3a5f",
          borderRadius: 6
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9" />
          <path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5" />
          <circle cx="12" cy="9" r="2" />
          <path d="M16.2 4.8c2 2 2.26 5.01.8 7.5" />
          <path d="M19.1 1.9a10.1 10.1 0 0 1 0 14.1" />
          <path d="M9.5 18h5" />
          <path d="M8 22l4-11 4 11" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
