// src/utils/helpers.ts

import { Dimensions } from "react-native";

export const { width: SCREEN_W } = Dimensions.get("window");
export const IS_TABLET = SCREEN_W >= 768;

export const todayISO = () => new Date().toISOString().split("T")[0];

export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

export const formatDateTime = (d: string | Date) =>
  new Date(d).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const generateId = () =>
  `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export const getErrorMessage = (err: unknown): string => {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    const resp = e["response"] as Record<string, unknown> | undefined;
    if (resp) {
      const data = resp["data"] as Record<string, unknown> | undefined;
      if (data && typeof data["message"] === "string") return data["message"];
    }
    if (typeof e["message"] === "string") return e["message"];
  }
  return "An unexpected error occurred.";
};

export const csvToRows = (csv: string): Record<string, string>[] => {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    return headers.reduce<Record<string, string>>(
      (obj, h, i) => ({ ...obj, [h]: vals[i] ?? "" }),
      {},
    );
  });
};

export const rowsToCSV = (rows: Record<string, unknown>[]): string => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = rows.map((r) =>
    headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","),
  );
  return [headers.join(","), ...lines].join("\n");
};
