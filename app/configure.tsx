import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import { Button, Card, Input } from "@/src/components/UI";
import { useAppStore } from "@/src/store/appStore";
import { ApiConfig, ApiSettings } from "@/src/types";
import { C, F, R, S, W } from "@/src/utils/theme";

// Read .env default
const ENV_URL: string =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env["EXPO_PUBLIC_API_URL"] ??
  "";

// ── Status badge ─────────────────────────────────────────────
type TestStatus = "idle" | "testing" | "success" | "error";

function StatusBadge({
  status,
  message,
}: {
  status: TestStatus;
  message: string;
}) {
  if (status === "idle") return null;

  const cfg: Record<
    Exclude<TestStatus, "idle">,
    { color: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    testing: { color: C.primary, icon: "sync-outline" },
    success: { color: C.accent, icon: "checkmark-circle-outline" },
    error: { color: C.error, icon: "alert-circle-outline" },
  };

  const { color, icon } = cfg[status as Exclude<TestStatus, "idle">];

  return (
    <View
      style={[
        badge.wrap,
        { borderColor: color + "40", backgroundColor: color + "10" },
      ]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[badge.txt, { color }]}>{message}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: S.sm,
    padding: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    marginTop: S.md,
  },
  txt: { flex: 1, fontSize: F.sm, lineHeight: 20, fontWeight: W.medium },
});

