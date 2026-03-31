// app/(app)/(tabs)/more.tsx  — More (Settings, Offline Queue, Logout)

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import { Badge, Button, Card, SectionHeader } from "@/src/components/UI";
import { useNetwork } from "@/src/hooks/useNetwork";
import { useOfflineSync } from "@/src/hooks/useOfflineSync";
import { useAppStore } from "@/src/store/appStore";
import { InventoryItem, OfflineRecord, ReceivedStock } from "@/src/types";
import { formatDateTime, getErrorMessage } from "@/src/utils/helpers";
import { C, F, R, S, W } from "@/src/utils/theme";

export default function MoreScreen() {
  const router = useRouter();
  const { user, clearAuth, offlineQueue, removeOfflineRecord, markSynced } =
    useAppStore();
  const { isOnline } = useNetwork();
  const { syncAll } = useOfflineSync();

  const [syncing, setSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(false);

  const pending = offlineQueue.filter((r) => !r.synced);
  const done = offlineQueue.filter((r) => r.synced);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Sign out of StockFlow?", [
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

  const handleSyncAll = async () => {
    if (!isOnline) {
      Alert.alert("Offline", "Connect to internet first.");
      return;
    }
    setSyncing(true);
    await syncAll();
    setSyncing(false);
    Alert.alert("Done", `Sync complete.`);
  };

  const handleSyncOne = async (rec: OfflineRecord) => {
    if (!isOnline) return;
    setSyncingId(rec.id);
    try {
      if (rec.type === "receive_stock") {
        await api.createReceivedStock(rec.data as ReceivedStock);
      } else {
        await api.createInventoryItem(rec.data as InventoryItem);
      }
      await markSynced(rec.id);
    } catch (err) {
      Alert.alert("Sync Failed", getErrorMessage(err));
    } finally {
      setSyncingId(null);
    }
  };

  const { apiSettings } = useAppStore();

  const menuItems = [
    {
      icon: "server-outline" as const,
      label: "API Server",
      sub: api.getBaseURL(),
      onPress: () => router.push("/configure"),
      color: C.accent,
    },
    {
      icon: "person-outline" as const,
      label: "Account",
      sub: `${user?.name ?? user?.username}`,
      onPress: () => {},
      color: C.accentPurple,
    },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <Text style={s.title}>More</Text>
        <View
          style={[
            s.onlineDot,
            { backgroundColor: isOnline ? C.success : C.error },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}>
        {/* ── Offline Queue card ──────────────────────────── */}
        <Card>
          <TouchableOpacity
            style={s.queueHeader}
            onPress={() => setShowQueue((v) => !v)}
            activeOpacity={0.75}>
            <View
              style={[
                s.queueIcon,
                {
                  backgroundColor:
                    pending.length > 0 ? C.accentOrange + "20" : C.bgElevated,
                },
              ]}>
              <Ionicons
                name="cloud-upload-outline"
                size={22}
                color={pending.length > 0 ? C.accentOrange : C.textTertiary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.queueTitle}>Offline Queue</Text>
              <Text style={s.queueSub}>
                {pending.length} pending · {done.length} synced
              </Text>
            </View>
            {pending.length > 0 && (
              <View style={s.pendingBadge}>
                <Text style={s.pendingBadgeTxt}>{pending.length}</Text>
              </View>
            )}
            <Ionicons
              name={showQueue ? "chevron-up" : "chevron-down"}
              size={18}
              color={C.textTertiary}
            />
          </TouchableOpacity>

          {showQueue && (
            <View style={{ marginTop: S.md }}>
              {pending.length > 0 && (
                <Button
                  title={syncing ? "Syncing…" : `Sync All (${pending.length})`}
                  onPress={handleSyncAll}
                  loading={syncing}
                  disabled={!isOnline}
                  icon="cloud-upload-outline"
                  variant={isOnline ? "primary" : "secondary"}
                  style={{ marginBottom: S.md }}
                />
              )}

              {offlineQueue.length === 0 ? (
                <View style={s.emptyQ}>
                  <Ionicons
                    name="cloud-done-outline"
                    size={32}
                    color={C.textTertiary}
                  />
                  <Text style={s.emptyQTxt}>Queue is empty</Text>
                </View>
              ) : (
                offlineQueue.map((rec) => (
                  <View key={rec.id} style={s.qRec}>
                    <View
                      style={[
                        s.qRecIcon,
                        {
                          backgroundColor:
                            rec.type === "receive_stock"
                              ? C.accent + "20"
                              : C.primary + "20",
                        },
                      ]}>
                      <Ionicons
                        name={
                          rec.type === "receive_stock"
                            ? "download-outline"
                            : "cube-outline"
                        }
                        size={15}
                        color={
                          rec.type === "receive_stock" ? C.accent : C.primary
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.qRecType}>
                        {rec.type === "receive_stock"
                          ? "Received Stock"
                          : "Inventory Item"}
                      </Text>
                      <Text style={s.qRecTime}>
                        {formatDateTime(rec.timestamp)}
                      </Text>
                    </View>
                    <Badge
                      label={rec.synced ? "Synced" : "Pending"}
                      color={rec.synced ? C.accent : C.accentOrange}
                      bg={(rec.synced ? C.accent : C.accentOrange) + "20"}
                    />
                    {!rec.synced && (
                      <TouchableOpacity
                        style={s.qSyncBtn}
                        onPress={() => handleSyncOne(rec)}
                        disabled={!isOnline || syncingId === rec.id}>
                        {syncingId === rec.id ? (
                          <ActivityIndicator size="small" color={C.primary} />
                        ) : (
                          <Ionicons
                            name="cloud-upload-outline"
                            size={18}
                            color={isOnline ? C.primary : C.textDisabled}
                          />
                        )}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={s.qDelBtn}
                      onPress={() => {
                        Alert.alert("Remove", "Remove from queue?", [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove",
                            style: "destructive",
                            onPress: () => removeOfflineRecord(rec.id),
                          },
                        ]);
                      }}>
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={C.error}
                      />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </Card>

        {/* ── Menu items ──────────────────────────────────── */}
        <Card style={{ marginTop: S.md }}>
          <SectionHeader title="Settings" />
          {menuItems.map((item, i) => (
            <View key={item.label}>
              <TouchableOpacity
                style={s.menuRow}
                onPress={item.onPress}
                activeOpacity={0.7}>
                <View
                  style={[s.menuIcon, { backgroundColor: item.color + "18" }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.menuLabel}>{item.label}</Text>
                  <Text style={s.menuSub} numberOfLines={1}>
                    {item.sub}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={C.textTertiary}
                />
              </TouchableOpacity>
              {i < menuItems.length - 1 && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: C.border,
                    marginLeft: 52,
                  }}
                />
              )}
            </View>
          ))}
        </Card>

        {/* ── Logout ──────────────────────────────────────── */}
        <Button
          title="Sign Out"
          onPress={handleLogout}
          variant="danger"
          icon="log-out-outline"
          style={{ marginTop: S.md }}
        />

        <Text style={s.version}>StockFlow v1.0 · Expo SDK 52</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { fontSize: F.xl, fontWeight: W.bold, color: C.textPrimary },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  content: { padding: S.lg, paddingBottom: 80, gap: S.sm },

  // Queue
  queueHeader: { flexDirection: "row", alignItems: "center", gap: S.md },
  queueIcon: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
  },
  queueTitle: { fontSize: F.md, fontWeight: W.semibold, color: C.textPrimary },
  queueSub: { fontSize: F.xs, color: C.textTertiary, marginTop: 2 },
  pendingBadge: {
    backgroundColor: C.accentOrange,
    borderRadius: R.full,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  pendingBadgeTxt: { fontSize: 11, fontWeight: W.bold, color: C.white },
  emptyQ: { alignItems: "center", paddingVertical: S.xl, gap: S.sm },
  emptyQTxt: { fontSize: F.md, color: C.textTertiary },

  qRec: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    paddingVertical: S.sm,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  qRecIcon: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  qRecType: { fontSize: F.sm, color: C.textPrimary, fontWeight: W.medium },
  qRecTime: { fontSize: F.xs, color: C.textTertiary },
  qSyncBtn: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    backgroundColor: C.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  qDelBtn: {
    width: 32,
    height: 32,
    borderRadius: R.sm,
    backgroundColor: C.error + "15",
    alignItems: "center",
    justifyContent: "center",
  },

  // Menu
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    paddingVertical: S.md,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: F.md, color: C.textPrimary, fontWeight: W.medium },
  menuSub: { fontSize: F.xs, color: C.textTertiary, marginTop: 2 },

  version: {
    textAlign: "center",
    fontSize: F.xs,
    color: C.textTertiary,
    marginTop: S.lg,
  },
});
