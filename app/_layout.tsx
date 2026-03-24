// app/_layout.tsx
//
// Root layout for expo-router.
// • Loads persisted auth state from secure storage on boot.
// • Initialises the API base URL.
// • Redirects to (auth) or (app) based on login status.

import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import { useAppStore } from "@/src/store/appStore";
import { C } from "@/src/utils/themes";

export default function RootLayout() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const { loadState, isAuthenticated } = useAppStore();
  const router = useRouter();
  const segments = useSegments();

  // ── Bootstrap ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await api.init(); // load saved base-URL
      await loadState(); // restore user / store from secure storage
      setBootstrapped(true);
    })();
  }, []);

  // ── Auth guard ─────────────────────────────────────────────
  useEffect(() => {
    if (!bootstrapped) return;

    const inAuth = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuth) {
      // Not logged in — push to login
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuth) {
      // Already logged in — push to app
      router.replace("/(app)/(tabs)");
    }
  }, [bootstrapped, isAuthenticated]);

  // ── Splash while booting ────────────────────────────────────
  if (!bootstrapped) {
    return (
      <View style={s.splash}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={C.bg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: C.bg },
        }}>
        {/* Auth group — login, forgot-password, etc. */}
        <Stack.Screen name="(auth)" />
        {/* Main app group — tabs + modals */}
        <Stack.Screen name="(app)" />
      </Stack>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
