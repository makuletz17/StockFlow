// app/configure.tsx
//
// Shown when:
//   • App has no API URL configured   (first launch / after reset)
//   • Saved API URL is unreachable    (network error on boot ping)
//
// Flow:
//   User types URL → taps "Test & Save" → app pings /config
//     ✓ Success → save URL + ApiConfig → navigate to login
//     ✗ Error   → show error message, let user retry

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

// ── Saved config preview ─────────────────────────────────────
function ConfigPreview({ config, url }: { config: ApiConfig; url: string }) {
  return (
    <View style={prev.wrap}>
      <View style={prev.row}>
        <Ionicons name="server-outline" size={15} color={C.accent} />
        <Text style={prev.label}>Connected to</Text>
      </View>
      <Text style={prev.name}>{config.app_name}</Text>
      {config.company ? <Text style={prev.sub}>{config.company}</Text> : null}
      <Text style={prev.url}>{url}</Text>
      <View style={prev.meta}>
        <Text style={prev.metaTxt}>v{config.version}</Text>
        {config.stores && config.stores.length > 0 && (
          <Text style={prev.metaTxt}>
            {config.stores.length} store{config.stores.length > 1 ? "s" : ""}
          </Text>
        )}
      </View>
    </View>
  );
}

const prev = StyleSheet.create({
  wrap: {
    backgroundColor: C.accent + "10",
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.accent + "30",
    marginTop: S.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
    marginBottom: S.xs,
  },
  label: {
    fontSize: F.xs,
    color: C.accent,
    fontWeight: W.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  name: { fontSize: F.xl, fontWeight: W.bold, color: C.textPrimary },
  sub: { fontSize: F.sm, color: C.textSecondary, marginTop: 2 },
  url: {
    fontSize: F.xs,
    color: C.textTertiary,
    marginTop: S.xs,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  meta: { flexDirection: "row", gap: S.md, marginTop: S.sm },
  metaTxt: { fontSize: F.xs, color: C.accent + "CC", fontWeight: W.medium },
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
      const config = await api.ping();

      // ✓ Success — persist everything
      const settings: ApiSettings = {
        baseUrl: trimmed,
        config,
        savedAt: new Date().toISOString(),
      };
      await setApiSettings(settings);

      setTestedConfig(config);
      setStatus("success");
      setMessage(
        `Connected!  ${config.app_name} v${config.version}` +
          (config.company ? `  ·  ${config.company}` : ""),
      );
    } catch (err: unknown) {
      // ✗ Unreachable — show friendly error
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
            <ConfigPreview
              config={apiSettings.config}
              url={apiSettings.baseUrl}
            />
          )}

          {/* ── Input card ───────────────────────────────── */}
          <Card style={s.card}>
            <Text style={s.cardTitle}>Server URL</Text>
            <Text style={s.cardSub}>
              Enter the base URL of your StockFlow REST API. The app will call{" "}
              <Text style={s.mono}>
                {(url || "http://…").replace(/\/$/, "")}/config
              </Text>{" "}
              to verify.
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

            {testedConfig ? (
              <ConfigPreview config={testedConfig} url={url.trim()} />
            ) : null}
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
              "The API must return { success: true, data: { app_name, version } } at GET /config",
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
    backgroundColor: C.bgCard,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.border,
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
