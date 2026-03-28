import api from "@/src/api/apiService";
import { Button, Input } from "@/src/components/UI";
import { useAppStore } from "@/src/store/appStore";
import { getErrorMessage } from "@/src/utils/helpers";
import { C, F, R, S, W } from "@/src/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

export default function LoginScreen() {
  const router = useRouter();
  const setUser = useAppStore((s) => s.setUser);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  // ── Validation ─────────────────────────────────────────────
  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!username.trim()) e.username = "Username is required";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await api.login(username.trim(), password);
      setUser(user);
      // _layout.tsx auth-guard will redirect to (app)/(tabs)
    } catch (err) {
      Alert.alert("Login Failed", getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[s.scroll, IS_TABLET && s.scrollTablet]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* ── Brand / Logo ─────────────────────────────────── */}
          <View style={s.navbar}>
            <View style={s.brand}>
              {/* Glowing icon box */}
              <View style={s.logoOuter}>
                <LinearGradient
                  colors={[C.primary + "30", C.accentPurple + "30"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.logoGrad}>
                  <Ionicons name="layers" size={38} color={C.primary} />
                </LinearGradient>
                {/* glow ring */}
                <View style={s.logoGlow} />
              </View>

              <Text style={s.appName}>StockFlow</Text>
              <View style={s.taglineRow}>
                {(["Receive", "Encode", "Track"] as const).map((t, i) => (
                  <React.Fragment key={t}>
                    <Text style={s.tagWord}>{t}</Text>
                    {i < 2 && <View style={s.tagDot} />}
                  </React.Fragment>
                ))}
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/settings")}
              style={s.navAction}
              activeOpacity={0.7}>
              <Ionicons
                name="settings-outline"
                size={24}
                color={C.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* ── Card ─────────────────────────────────────────── */}
          <View style={[s.card, IS_TABLET && s.cardTablet]}>
            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSub}>Sign in to your account</Text>

            {/* Username */}
            <Input
              label="Username"
              value={username}
              onChangeText={(t) => {
                setUsername(t);
                setErrors((e) => ({ ...e, username: undefined }));
              }}
              icon="person-outline"
              placeholder="Enter your username"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.username}
              returnKeyType="next"
            />

            {/* Password */}
            <Input
              label="Password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setErrors((e) => ({ ...e, password: undefined }));
              }}
              icon="lock-closed-outline"
              placeholder="Enter your password"
              secureTextEntry={!showPass}
              rightIcon={showPass ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={() => setShowPass((v) => !v)}
              error={errors.password}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {/* Sign-in button */}
            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              icon="log-in-outline"
              style={{ marginTop: S.sm }}
            />
          </View>

          {/* ── Footer ───────────────────────────────────────── */}
          <Text style={s.footer}>StockFlow v1.0 · © 2026</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  scroll: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: S.xl,
    paddingVertical: S.xxxl,
  },
  scrollTablet: {
    paddingHorizontal: width * 0.15,
  },

  // Brand
  brand: { alignItems: "flex-start", marginBottom: S.xxxl + S.lg },

  logoOuter: { position: "relative", marginBottom: S.xl },
  logoGrad: {
    width: 48,
    height: 48,
    borderRadius: R.xxl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.primary + "40",
  },
  logoGlow: {
    position: "absolute",
    inset: -8,
    borderRadius: R.xxl + 8,
    backgroundColor: C.primary + "12",
    zIndex: -1,
  },

  appName: {
    fontSize: F.display,
    fontWeight: W.heavy,
    color: C.textPrimary,
    letterSpacing: -1.5,
    marginBottom: S.sm,
  },

  taglineRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  tagWord: {
    fontSize: F.sm,
    color: C.textTertiary,
    fontWeight: W.medium,
    letterSpacing: 1,
  },
  tagDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.border },

  // Form card
  card: {
    backgroundColor: C.bgCard,
    borderRadius: R.xl,
    padding: S.xl,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTablet: { marginHorizontal: S.xl },

  cardTitle: {
    fontSize: F.xxl,
    fontWeight: W.bold,
    color: C.textPrimary,
    marginBottom: S.xs,
  },
  cardSub: { fontSize: F.sm, color: C.textTertiary, marginBottom: S.xl },
  // Footer
  footer: {
    marginTop: S.xxl,
    textAlign: "center",
    fontSize: F.xs,
    color: C.textTertiary,
  },
  navbar: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  navAction: { padding: S.sm, borderRadius: R.full },
});
