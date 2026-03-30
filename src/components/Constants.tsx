import { DeliveryStatus } from "../types";

export const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; color: string; icon: string }
> = {
  pending: { label: "Pending", color: "#F59E0B", icon: "time-outline" },
  delivered: {
    label: "Delivered",
    color: "#10B981",
    icon: "checkmark-circle-outline",
  },
  partial: { label: "Partial", color: "#3B82F6", icon: "git-branch-outline" },
};
