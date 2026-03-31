import { STATUS_CONFIG } from "@/src/components/Constants";
import { DeliveryStatus } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export const StatusBadge = ({ status }: { status: DeliveryStatus }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <View
      style={[
        bdg.wrap,
        { backgroundColor: cfg.color + "22", borderColor: cfg.color + "55" },
      ]}>
      <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
      <Text style={[bdg.txt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};
const bdg = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  txt: { fontSize: 10, fontWeight: "700" },
});
