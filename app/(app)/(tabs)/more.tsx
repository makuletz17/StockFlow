// app/(app)/(tabs)/more.tsx

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import { Badge, Button, Card, Input, SectionHeader } from "@/src/components/UI";
import { useNetwork } from "@/src/hooks/useNetwork";
import { useOfflineSync } from "@/src/hooks/useOfflineSync";
import { useAppStore } from "@/src/store/appStore";
import {
  ApiSettings,
  InventoryItem,
  OfflineRecord,
  ReceivedStock,
} from "@/src/types";
import { getErrorMessage } from "@/src/utils/helpers";
import { C, F, R, S, W } from "@/src/utils/theme";

export default function MoreScreen() {
  const router = useRouter();
  const [editingApi, setEditingApi] = useState(false);
  const {
    user,
    clearAuth,
    offlineQueue,
    removeOfflineRecord,
    markSynced,
    apiSettings,
    setApiSettings,
  } = useAppStore();

  const { isOnline } = useNetwork();
  const { syncAll } = useOfflineSync();

  const [syncing, setSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(false);

  const loginRequired = apiSettings?.loginRequired ?? true;

  const pending = offlineQueue.filter((r) => !r.synced);
  const done = offlineQueue.filter((r) => r.synced);

  // ── Toggle Login Required ─────────────────────────────
  const handleToggleLoginRequired = async (value: boolean) => {
    const updated: ApiSettings = {
      baseUrl: apiSettings?.baseUrl ?? "",
      config: apiSettings?.config ?? null,
      savedAt: apiSettings?.savedAt ?? new Date().toISOString(),
      loginRequired: value,
    };

    await setApiSettings(updated);
  };

  // ── Logout ─────────────────────────────────────────────
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

  // ── Sync All ───────────────────────────────────────────
  const handleSyncAll = async () => {
    if (!isOnline) {
      Alert.alert("Offline", "Connect to internet first.");
      return;
    }
    setSyncing(true);
    await syncAll();
    setSyncing(false);
    Alert.alert("Done", "Sync complete.");
  };

  // ── Sync One ───────────────────────────────────────────
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

  //Settings Menu
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

      <ScrollView contentContainerStyle={s.content}>
        {/* ─────────────────────────────────────────────── */}
        {/* LOGIN REQUIRED = TRUE (APP MODE) */}
        {/* ─────────────────────────────────────────────── */}
        {loginRequired ? (
          <>
            {/* Offline Queue */}
            <Card>
              <TouchableOpacity
                style={s.queueHeader}
                onPress={() => setShowQueue((v) => !v)}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={22}
                  color={C.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.queueTitle}>Offline Queue</Text>
                  <Text style={s.queueSub}>
                    {pending.length} pending · {done.length} synced
                  </Text>
                </View>
              </TouchableOpacity>

              {showQueue && (
                <View style={{ marginTop: S.md }}>
                  {offlineQueue.length === 0 ? (
                    <Text style={s.emptyQTxt}>Queue is empty</Text>
                  ) : (
                    offlineQueue.map((rec) => (
                      <View key={rec.id} style={s.qRec}>
                        <Text style={s.qRecType}>
                          {rec.type === "receive_stock"
                            ? "Received Stock"
                            : "Inventory Item"}
                        </Text>

                        <Badge
                          label={rec.synced ? "Synced" : "Pending"}
                          color={rec.synced ? C.accent : C.accentOrange}
                          bg={(rec.synced ? C.accent : C.accentOrange) + "20"}
                        />

                        {!rec.synced && (
                          <TouchableOpacity
                            onPress={() => handleSyncOne(rec)}
                            disabled={!isOnline || syncingId === rec.id}>
                            {syncingId === rec.id ? (
                              <ActivityIndicator />
                            ) : (
                              <Ionicons
                                name="cloud-upload-outline"
                                size={18}
                                color={C.primary}
                              />
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>
              )}
            </Card>

            {/* Settings */}
            <Card style={{ marginTop: S.md }}>
              <SectionHeader title="Settings" />

              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={s.menuRow}
                  onPress={item.onPress}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuLabel}>{item.label}</Text>
                    <Text style={s.menuSub}>{item.sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </Card>

            <Button
              title="Sign Out"
              onPress={handleLogout}
              variant="danger"
              icon="log-out-outline"
              style={{ marginTop: S.md }}
            />
          </>
        ) : (
          /* LOGIN REQUIRED = FALSE (CONFIG MODE) */
          <>
            <Card>
              <View style={s.toggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.toggleLabel}>Login Required</Text>
                  <Text style={s.toggleSub}>
                    Require login before accessing app
                  </Text>
                </View>

                <Switch
                  value={loginRequired}
                  onValueChange={handleToggleLoginRequired}
                  trackColor={{ false: "#ccc", true: C.primary }}
                  thumbColor={loginRequired ? C.primary : "#f4f3f4"}
                />
              </View>
            </Card>

            {/* API CONFIG */}
            <Card>
              <Text style={s.cardTitle}>API Server</Text>

              {!editingApi ? (
                <>
                  {/* READ-ONLY BASE64 DISPLAY */}
                  <View style={s.readOnlyBox}>
                    <Text style={s.base64Value} numberOfLines={2}>
                      {btoa(apiSettings?.baseUrl ?? "")}
                    </Text>
                  </View>

                  <Button
                    title="Change API"
                    onPress={() => setEditingApi(true)}
                    icon="create-outline"
                    variant="secondary"
                  />
                </>
              ) : (
                <>
                  <Input
                    value={apiSettings?.baseUrl ?? ""}
                    onChangeText={(t) =>
                      setApiSettings({
                        baseUrl: t,
                        config: null,
                        savedAt: new Date().toISOString(),
                        loginRequired,
                      })
                    }
                    placeholder="http://192.168.1.100:8000/api/v1"
                    icon="globe-outline"
                  />

                  <View style={{ flexDirection: "column", gap: S.sm }}>
                    <Button
                      title="Test & Save"
                      onPress={async () => {
                        const url = apiSettings?.baseUrl ?? "";
                        await api.setBaseURL(url);
                        const ok = await api.ping();

                        if (!ok) {
                          Alert.alert("Error", "Server not reachable");
                          return;
                        }

                        await setApiSettings({
                          baseUrl: url,
                          config: null,
                          savedAt: new Date().toISOString(),
                          loginRequired,
                        });

                        setEditingApi(false);
                        Alert.alert("Success", "Connected!");
                      }}
                      icon="wifi-outline"
                      variant="primary"
                    />

                    <Button
                      title="Cancel"
                      variant="ghost"
                      onPress={() => setEditingApi(false)}
                    />
                  </View>
                </>
              )}
            </Card>
          </>
        )}

        <Text style={s.version}>StockFlow v1.0</Text>
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
  // ── Toggle ─────────────────────────────
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    marginTop: S.sm,
  },

  toggleLabel: {
    fontSize: F.sm,
    fontWeight: W.semibold,
    color: C.textPrimary,
  },

  toggleSub: {
    fontSize: F.xs,
    color: C.textTertiary,
    marginTop: 2,
  },

  cardTitle: {
    fontSize: F.lg,
    fontWeight: W.bold,
    color: C.textPrimary,
    marginBottom: S.xs,
  },
  readOnlyBox: {
    padding: S.md,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    marginBottom: S.md,
  },
  base64Value: {
    fontSize: F.xs,
    color: C.textPrimary,
    fontFamily: "monospace",
  },
});
