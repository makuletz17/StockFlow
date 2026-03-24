export const C = {
  // brand
  primary: "#3B82F6", // blue-500
  primaryDark: "#1D4ED8",
  primaryLight: "#93C5FD",
  accent: "#10B981", // emerald-500
  accentOrange: "#F59E0B",
  accentRed: "#EF4444",
  accentPurple: "#8B5CF6",

  // surfaces
  bg: "#0A0A0F",
  bgCard: "#13131A",
  bgElevated: "#1C1C27",
  bgInput: "#1C1C27",

  // text
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textTertiary: "#475569",
  textDisabled: "#334155",

  // borders
  border: "#1E293B",
  borderFocus: "#3B82F6",

  // semantic
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",

  white: "#FFFFFF",
  black: "#000000",
} as const;

export const S = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const R = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const F = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
} as const;

export const W = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  heavy: "800" as const,
};