// ── Main screen ───────────────────────────────────────────────
export default function ConfigureScreen() {
  const router = useRouter();
  const { apiSettings, setApiSettings, clearApiSettings } = useAppStore();

  // Pre-fill with saved URL, or .env default
  const [url, setUrl] = useState(apiSettings?.baseUrl || ENV_URL || "");
  const [status, setStatus] = useState<TestStatus>("idle");
  const [message, setMessage] = useState("");
  const [testedConfig, setTestedConfig] = useState<ApiConfig | null>(null);

  // Spin icon while testing
  const spinVal = new Animated.Value(0);
  useEffect(() => {
    if (status !== "testing") return;
    Animated.loop(
      Animated.timing(spinVal, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, [status]);

  // ── Test & Save ──────────────────────────────────────────
  const handleTestAndSave = async () => {
    const trimmed = url.trim().replace(/\/$/, "");

    if (!trimmed) {
      setStatus("error");
      setMessage("Please enter the API base URL.");
      return;
    }
    if (!trimmed.startsWith("http")) {
      setStatus("error");
      setMessage("URL must start with http:// or https://");
      return;
    }

    setStatus("testing");
    setMessage("Connecting to server…");
    setTestedConfig(null);

    // Point axios at the new URL temporarily
    await api.setBaseURL(trimmed);

    try {
      const isAlive = await api.ping();

      if (!isAlive) {
        setStatus("error");
        setMessage("Unable to connect to server");
        return;
      }
      const settings: ApiSettings = {
        baseUrl: trimmed,
        config: null, // no config anymore
        savedAt: new Date().toISOString(),
      };

      await setApiSettings(settings);

      setTestedConfig(null);
      setStatus("success");
      setMessage("Connected! Server is reachable.");
      setTimeout(() => {
        handleProceed();
      }, 800);
    } catch (err: unknown) {
      setStatus("error");
      const raw = err instanceof Error ? err.message : String(err);
      if (
        raw.toLowerCase().includes("network") ||
        raw.toLowerCase().includes("timeout")
      ) {
        setMessage(
          `Cannot reach server.\n\nMake sure:\n• Device is on the same network\n• Server is running\n• URL is correct\n\n${trimmed}`,
        );
      } else if (raw.includes("404") || raw.includes("Not Found")) {
        setMessage(
          `Server responded but /config endpoint not found.\nCheck the URL path.\n\n${trimmed}`,
        );
      } else {
        setMessage(`Error: ${raw}`);
      }
    }
  };

  // ── Proceed to login ──────────────────────────────────────
  const handleProceed = () => {
    router.replace("/(auth)/login");
  };

  // ── Reset saved config ────────────────────────────────────
  const handleReset = () => {
    Alert.alert("Reset Configuration", "Clear saved API settings?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          await clearApiSettings();
          await api.clearSavedURL();
          setUrl(ENV_URL || "");
          setStatus("idle");
          setTestedConfig(null);
        },
      },
    ]);
  };

  const canProceed =
    status === "success" || (apiSettings !== null && status === "idle");

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* ── Header ──────────────────────────────────── */}
          <View style={s.headerRow}>
            <View style={s.logoBox}>
              <Ionicons name="layers" size={32} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>API Configuration</Text>
              <Text style={s.sub}>Connect StockFlow to your server</Text>
            </View>
            {apiSettings && (
              <TouchableOpacity onPress={handleReset} hitSlop={10}>
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={C.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Already saved config preview ─────────────── */}
          {apiSettings && status === "idle" && (
            <View style={s.savedBanner}>
              <Ionicons name="checkmark-circle" size={16} color={C.accent} />
              <View style={{ flex: 1 }}>
                <Text style={s.savedLabel}>Last connected to</Text>
                <Text style={s.savedUrl} numberOfLines={1}>
                  {apiSettings.baseUrl}
                </Text>
              </View>
            </View>
          )}

          {/* ── Input card ───────────────────────────────── */}
          <Card style={s.card}>
            <Text style={s.cardTitle}>Server URL</Text>
            <Text style={s.cardSub}>
              Enter the base URL of your StockFlow REST API. The app will send a
              connection check to verify the server is reachable.
            </Text>

            <Input
              value={url}
              onChangeText={(t) => {
                setUrl(t);
                setStatus("idle");
                setTestedConfig(null);
              }}
              icon="globe-outline"
              placeholder="http://192.168.1.100:8000/api/v1"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              onSubmitEditing={handleTestAndSave}
              containerStyle={{ marginTop: S.md, marginBottom: 0 }}
            />

            <StatusBadge status={status} message={message} />
          </Card>

          {/* ── Env default hint ─────────────────────────── */}
          {ENV_URL && url !== ENV_URL && (
            <TouchableOpacity
              style={s.envHint}
              onPress={() => {
                setUrl(ENV_URL);
                setStatus("idle");
              }}>
              <Ionicons name="code-outline" size={14} color={C.primary} />
              <Text style={s.envHintTxt}>
                Use .env default: <Text style={s.mono}>{ENV_URL}</Text>
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Tips ─────────────────────────────────────── */}
          <Card style={s.tipsCard}>
            <Text style={s.tipsTitle}>
              <Ionicons name="bulb-outline" size={14} color={C.accentOrange} />
              {"  "}Tips
            </Text>
            {[
              'Use your machine\'s local IP, not "localhost"',
              "Make sure your device and server are on the same Wi-Fi",
              "Any HTTP response from the server counts as reachable",
            ].map((tip, i) => (
              <View key={i} style={s.tipRow}>
                <View style={s.tipDot} />
                <Text style={s.tipTxt}>{tip}</Text>
              </View>
            ))}
          </Card>

          {/* ── Actions ──────────────────────────────────── */}
          <View style={s.actions}>
            <Button
              title={status === "testing" ? "Testing…" : "Test & Save"}
              onPress={handleTestAndSave}
              loading={status === "testing"}
              icon="wifi-outline"
              variant="primary"
            />

            {canProceed && (
              <Button
                title="Continue to Login →"
                onPress={handleProceed}
                icon="arrow-forward-outline"
                variant="primary"
                style={{ marginTop: S.sm }}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.xl, paddingBottom: 60, gap: S.lg },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    marginBottom: S.sm,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: R.lg,
    backgroundColor: C.primary + "18",
    borderWidth: 1.5,
    borderColor: C.primary + "35",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: F.xl, fontWeight: W.bold, color: C.textPrimary },
  sub: { fontSize: F.sm, color: C.textTertiary, marginTop: 2 },

  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.accent + "12",
    borderRadius: R.md,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.accent + "30",
  },
  savedLabel: { fontSize: F.xs, color: C.accent, fontWeight: W.semibold },
  savedUrl: {
    fontSize: F.sm,
    color: C.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    marginTop: 2,
  },

  card: {},
  cardTitle: {
    fontSize: F.lg,
    fontWeight: W.bold,
    color: C.textPrimary,
    marginBottom: S.xs,
  },
  cardSub: { fontSize: F.sm, color: C.textTertiary, lineHeight: 20 },
  mono: {
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
    color: C.primary,
  },

  envHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: S.sm,
    backgroundColor: C.primary + "10",
    borderRadius: R.md,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.primary + "25",
  },
  envHintTxt: { flex: 1, fontSize: F.xs, color: C.primary, lineHeight: 18 },

  tipsCard: {
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgCard,
  },
  tipsTitle: {
    fontSize: F.sm,
    fontWeight: W.semibold,
    color: C.accentOrange,
    marginBottom: S.md,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: S.sm,
    marginBottom: S.sm,
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.textTertiary,
    marginTop: 7,
  },
  tipTxt: { flex: 1, fontSize: F.sm, color: C.textSecondary, lineHeight: 20 },

  actions: { gap: S.sm },
});
