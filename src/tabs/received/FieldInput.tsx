import { C, F, R, S, W } from "@/src/utils/theme";
import { StyleSheet, Text, TextInput, View } from "react-native";

export const FieldInput = ({
  label,
  value,
  onChange,
  placeholder = "",
  keyboardType = "default",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
}) => {
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        style={[
          fi.input,
          multiline && { minHeight: 60, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
};
const fi = StyleSheet.create({
  wrap: { gap: 4 },
  label: {
    fontSize: F.xs,
    fontWeight: W.bold,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    padding: S.sm,
    fontSize: F.sm,
    color: C.textPrimary,
    backgroundColor: C.bgElevated,
  },
});
