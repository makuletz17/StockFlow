// app/(app)/(tabs)/index.tsx  — Dashboard

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import { Card, EmptyState, SectionHeader } from "@/src/components/UI";
import { useNetwork } from "@/src/hooks/useNetwork";
import { useOfflineSync } from "@/src/hooks/useOfflineSync";
import { useAppStore } from "@/src/store/appStore";
import { DashboardSummary } from "@/src/types";
import { formatDateTime } from "@/src/utils/helpers";
import { C, F, R, S, W } from "@/src/utils/theme";

type IconName = keyof typeof Ionicons.glyphMap;

export default function DashboardScreen() {
  const router = useRouter();
  const { user, selectedStore, offlineQueue, clearAuth } = useAppStore();
  const { isOnline } = useNetwork();
  useOfflineSync();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pending = offlineQueue.filter((r) => !r.synced);

  useEffect(() => {
    loadDashboard();
  }, [selectedStore]);

  const loadDashboard = async () => {
    if (!isOnline) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getDashboard(selectedStore?.id);
      setSummary(data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [selectedStore, isOnline]);

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
    icon: IconName;
    color: string;
    route: string;
  }[] = [
    {
      label: "Receive\nStock",
      icon: "add-circle-outline",
      color: C.accent,
      route: "/(app)/(tabs)/received",
    },
    {
      label: "Inventory\nList",
      icon: "cube-outline",
      color: C.primary,
      route: "/(app)/(tabs)/inventory",
    },
    {
      label: "Received\nList",
      icon: "receipt-outline",
      color: C.accentPurple,
      route: "/(app)/(tabs)/received-list",
    },
    {
      label: "More\nOptions",
      icon: "apps-outline",
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
          {selectedStore ? (
            <View style={s.storeChip}>
              <Ionicons name="storefront-outline" size={12} color={C.primary} />
              <Text style={s.storeChipText}>{selectedStore.name}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.headerRight}>
          {/* Online indicator */}
          <View
            style={[
              s.onlineDot,
              { backgroundColor: isOnline ? C.success : C.error },
            ]}
          />

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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }>
        {/* Offline banner */}
        {!isOnline && (
          <View style={s.offlineBanner}>
            <Ionicons
              name="cloud-offline-outline"
              size={16}
              color={C.warning}
            />
            <Text style={s.offlineTxt}>
              Offline Mode
              {pending.length > 0 ? `  ·  ${pending.length} pending sync` : ""}
            </Text>
          </View>
        )}

        {/* Pending sync banner */}
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

        {/* ── Quick Actions ──────────────────────────────── */}
        <SectionHeader title="Quick Actions" style={{ marginBottom: S.md }} />
        <View style={s.quickGrid}>
          {quickActions.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={[s.quickCard, { borderColor: a.color + "30" }]}
              onPress={() => router.push(a.route as never)}
              activeOpacity={0.75}>
              <View style={[s.quickIcon, { backgroundColor: a.color + "18" }]}>
                <Ionicons name={a.icon} size={26} color={a.color} />
              </View>
              <Text style={s.quickLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Stats ─────────────────────────────────────── */}
        <SectionHeader
          title="Overview"
          subtitle="Inventory snapshot"
          style={{ marginTop: S.xl }}
        />

        {loading ? (
          <ActivityIndicator
            color={C.primary}
            style={{ paddingVertical: S.xl }}
          />
        ) : summary ? (
          <>
            <View style={s.statsRow}>
              <StatCard
                label="Total Items"
                value={summary.total_items}
                icon="cube"
                color={C.primary}
              />
              <StatCard
                label="Low Stock"
                value={summary.low_stock_count}
                icon="warning"
                color={C.accentRed}
              />
            </View>
            <View style={[s.statsRow, { marginTop: S.sm }]}>
              <StatCard
                label="Received Today"
                value={summary.received_today}
                icon="download"
                color={C.accent}
              />
              <StatCard
                label="Pending"
                value={summary.pending_stocks}
                icon="time"
                color={C.accentOrange}
              />
            </View>

            {/* Recent activity */}
            {summary.recent_activity?.length > 0 && (
              <>
                <SectionHeader
                  title="Recent Activity"
                  style={{ marginTop: S.xl }}
                />
                <Card>
                  {summary.recent_activity.slice(0, 6).map((item, i) => (
                    <View key={item.id}>
                      <View style={s.actRow}>
                        <View
                          style={[
                            s.actDot,
                            {
                              backgroundColor:
                                item.type === "receive"
                                  ? C.accent
                                  : item.type === "inventory"
                                    ? C.primary
                                    : C.accentOrange,
                            },
                          ]}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={s.actDesc}>{item.description}</Text>
                          <Text style={s.actMeta}>
                            {item.user} · {formatDateTime(item.timestamp)}
                          </Text>
                        </View>
                      </View>
                      {i < summary.recent_activity.length - 1 && (
                        <View style={s.actDivider} />
                      )}
                    </View>
                  ))}
                </Card>
              </>
            )}
          </>
        ) : (
          <Card>
            <EmptyState
              icon="bar-chart-outline"
              title={
                isOnline
                  ? "Could not load summary"
                  : "Connect to internet for stats"
              }
              subtitle={isOnline ? "Pull down to retry" : undefined}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Mini StatCard ────────────────────────────────────────────
function StatCard(p: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={[st.card, { flex: 1 }]}>
      <View style={[st.icon, { backgroundColor: p.color + "20" }]}>
        <Ionicons name={p.icon} size={20} color={p.color} />
      </View>
      <Text style={st.value}>{p.value}</Text>
      <Text style={st.label}>{p.label}</Text>
    </View>
  );
}
const st = StyleSheet.create({
  card: {
    backgroundColor: C.bgCard,
    borderRadius: R.lg,
    padding: S.lg,
    borderWidth: 1,
    borderColor: C.border,
    marginHorizontal: S.xs / 2,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: S.sm,
  },
  value: { fontSize: F.xxl, fontWeight: W.bold, color: C.textPrimary },
  label: { fontSize: F.xs, color: C.textTertiary, marginTop: 2 },
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
  storeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.primary + "18",
    paddingHorizontal: S.sm,
    paddingVertical: 3,
    borderRadius: R.full,
    alignSelf: "flex-start",
    marginTop: S.xs,
  },
  storeChipText: { fontSize: F.xs, color: C.primary, fontWeight: W.medium },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    paddingTop: 4,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
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

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.sm,
    marginBottom: S.lg,
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

  statsRow: { flexDirection: "row", gap: S.sm },

  actRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: S.md,
    paddingVertical: S.sm,
  },
  actDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  actDesc: { fontSize: F.sm, color: C.textPrimary, fontWeight: W.medium },
  actMeta: { fontSize: F.xs, color: C.textTertiary, marginTop: 2 },
  actDivider: { height: 1, backgroundColor: C.border, marginLeft: 24 },
});
