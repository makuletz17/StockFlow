import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import { Button, Card, Input, SectionHeader } from "@/src/components/UI";
import { C, F, R, S, W } from "@/src/utils/theme";

const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

export default function SettingsScreen() {
  const router = useRouter();
  const [baseURL, setBaseURL] = useState("");

  //  Init
  useEffect(() => {
    setBaseURL(btoa(api.getBaseURL()));
  }, []);

  // UI
  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>API Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.content, IS_TABLET && s.contentTablet]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* ── API URL card ────────────────────────────────── */}
        <Card style={s.section}>
          <SectionHeader
            title="Server Configuration"
            subtitle="Your API is already configured and ready to use"
          />

          <Input
            label="API Base URL"
            value={baseURL}
            editable={false}
            icon="lock-closed-outline"
          />

          {/* Status */}
          <View style={s.successBox}>
            <Ionicons name="checkmark-circle" size={18} color={C.success} />
            <Text style={s.successText}>
              Configuration is valid and ready to use.
            </Text>
          </View>
        </Card>

        <Button
          title="Change API URL"
          onPress={() => {
            // navigate to configure screen or enable edit mode
            router.push("/configure");
          }}
          variant="secondary"
          icon="create-outline"
        />
        {/* ── Back to login ────────────────────────────────── */}
        <Button
          title="Back to Login"
          onPress={() => router.back()}
          variant="ghost"
          icon="arrow-back-outline"
          style={{ marginTop: S.sm }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: F.xl, fontWeight: W.bold, color: C.textPrimary },
  backBtn: { padding: S.xs },

  // Content
  content: { padding: S.lg, paddingBottom: S.xxxl, gap: S.lg },
  contentTablet: { paddingHorizontal: width * 0.1 },

  section: {},

  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    marginTop: S.md,
    backgroundColor: C.success + "12",
    borderRadius: R.md,
    padding: S.md,
  },
  successText: {
    flex: 1,
    fontSize: F.sm,
    color: C.success,
    fontWeight: W.medium,
  },
});
