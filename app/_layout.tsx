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

//Animated logo
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

// Splash / checking screen
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

// ── Helper — reads ApiSettings directly from storage ─────────
// We call this instead of reading from Zustand because loadState()
// is async and Zustand state updates are not instant in the same tick.
async function getStoredApiSettings() {
  const { storage } = await import("@/src/utils/storage");
  const raw = await storage.get("sf_api_settings");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Root layout ───────────────────────────────────────────────
export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const { loadState, isAuthenticated, apiSettings, setApiSettings } =
    useAppStore();
  const loginRequired = apiSettings?.loginRequired ?? true;

  const [phase, setPhase] = useState<BootPhase>("checking");
  const [bootDone, setBootDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ── Boot sequence ─────────────────────────────────────────
  useEffect(() => {
    boot();
  }, []);

  const boot = async () => {
    setPhase("checking");

    // 1. Hydrate Zustand from secure storage (user, store, apiSettings)
    await loadState();

    // 2. Resolve base URL: saved override → .env default
    const url = await api.init();

    if (!url) {
      // No URL configured anywhere → send to configure screen
      setPhase("no_api");
      setBootDone(true);
      return;
    }

    // 3. Check if we already have saved apiSettings from a previous session.
    //    If yes, TRUST them and skip the ping — avoids showing /configure
    //    on every reload just because the network is momentarily slow.
    //    The user can always re-test from the configure screen.
    const stored = await getStoredApiSettings();

    if (stored) {
      // Already verified before — go straight to auth check
      const normalized: ApiSettings = {
        baseUrl: stored.baseUrl,
        config: stored.config ?? null,
        savedAt: stored.savedAt,
        loginRequired:
          typeof stored.loginRequired === "boolean"
            ? stored.loginRequired
            : true,
      };

      await setApiSettings(normalized);

      setPhase("ready");
      setBootDone(true);
      return;
    }

    // 4. First time with this URL — ping to verify reachability
    const reachable = await api.ping();

    if (reachable) {
      const settings: ApiSettings = {
        baseUrl: api.getBaseURL(),
        config: null,
        savedAt: new Date().toISOString(),
        loginRequired: true,
      };
      await setApiSettings(settings);
      setPhase("ready");
    } else {
      setErrorMsg("Server is not reachable. Check the URL and network.");
      setPhase("api_error");
    }

    setBootDone(true);
  };

  // ── Navigation guard ──────────────────────────────────────
  useEffect(() => {
    if (!bootDone) return;

    // segments[0] gives the first route segment e.g. 'configure', '(auth)', '(app)'
    const onConfigure = segments[0] === "configure";
    const onAuth = segments[0] === "(auth)";
    const onApp = segments[0] === "(app)";

    if (phase === "no_api" || phase === "api_error") {
      // Must configure first — always push to configure unless already there
      if (!onConfigure) router.replace("/configure");
      return;
    }

    if (phase === "ready") {
      if (!loginRequired) {
        if (!onApp) {
          router.replace("/(app)/(tabs)/withdraw");
        }
        return;
      }
      if (isAuthenticated) {
        if (!onApp && !onConfigure) {
          router.replace("/(app)/(tabs)");
        }
      } else {
        if (!onAuth && !onConfigure) {
          router.replace("/(auth)/login");
        }
      }
    }
  }, [bootDone, phase, isAuthenticated, loginRequired, segments]);

  // ── Show splash while booting ──────────────────────────────
  if (!bootDone || phase === "checking") {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={C.bg} />
        <SplashScreen phase={phase} savedName={"StockFlow"} />
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
