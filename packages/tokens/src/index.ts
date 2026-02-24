export const tokens = {
  font: {
    sans: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
  },
  color: {
    primary: {
      500: "#3b82f6",
      600: "#2563eb",
      700: "#1d4ed8"
    },
    accent: {
      500: "#22c55e",
      600: "#16a34a"
    },
    light: {
      background: "#faf9f5",
      card: "#ffffff",
      ink: "#141413",
      inkMuted: "#666666",
      border: "#e2e8f0",
      borderStrong: "#cbd5e1",
      iconBg: "#f8fafc",
      subtle: "#3b82f6"
    },
    dark: {
      background: "#141413",
      card: "#1f1e1d",
      ink: "#e5e4e0",
      inkMuted: "rgba(229, 228, 224, 0.7)",
      border: "#1f1e1d",
      borderStrong: "#2a2a28",
      iconBg: "#141413",
      subtle: "#60a5fa"
    }
  },
  gradient: {
    light: {
      start: "#faf9f5",
      mid: "#f8f8f6",
      end: "#ffffff"
    },
    dark: {
      start: "#141413",
      mid: "#0a0a09",
      end: "#000000"
    }
  },
  shadow: {
    card: "0 1px 2px rgb(0 0 0 / 0.08)",
    cardHover: "0 4px 10px rgb(0 0 0 / 0.14)"
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem"
  },
  radius: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1.2rem",
    pill: "999px"
  }
} as const;

export type TelecomTokens = typeof tokens;
