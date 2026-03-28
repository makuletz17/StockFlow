// app/_layout.tsx
//
// ─── Boot state machine ────────────────────────────────────────────────────
//
//  App opens
//     │
//     ▼
//  [checking]  ← init() resolves URL from storage OR .env
//     │
//     ├─ no URL configured ──────────────► [no_api]  → /configure
//     │
//     ├─ URL found → ping() ─────────────►
//     │       │
//     │       ├─ success → save ApiConfig ► [ready]
//     │       │                                │
//     │       │                          isAuthenticated?
//     │       │                          Yes → /(app)/(tabs)
//     │       │                          No  → /(auth)/login
//     │       │
//     │       └─ network error ──────────► [api_error] → /configure
//     │                                      (shows retry button)
//     │
//     └─ URL found but blank string ─────► [no_api]
//
// ─── Key design decisions ──────────────────────────────────────────────────
//  • .env EXPO_PUBLIC_API_URL is the build-time default
//  • User can override from configure screen → saved in secure storage
//  • After successful ping the full ApiConfig JSON is persisted
//  • On next cold boot we still re-ping (don't trust the cache),
//    but show the cached name while checking

import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import { useAppStore } from "@/src/store/appStore";
import { ApiSettings, BootPhase } from "@/src/types";
import { C, F, S, W } from "@/src/utils/theme";

// ── Animated logo ────────────────────────────────────────────
function Logo() {
  const spin = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    ]).start();
  }, []);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={[logo.box, { transform: [{ scale }, { rotate }] }]}>
      <Ionicons name="layers" size={40} color={C.primary} />
    </Animated.View>
  );
}

const logo = StyleSheet.create({
  box: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: C.primary + "18",
    borderWidth: 1.5,
    borderColor: C.primary + "35",
    alignItems: "center",
    justifyContent: "center",
  },
});

// ── Splash / checking screen ─────────────────────────────────
function SplashScreen({
  phase,
  savedName,
}: {
  phase: BootPhase;
  savedName?: string;
}) {
  const msgs: Record<BootPhase, string> = {
    checking: savedName ? `Connecting to ${savedName}…` : "Checking API…",
    no_api: "No API configured",
    api_error: "Could not reach API",
    ready: "Ready",
  };

  return (
    <View style={sp.root}>
      <Logo />
      <Text style={sp.title}>StockFlow</Text>
      <View style={sp.pill}>
        {phase === "checking" && (
          <ActivityIndicator
            size="small"
            color={C.primary}
            style={{ marginRight: S.sm }}
          />
        )}
        {phase === "api_error" && (
          <Ionicons
            name="cloud-offline-outline"
            size={14}
            color={C.warning}
            style={{ marginRight: 5 }}
          />
        )}
        {phase === "no_api" && (
          <Ionicons
            name="settings-outline"
            size={14}
            color={C.textTertiary}
            style={{ marginRight: 5 }}
          />
        )}
        <Text style={sp.pillTxt}>{msgs[phase]}</Text>
      </View>
    </View>
  );
}

const sp = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: S.lg,
  },
  title: {
    fontSize: F.xxxl,
    fontWeight: W.heavy,
    color: C.textPrimary,
    letterSpacing: -1,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgCard,
    borderRadius: 99,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  pillTxt: { fontSize: F.sm, color: C.textSecondary, fontWeight: W.medium },
});

// ── Root layout ───────────────────────────────────────────────
export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const { loadState, isAuthenticated, apiSettings, setApiSettings } =
    useAppStore();

  const [phase, setPhase] = useState<BootPhase>("checking");
  const [bootDone, setBootDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Boot sequence ─────────────────────────────────────────
  useEffect(() => {
    boot();
  }, []);

  const boot = async () => {
    setPhase("checking");

    // 1. Hydrate Zustand from secure storage
    await loadState();

    // 2. Resolve base URL (storage override → .env default)
    const url = await api.init();

    if (!url) {
      // No URL at all → must configure
      setPhase("no_api");
      setBootDone(true);
      return;
    }

    // 3. Ping the API
    try {
      const config = await api.ping();

      // 4. Persist the full config
      const settings: ApiSettings = {
        baseUrl: api.getBaseURL(),
        config,
        savedAt: new Date().toISOString(),
      };
      await setApiSettings(settings);

      // If the server pre-loaded stores, cache them
      // (the settings screen will use them without an extra call)

      setPhase("ready");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setPhase("api_error");
    } finally {
      setBootDone(true);
    }
  };

  // ── Navigation guard (runs after boot + on auth change) ───
  useEffect(() => {
    if (!bootDone) return;

    const inConfigure = segments[0] === "configure";
    const inAuth = segments[0] === "(auth)";

    switch (phase) {
      case "no_api":
      case "api_error":
        if (!inConfigure) router.replace("/configure");
        break;

      case "ready":
        if (isAuthenticated && inAuth) router.replace("/(app)/(tabs)");
        if (!isAuthenticated && !inAuth && !inConfigure)
          router.replace("/(auth)/login");
        break;
    }
  }, [bootDone, phase, isAuthenticated]);

  // ── Show splash while booting ──────────────────────────────
  if (!bootDone || phase === "checking") {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={C.bg} />
        <SplashScreen phase={phase} savedName={apiSettings?.config?.app_name} />
      </SafeAreaProvider>
    );
  }

  // ── Main navigator ─────────────────────────────────────────
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={C.bg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
          animation: "fade",
        }}>
        {/* API configuration (shown when no_api or api_error) */}
        <Stack.Screen name="configure" />
        {/* Auth: login */}
        <Stack.Screen name="(auth)" />
        {/* Main app: tabs */}
        <Stack.Screen name="(app)" />
      </Stack>
    </SafeAreaProvider>
  );
}
