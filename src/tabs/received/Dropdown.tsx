import { DropdownOption } from "@/src/types";
import { C, F, R, S, W } from "@/src/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export const Dropdown = ({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select...",
}: {
  label: string;
  value: DropdownOption | null;
  options: DropdownOption[];
  onSelect: (opt: DropdownOption) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={dd.wrap}>
      <Text style={dd.label}>{label}</Text>
      <TouchableOpacity
        style={dd.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}>
        <Text
          style={[dd.triggerTxt, !value && { color: C.textTertiary }]}
          numberOfLines={1}>
          {value ? value.text : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color={C.textTertiary} />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={dd.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}>
          <View style={dd.sheet}>
            <Text style={dd.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[dd.option, value?.id === item.id && dd.optionActive]}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}>
                  <Text
                    style={[
                      dd.optionTxt,
                      value?.id === item.id && {
                        color: C.primary,
                        fontWeight: W.bold,
                      },
                    ]}>
                    {item.text}
                  </Text>
                  {value?.id === item.id && (
                    <Ionicons name="checkmark" size={14} color={C.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};
const dd = StyleSheet.create({
  wrap: { gap: 4 },
  label: {
    fontSize: F.xs,
    fontWeight: W.bold,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    padding: S.sm,
    backgroundColor: C.bgElevated,
  },
  triggerTxt: { fontSize: F.sm, color: C.textPrimary, flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: S.lg,
  },
  sheet: {
    backgroundColor: C.bg,
    borderRadius: R.lg,
    padding: S.md,
    maxHeight: 400,
  },
  sheetTitle: {
    fontSize: F.md,
    fontWeight: W.bold,
    color: C.textPrimary,
    marginBottom: S.sm,
    paddingHorizontal: S.sm,
  },
  option: {
    paddingVertical: S.md,
    paddingHorizontal: S.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: R.sm,
  },
  optionActive: { backgroundColor: C.primary + "11" },
  optionTxt: { fontSize: F.sm, color: C.textPrimary, flex: 1 },
});
