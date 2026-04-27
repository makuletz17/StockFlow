import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import { useNetwork } from "@/src/hooks/useNetwork";
import { useOfflineSync } from "@/src/hooks/useOfflineSync";
import { useAppStore } from "@/src/store/appStore";
import { DRAFTS_KEY } from "@/src/utils/storage";
import { C, F, R, S, W } from "@/src/utils/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";

type IconName = keyof typeof Ionicons.glyphMap;
type MaterialIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function DashboardScreen() {
  const router = useRouter();
  const { user, offlineQueue, clearAuth } = useAppStore();
  const { isOnline } = useNetwork();
  const [draftCount, setDraftCount] = useState(0);
  useOfflineSync();

  const pending = offlineQueue.filter((r) => !r.synced);

  useFocusEffect(
    useCallback(() => {
      const loadDraftCount = async () => {
        try {
          const stored = await AsyncStorage.getItem(DRAFTS_KEY);
          if (stored) {
            const parsed = JSON.parse(stored);
            setDraftCount(parsed.length || 0);
          }
        } catch (e) {
          console.log(e);
        }
      };

      loadDraftCount();
    }, []),
  );

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await api.logout();
          await clearAuth();
        },
      },
    ]);
  };

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  };

  const quickActions: {
    label: string;
    icon: MaterialIconName;
    color: string;
    route: string;
  }[] = [
    {
      label: "Receive\nStock",
      icon: "package-variant",
      color: C.accent,
      route: "/(app)/(tabs)/receive",
    },
    {
      label: "Withdraw\nStock",
      icon: "package-variant-minus",
      color: C.error,
      route: "/(app)/withdraw",
    },
    {
      label: "Inventory\nList",
      icon: "clipboard-text",
      color: C.primary,
      route: "/(app)/(tabs)/inventory",
    },
    {
      label: "More\nOptions",
      icon: "dots-horizontal-circle-outline",
      color: C.accentOrange,
      route: "/(app)/(tabs)/more",
    },
  ];

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ──────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.greeting}>{greeting()},</Text>
          <Text style={s.userName} numberOfLines={1}>
            {user?.name ?? user?.username ?? "User"}
          </Text>
        </View>

        <View style={s.headerRight}>
          {/* Pending offline badge */}
          {pending.length > 0 && (
            <TouchableOpacity
              style={s.pendingBtn}
              onPress={() => router.push("/(app)/(tabs)/more")}>
              <Ionicons
                name="cloud-upload-outline"
                size={16}
                color={C.accentOrange}
              />
              <Text style={s.pendingCount}>{pending.length}</Text>
            </TouchableOpacity>
          )}

          {/* Logout */}
          <TouchableOpacity onPress={handleLogout} style={s.iconBtn}>
            <Ionicons name="log-out-outline" size={24} color={C.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}>
        {/* ── Offline banner ────────────────────────────── */}
        {!isOnline && (
          <View style={s.offlineBanner}>
            <Ionicons
              name="cloud-offline-outline"
              size={16}
              color={C.warning}
            />
            <Text style={s.offlineTxt}>
              {"Offline Mode"}
              {pending.length > 0 ? `  ·  ${pending.length} pending sync` : ""}
            </Text>
          </View>
        )}

        {/* ── Pending sync banner ───────────────────────── */}
        {isOnline && pending.length > 0 && (
          <TouchableOpacity
            style={s.syncBanner}
            onPress={() => router.push("/(app)/(tabs)/more")}>
            <Ionicons
              name="cloud-upload-outline"
              size={16}
              color={C.accentOrange}
            />
            <Text style={s.syncTxt}>
              {pending.length} record{pending.length > 1 ? "s" : ""} waiting to
              sync
            </Text>
            <Ionicons name="chevron-forward" size={14} color={C.accentOrange} />
          </TouchableOpacity>
        )}

        {/* ── Welcome card ──────────────────────────────── */}
        <View style={s.welcomeCard}>
          <View style={s.welcomeIconBox}>
            <Ionicons name="layers" size={32} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.welcomeTitle}>StockFlow</Text>
            <Text style={s.welcomeSub}>
              Inventory Receiving & Encoding System
            </Text>
          </View>
        </View>

        {/* ── Quick Actions ──────────────────────────────── */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.quickGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[s.quickCard, { borderColor: a.color + "30" }]}
              onPress={() => router.push(a.route as never)}
              activeOpacity={0.75}>
              <View style={[s.quickIcon, { backgroundColor: a.color + "18" }]}>
                <MaterialCommunityIcons
                  name={a.icon}
                  size={26}
                  color={a.color}
                />
              </View>
              <Text style={s.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Info rows ─────────────────────────────────── */}
        <Text style={s.sectionTitle}>Status</Text>
        <View style={s.infoCard}>
          <InfoRow
            icon="archive-outline"
            label="Drafts"
            value={
              draftCount > 0
                ? `${draftCount} draft${draftCount > 1 ? "s" : ""}`
                : "No drafts"
            }
            valueColor={draftCount > 0 ? C.accentPurple : C.textTertiary}
          />
          <View style={s.divider} />
          <InfoRow
            icon="wifi-outline"
            label="Connection"
            value={isOnline ? "Online" : "Offline"}
            valueColor={isOnline ? C.accent : C.error}
          />
          <View style={s.divider} />
          <InfoRow
            icon="cloud-upload-outline"
            label="Pending sync"
            value={
              pending.length > 0
                ? `${pending.length} record${pending.length > 1 ? "s" : ""}`
                : "All synced"
            }
            valueColor={pending.length > 0 ? C.accentOrange : C.accent}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Info row helper ──────────────────────────────────────────
