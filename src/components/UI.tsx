// src/components/UI.tsx

import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { C, F, R, S, W } from "../utils/theme";

// ─────────────────────────────────────────────────────────────
// Button
// ─────────────────────────────────────────────────────────────
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  icon,
  style,
  fullWidth = true,
}) => {
  const bgMap: Record<string, string> = {
    primary: C.primary,
    secondary: C.bgElevated,
    ghost: "transparent",
    danger: C.error,
  };
  const textColor =
    variant === "ghost"
      ? C.primary
      : variant === "secondary"
        ? C.textPrimary
        : C.white;
  const heights = { sm: 38, md: 50, lg: 58 };
  const fontSizes = { sm: F.sm, md: F.md, lg: F.lg };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      disabled={disabled || loading}
      style={[
        btn.base,
        { backgroundColor: bgMap[variant], height: heights[size] },
        fullWidth && { width: "100%" },
        (disabled || loading) && { opacity: 0.5 },
        variant === "ghost" && btn.ghost,
        variant === "secondary" && btn.secondary,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={btn.inner}>
          {icon && (
            <Ionicons
              name={icon}
              size={fontSizes[size] + 2}
              color={textColor}
              style={{ marginRight: 6 }}
            />
          )}
          <Text
            style={[
              btn.label,
              { color: textColor, fontSize: fontSizes[size] },
            ]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const btn = StyleSheet.create({
  base: {
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: S.lg,
  },
  inner: { flexDirection: "row", alignItems: "center" },
  label: { fontWeight: W.semibold, letterSpacing: 0.3 },
  ghost: { borderWidth: 1.5, borderColor: C.primary },
  secondary: { borderWidth: 1, borderColor: C.border },
});

// ─────────────────────────────────────────────────────────────
// Input
// ─────────────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  ...rest
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[inp.wrap, containerStyle]}>
      {label ? <Text style={inp.label}>{label}</Text> : null}

      <View
        style={[inp.box, focused && inp.boxFocused, !!error && inp.boxError]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? C.primary : C.textTertiary}
            style={inp.iconLeft}
          />
        ) : null}

        <TextInput
          style={[inp.field, style as TextStyle]}
          placeholderTextColor={C.textDisabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />

        {rightIcon ? (
          <TouchableOpacity onPress={onRightIconPress} style={inp.iconRight}>
            <Ionicons name={rightIcon} size={20} color={C.textTertiary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={inp.error}>{error}</Text> : null}
      {!error && hint ? <Text style={inp.hint}>{hint}</Text> : null}
    </View>
  );
};

const inp = StyleSheet.create({
  wrap: { marginBottom: S.md },
  label: {
    fontSize: F.sm,
    fontWeight: W.medium,
    color: C.textSecondary,
    marginBottom: S.xs,
    marginLeft: 2,
  },
  box: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgInput,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: S.md,
    minHeight: 52,
  },
  boxFocused: { borderColor: C.primary },
  boxError: { borderColor: C.error },
  iconLeft: { marginRight: S.sm },
  field: {
    flex: 1,
    color: C.textPrimary,
    fontSize: F.md,
    paddingVertical: S.md,
  },
  iconRight: { padding: 4 },
  error: { fontSize: F.xs, color: C.error, marginTop: 4, marginLeft: 2 },
  hint: { fontSize: F.xs, color: C.textTertiary, marginTop: 4, marginLeft: 2 },
});

// ─────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const inner = <View style={[card.base, style]}>{children}</View>;
  return onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      {inner}
    </TouchableOpacity>
  ) : (
    inner
  );
};

const card = StyleSheet.create({
  base: {
    backgroundColor: C.bgCard,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.border,
  },
});

// ─────────────────────────────────────────────────────────────
// Divider
// ─────────────────────────────────────────────────────────────
export const Divider: React.FC<{ style?: StyleProp<ViewStyle> }> = ({
  style,
}) => <View style={[{ height: 1, backgroundColor: C.border }, style]} />;

// ─────────────────────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────────────────────
export const Badge: React.FC<{
  label: string;
  color?: string;
  bg?: string;
}> = ({ label, color = C.primary, bg = C.primary + "22" }) => (
  <View style={[badge.wrap, { backgroundColor: bg }]}>
    <Text style={[badge.text, { color }]}>{label}</Text>
  </View>
);

const badge = StyleSheet.create({
  wrap: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: R.full,
    alignSelf: "flex-start",
  },
  text: { fontSize: F.xs, fontWeight: W.semibold },
});

// ─────────────────────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────────────────────
export const SectionHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
}> = ({ title, subtitle, action, style }) => (
  <View style={[sh.row, style]}>
    <View style={{ flex: 1 }}>
      <Text style={sh.title}>{title}</Text>
      {subtitle ? <Text style={sh.sub}>{subtitle}</Text> : null}
    </View>
    {action ? (
      <TouchableOpacity onPress={action.onPress}>
        <Text style={sh.action}>{action.label}</Text>
      </TouchableOpacity>
    ) : null}
  </View>
);

const sh = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", marginBottom: S.md },
  title: { fontSize: F.lg, fontWeight: W.bold, color: C.textPrimary },
  sub: { fontSize: F.sm, color: C.textTertiary, marginTop: 2 },
  action: { fontSize: F.sm, color: C.primary, fontWeight: W.medium },
});

// ─────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────
export const EmptyState: React.FC<{
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}> = ({ icon = "cube-outline", title, subtitle, action }) => (
  <View style={es.wrap}>
    <View style={es.iconWrap}>
      <Ionicons name={icon} size={40} color={C.textTertiary} />
    </View>
    <Text style={es.title}>{title}</Text>
    {subtitle ? <Text style={es.sub}>{subtitle}</Text> : null}
    {action ? (
      <Button
        title={action.label}
        onPress={action.onPress}
        variant="ghost"
        fullWidth={false}
        style={{ marginTop: S.lg, paddingHorizontal: S.xl }}
      />
    ) : null}
  </View>
);

const es = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: S.xxxl,
    paddingHorizontal: S.xl,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: S.lg,
  },
  title: {
    fontSize: F.lg,
    fontWeight: W.semibold,
    color: C.textPrimary,
    textAlign: "center",
  },
  sub: {
    fontSize: F.sm,
    color: C.textTertiary,
    textAlign: "center",
    marginTop: S.xs,
    lineHeight: 20,
  },
});
