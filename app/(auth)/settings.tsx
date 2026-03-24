import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import {
  Button,
  Card,
  Divider,
  Input,
  SectionHeader,
} from "@/src/components/UI";
import { useAppStore } from "@/src/store/appStore";
import { Store } from "@/src/types";
import { getErrorMessage } from "@/src/utils/helpers";
import { C, F, R, S, W } from "@/src/utils/themes";

const { width } = Dimensions.get("window");
const IS_TABLET = width >= 768;

export default function SettingsScreen() {
  const router = useRouter();
  const { selectedStore, setSelectedStore } = useAppStore();

  const [baseURL, setBaseURL] = useState("");
  const [stores, setStores] = useState<Store[]>([]);
  const [loadingURL, setLoadingURL] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [urlError, setUrlError] = useState("");

  // ── Init ───────────────────────────────────────────────────
  useEffect(() => {
    setBaseURL(api.getBaseURL());
    tryLoadStores();
  }, []);

  const tryLoadStores = async () => {
    setLoadingList(true);
    try {
      const data = await api.getStores();
      setStores(data);
    } catch {
      // API not reachable yet — that's fine
    } finally {
      setLoadingList(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await tryLoadStores();
    setRefreshing(false);
  }, []);

  // ── Save base URL ──────────────────────────────────────────
  const handleSaveURL = async () => {
    const trimmed = baseURL.trim();
    if (!trimmed) {
      setUrlError("Please enter a valid URL");
      return;
    }
    if (!trimmed.startsWith("http")) {
      setUrlError("URL must start with http:// or https://");
      return;
    }
    setUrlError("");
    setLoadingURL(true);
    try {
      await api.setBaseURL(trimmed);
      const res = await tryLoadStores();
      if (res === undefined) {
        Alert.alert("Error", "Error saving the store");
      } else {
        Alert.alert("Saved", "API URL updated successfully.");
      }
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    } finally {
      setLoadingURL(false);
    }
  };

  // ── Select store ───────────────────────────────────────────
  const handleSelectStore = (store: Store) => {
    setSelectedStore(store);
  };

  // ── UI ─────────────────────────────────────────────────────
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
          />
        }
        keyboardShouldPersistTaps="handled">
        {/* ── API URL card ────────────────────────────────── */}
        <Card style={s.section}>
          <SectionHeader
            title="Server Configuration"
            subtitle="Set the base URL of your StockFlow REST API"
          />

          <Input
            label="API Base URL"
            value={baseURL}
            onChangeText={(t) => {
              setBaseURL(t);
              setUrlError("");
            }}
            icon="globe-outline"
            placeholder="https://your-server.com/api/v1"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            error={urlError}
            hint="Example: https://your-server.com/api/v1"
            returnKeyType="done"
            onSubmitEditing={handleSaveURL}
          />

          <Button
            title="Save & Connect"
            onPress={handleSaveURL}
            loading={loadingURL}
            icon="save-outline"
          />

          {/* Tip */}
          <View style={s.tip}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={C.primary}
            />
            <Text style={s.tipText}>
              Use your local IP (not localhost) when testing on a physical
              device.
            </Text>
          </View>
        </Card>

        {/* ── Active store indicator ──────────────────────── */}
        {selectedStore && (
          <Card style={[s.section, s.activeCard]}>
            <View style={s.activeRow}>
              <View style={s.activeIconBox}>
                <Ionicons name="storefront" size={22} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.activeLabel}>Active Store</Text>
                <Text style={s.activeName}>{selectedStore.name}</Text>
                <Text style={s.activeCode}>
                  {selectedStore.code}
                  {selectedStore.city ? `  ·  ${selectedStore.city}` : ""}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedStore(null)}
                hitSlop={10}>
                <Ionicons
                  name="close-circle"
                  size={22}
                  color={C.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* ── Store list ──────────────────────────────────── */}
        <Card style={s.section}>
          <SectionHeader
            title="Select Store"
            subtitle={
              loadingList
                ? "Fetching stores…"
                : `${stores.length} store${stores.length !== 1 ? "s" : ""} found`
            }
            action={{ label: "Refresh", onPress: tryLoadStores }}
          />

          {loadingList ? (
            <ActivityIndicator
              color={C.primary}
              style={{ paddingVertical: S.xl }}
            />
          ) : stores.length === 0 ? (
            <View style={s.noStores}>
              <Ionicons
                name="storefront-outline"
                size={36}
                color={C.textTertiary}
              />
              <Text style={s.noStoresTitle}>No stores loaded</Text>
              <Text style={s.noStoresSub}>
                Save a valid API URL above and tap Refresh.
              </Text>
            </View>
          ) : (
            stores.map((store, idx) => {
              const isSelected = selectedStore?.id === store.id;
              return (
                <React.Fragment key={store.id}>
                  <TouchableOpacity
                    style={[s.storeRow, isSelected && s.storeRowSelected]}
                    onPress={() => handleSelectStore(store)}
                    activeOpacity={0.7}>
                    {/* Icon */}
                    <View
                      style={[s.storeIcon, isSelected && s.storeIconSelected]}>
                      <Ionicons
                        name="storefront-outline"
                        size={18}
                        color={isSelected ? C.primary : C.textTertiary}
                      />
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          s.storeName,
                          isSelected && { color: C.primary },
                        ]}>
                        {store.name}
                      </Text>
                      <Text style={s.storeCode}>
                        {store.code}
                        {store.city ? `  ·  ${store.city}` : ""}
                      </Text>
                    </View>

                    {/* Checkmark */}
                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={C.primary}
                      />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={C.textTertiary}
                      />
                    )}
                  </TouchableOpacity>

                  {idx < stores.length - 1 && (
                    <Divider style={{ marginVertical: S.xs, marginLeft: 54 }} />
                  )}
                </React.Fragment>
              );
            })
          )}
        </Card>

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

  // API tip
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: S.sm,
    marginTop: S.md,
    backgroundColor: C.primary + "12",
    borderRadius: R.md,
    padding: S.md,
  },
  tipText: { flex: 1, fontSize: F.xs, color: C.primary, lineHeight: 18 },

  // Active store card
  activeCard: {
    borderColor: C.accent + "40",
    backgroundColor: C.accent + "08",
  },
  activeRow: { flexDirection: "row", alignItems: "center", gap: S.md },
  activeIconBox: {
    width: 48,
    height: 48,
    borderRadius: R.md,
    backgroundColor: C.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  activeLabel: { fontSize: F.xs, color: C.accent, fontWeight: W.medium },
  activeName: { fontSize: F.md, color: C.textPrimary, fontWeight: W.semibold },
  activeCode: { fontSize: F.xs, color: C.textTertiary },

  // No stores placeholder
  noStores: { alignItems: "center", paddingVertical: S.xl, gap: S.sm },
  noStoresTitle: {
    fontSize: F.md,
    color: C.textSecondary,
    fontWeight: W.medium,
  },
  noStoresSub: { fontSize: F.sm, color: C.textTertiary, textAlign: "center" },

  // Store list rows
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    paddingVertical: S.md,
    paddingHorizontal: S.sm,
    borderRadius: R.md,
  },
  storeRowSelected: { backgroundColor: C.primary + "10" },

  storeIcon: {
    width: 38,
    height: 38,
    borderRadius: R.sm,
    backgroundColor: C.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  storeIconSelected: { backgroundColor: C.primary + "20" },

  storeName: { fontSize: F.md, color: C.textPrimary, fontWeight: W.medium },
  storeCode: { fontSize: F.xs, color: C.textTertiary, marginTop: 2 },
});