function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: IconName;
  label: string;
  value: string;
  valueColor: string;
}) {
  return (
    <View style={ir.row}>
      <View style={ir.iconBox}>
        <Ionicons name={icon} size={18} color={C.textTertiary} />
      </View>
      <Text style={ir.label}>{label}</Text>
      <Text style={[ir.value, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: S.md,
    paddingHorizontal: S.lg,
    gap: S.md,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    backgroundColor: C.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: F.sm,
    color: C.textSecondary,
    fontWeight: W.medium,
  },
  value: { fontSize: F.sm, fontWeight: W.semibold },
});

// ── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  greeting: { fontSize: F.sm, color: C.textTertiary },
  userName: { fontSize: F.xl, fontWeight: W.bold, color: C.textPrimary },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    paddingTop: 4,
  },
  pendingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.accentOrange + "18",
    paddingHorizontal: S.sm,
    paddingVertical: 4,
    borderRadius: R.full,
  },
  pendingCount: { fontSize: F.xs, color: C.accentOrange, fontWeight: W.bold },
  iconBtn: { padding: S.xs },

  scroll: { padding: S.lg, paddingBottom: 80 },

  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.warning + "18",
    borderWidth: 1,
    borderColor: C.warning + "40",
    borderRadius: R.md,
    padding: S.md,
    marginBottom: S.lg,
  },
  offlineTxt: { fontSize: F.sm, color: C.warning, fontWeight: W.medium },

  syncBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.accentOrange + "15",
    borderWidth: 1,
    borderColor: C.accentOrange + "40",
    borderRadius: R.md,
    padding: S.md,
    marginBottom: S.lg,
  },
  syncTxt: {
    flex: 1,
    fontSize: F.sm,
    color: C.accentOrange,
    fontWeight: W.medium,
  },

  welcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.lg,
    backgroundColor: C.bgCard,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.primary + "30",
    marginBottom: S.xl,
  },
  welcomeIconBox: {
    width: 56,
    height: 56,
    borderRadius: R.lg,
    backgroundColor: C.primary + "18",
    borderWidth: 1.5,
    borderColor: C.primary + "35",
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeTitle: { fontSize: F.xl, fontWeight: W.bold, color: C.textPrimary },
  welcomeSub: {
    fontSize: F.xs,
    color: C.textTertiary,
    marginTop: 3,
    lineHeight: 16,
  },

  sectionTitle: {
    fontSize: F.lg,
    fontWeight: W.bold,
    color: C.textPrimary,
    marginBottom: S.md,
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.sm,
    marginBottom: S.xl,
  },
  quickCard: {
    width: "47.5%",
    backgroundColor: C.bgCard,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  quickIcon: {
    width: 50,
    height: 50,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: S.sm,
  },
  quickLabel: {
    fontSize: F.sm,
    fontWeight: W.semibold,
    color: C.textPrimary,
    lineHeight: 18,
  },

  infoCard: {
    backgroundColor: C.bgCard,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: C.border },
});
