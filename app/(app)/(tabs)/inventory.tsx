// app/(app)/(tabs)/inventory.tsx  — Inventory List + Encoding

import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import BarcodeScannerModal from "@/src/components/BarcodeScannerModal";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  SectionHeader,
} from "@/src/components/UI";
import { useNetwork } from "@/src/hooks/useNetwork";
import { useAppStore } from "@/src/store/appStore";
import { InventoryItem } from "@/src/types";
import {
  csvToRows,
  generateId,
  getErrorMessage,
  rowsToCSV,
} from "@/src/utils/helpers";
import { C, F, R, S, W } from "@/src/utils/themes";

const CATEGORIES = [
  "Grocery",
  "Beverage",
  "Personal Care",
  "Household",
  "Electronics",
  "Clothing",
  "Medicine",
  "Others",
];
const UNITS = [
  "PC",
  "BOX",
  "CASE",
  "KG",
  "G",
  "L",
  "ML",
  "PACK",
  "ROLL",
  "SET",
];

// ─── Encoding Modal ──────────────────────────────────────────
function EncodeModal({
  visible,
  onClose,
  onSaved,
  existing,
  storeId,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (item: InventoryItem) => void;
  existing?: InventoryItem | null;
  storeId?: number;
}) {
  const { isOnline } = useNetwork();
  const { addOfflineRecord } = useAppStore();
  const [scanner, setScanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<InventoryItem>({
    barcode: "",
    sku: "",
    description: "",
    category: "",
    unit: "",
    stock: 0,
    min_stock: 0,
    cost_price: 0,
    selling_price: 0,
  });

  useEffect(() => {
    if (visible) {
      setForm(
        existing ?? {
          barcode: "",
          sku: "",
          description: "",
          category: "",
          unit: "",
          stock: 0,
          min_stock: 0,
          cost_price: 0,
          selling_price: 0,
        },
      );
      setErrors({});
    }
  }, [visible, existing]);

  const set = (k: keyof InventoryItem) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.barcode.trim()) e.barcode = "Required";
    if (!form.sku.trim()) e.sku = "Required";
    if (!form.description.trim()) e.description = "Required";
    if (!form.category) e.category = "Select category";
    if (!form.unit) e.unit = "Select unit";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload: InventoryItem = { ...form, store_id: storeId };

    if (!isOnline) {
      await addOfflineRecord({
        id: generateId(),
        type: "inventory_item",
        data: payload,
        timestamp: new Date().toISOString(),
        synced: false,
      });
      onSaved(payload);
      onClose();
      return;
    }

    setSaving(true);
    try {
      let saved: InventoryItem;
      if (existing?.id) {
        saved = await api.updateInventoryItem(existing.id, payload);
      } else {
        saved = await api.createInventoryItem(payload);
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={em.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={em.title}>{existing ? "Edit Item" : "New Item"}</Text>
          <View style={{ width: 32 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={em.content}
            keyboardShouldPersistTaps="handled">
            <Card>
              <SectionHeader title="Identification" />
              <View style={em.barcodeRow}>
                <Input
                  label="Barcode"
                  value={form.barcode}
                  onChangeText={(t) => {
                    set("barcode")(t);
                    setErrors((e) => ({ ...e, barcode: "" }));
                  }}
                  icon="barcode-outline"
                  placeholder="Scan or type"
                  autoCapitalize="none"
                  error={errors.barcode}
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                />
                <TouchableOpacity
                  style={em.scanBtn}
                  onPress={() => setScanner(true)}>
                  <Ionicons name="scan-outline" size={22} color={C.primary} />
                </TouchableOpacity>
              </View>
              <Input
                label="SKU"
                value={form.sku}
                onChangeText={(t) => {
                  set("sku")(t);
                  setErrors((e) => ({ ...e, sku: "" }));
                }}
                icon="pricetag-outline"
                placeholder="Stock keeping unit"
                autoCapitalize="characters"
                error={errors.sku}
              />
            </Card>

            <Card style={{ marginTop: S.md }}>
              <SectionHeader title="Product Info" />
              <Input
                label="Description"
                value={form.description}
                onChangeText={(t) => {
                  set("description")(t);
                  setErrors((e) => ({ ...e, description: "" }));
                }}
                icon="text-outline"
                placeholder="Full product name"
                error={errors.description}
              />

              <Text style={em.chipLabel}>
                Category{" "}
                {errors.category ? (
                  <Text style={{ color: C.error }}>*</Text>
                ) : null}
              </Text>
              <View style={em.chips}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[em.chip, form.category === c && em.chipActive]}
                    onPress={() => {
                      set("category")(c);
                      setErrors((e) => ({ ...e, category: "" }));
                    }}>
                    <Text
                      style={[
                        em.chipTxt,
                        form.category === c && em.chipTxtActive,
                      ]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[em.chipLabel, { marginTop: S.md }]}>
                Unit{" "}
                {errors.unit ? <Text style={{ color: C.error }}>*</Text> : null}
              </Text>
              <View style={em.chips}>
                {UNITS.map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[em.chip, form.unit === u && em.chipActive]}
                    onPress={() => {
                      set("unit")(u);
                      setErrors((e) => ({ ...e, unit: "" }));
                    }}>
                    <Text
                      style={[em.chipTxt, form.unit === u && em.chipTxtActive]}>
                      {u}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            <Card style={{ marginTop: S.md }}>
              <SectionHeader title="Stock & Pricing" />
              <View style={em.row2}>
                <Input
                  label="Stock"
                  value={String(form.stock ?? "")}
                  onChangeText={(t) =>
                    setForm((f) => ({ ...f, stock: Number(t) || 0 }))
                  }
                  keyboardType="numeric"
                  icon="layers-outline"
                  containerStyle={{ flex: 1, marginRight: S.sm }}
                />
                <Input
                  label="Min Stock"
                  value={String(form.min_stock ?? "")}
                  onChangeText={(t) =>
                    setForm((f) => ({ ...f, min_stock: Number(t) || 0 }))
                  }
                  keyboardType="numeric"
                  icon="alert-circle-outline"
                  containerStyle={{ flex: 1 }}
                />
              </View>
              <View style={em.row2}>
                <Input
                  label="Cost Price"
                  value={String(form.cost_price ?? "")}
                  onChangeText={(t) =>
                    setForm((f) => ({ ...f, cost_price: Number(t) || 0 }))
                  }
                  keyboardType="decimal-pad"
                  icon="cash-outline"
                  containerStyle={{ flex: 1, marginRight: S.sm }}
                />
                <Input
                  label="Sell Price"
                  value={String(form.selling_price ?? "")}
                  onChangeText={(t) =>
                    setForm((f) => ({ ...f, selling_price: Number(t) || 0 }))
                  }
                  keyboardType="decimal-pad"
                  icon="cart-outline"
                  containerStyle={{ flex: 1 }}
                />
              </View>
            </Card>

            <Button
              title={
                existing
                  ? "Update Item"
                  : isOnline
                    ? "Add to Inventory"
                    : "Save Offline"
              }
              onPress={handleSave}
              loading={saving}
              icon={existing ? "create-outline" : "add-circle-outline"}
              style={{ marginTop: S.md }}
            />
          </ScrollView>
        </KeyboardAvoidingView>

        <BarcodeScannerModal
          visible={scanner}
          onClose={() => setScanner(false)}
          onScanned={(code) => {
            setForm((f) => ({ ...f, barcode: code }));
          }}
          title="Scan Barcode"
        />
      </SafeAreaView>
    </Modal>
  );
}

const em = StyleSheet.create({
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
  content: { padding: S.lg, paddingBottom: 60, gap: S.sm },
  barcodeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: S.sm,
    marginBottom: S.md,
  },
  scanBtn: {
    width: 50,
    height: 50,
    borderRadius: R.md,
    backgroundColor: C.primary + "18",
    borderWidth: 1.5,
    borderColor: C.primary + "40",
    alignItems: "center",
    justifyContent: "center",
  },
  chipLabel: {
    fontSize: F.sm,
    color: C.textSecondary,
    fontWeight: W.medium,
    marginBottom: S.sm,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  chip: {
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    borderRadius: R.full,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgElevated,
  },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
  chipTxt: { fontSize: F.sm, color: C.textSecondary, fontWeight: W.medium },
  chipTxtActive: { color: C.white },
  row2: { flexDirection: "row" },
});

// ─── Main list screen ────────────────────────────────────────
export default function InventoryScreen() {
  const { selectedStore } = useAppStore();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [encodeModal, setEncodeModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    load(true);
  }, [search, category, selectedStore]);

  const load = async (reset = false) => {
    const pg = reset ? 1 : page;
    if (reset) {
      setLoading(true);
      setPage(1);
    }
    try {
      const res = await api.getInventory({
        search: search || undefined,
        category: category || undefined,
        store_id: selectedStore?.id,
        page: pg,
      });
      setItems(reset ? res.data : (prev) => [...prev, ...res.data]);
      setHasMore(!!res.pagination && pg < res.pagination.total_pages);
      if (!reset) setPage(pg + 1);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, [search, category, selectedStore]);

  const handleDelete = (item: InventoryItem) => {
    Alert.alert("Delete Item", `Delete "${item.description}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteInventoryItem(item.id!);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          } catch (err) {
            Alert.alert("Error", getErrorMessage(err));
          }
        },
      },
    ]);
  };

  // ── Export ─────────────────────────────────────────────────
  const handleExport = async () => {
    setMenuVisible(false);
    setExportLoading(true);
    try {
      let csv: string;
      try {
        csv = await api.exportInventoryCSV(selectedStore?.id);
      } catch {
        csv = rowsToCSV(
          items.map((i) => ({
            barcode: i.barcode,
            sku: i.sku,
            description: i.description,
            category: i.category,
            unit: i.unit,
            stock: i.stock ?? "",
            min_stock: i.min_stock ?? "",
            cost_price: i.cost_price ?? "",
            selling_price: i.selling_price ?? "",
          })),
        );
      }

      const fname = `inventory_${Date.now()}.csv`;
      const dest = (FileSystem.cacheDirectory ?? "") + fname;
      await FileSystem.writeAsStringAsync(dest, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dest, {
          mimeType: "text/csv",
          dialogTitle: "Export Inventory",
        });
      } else {
        Alert.alert("Exported", fname);
      }
    } catch (err) {
      Alert.alert("Export Failed", getErrorMessage(err));
    } finally {
      setExportLoading(false);
    }
  };

  // ── Import ─────────────────────────────────────────────────
  const handleImport = async () => {
    setMenuVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      setImportLoading(true);
      const csv = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const rows = csvToRows(csv);
      if (!rows.length) {
        Alert.alert("Empty", "No data found in file.");
        return;
      }

      try {
        const res = await api.importInventoryCSV(csv, selectedStore?.id ?? 0);
        Alert.alert("Import Complete", `${res.imported} items imported.`);
        load(true);
      } catch {
        Alert.alert(
          "Preview",
          `Found ${rows.length} rows. Configure your API to import.`,
        );
      }
    } catch (err) {
      Alert.alert("Import Failed", getErrorMessage(err));
    } finally {
      setImportLoading(false);
    }
  };

  const stockColor = (item: InventoryItem) => {
    if ((item.stock ?? 0) <= 0) return C.error;
    if (item.min_stock && (item.stock ?? 0) <= item.min_stock) return C.warning;
    return C.accent;
  };

  const renderItem = ({ item }: { item: InventoryItem }) => (
    <Card style={s.row}>
      <View style={s.rowTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.rowDesc} numberOfLines={2}>
            {item.description}
          </Text>
          <Text style={s.rowSku}>
            {item.sku} · {item.barcode}
          </Text>
        </View>
        <View style={s.stockBox}>
          <Text style={[s.stockQty, { color: stockColor(item) }]}>
            {item.stock ?? "—"}
          </Text>
          <Text style={s.stockUnit}>{item.unit}</Text>
        </View>
      </View>
      <View style={s.rowBot}>
        <Badge label={item.category} color={C.primary} bg={C.primary + "18"} />
        <View style={{ flexDirection: "row", gap: S.sm }}>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => {
              setEditingItem(item);
              setEncodeModal(true);
            }}>
            <Ionicons name="create-outline" size={17} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={s.actionBtn}
            onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={17} color={C.error} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Inventory</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: S.sm }}>
          {(importLoading || exportLoading) && (
            <ActivityIndicator color={C.primary} size="small" />
          )}
          <TouchableOpacity
            onPress={() => setMenuVisible((v) => !v)}
            hitSlop={10}>
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={C.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Action menu */}
      {menuVisible && (
        <View style={s.menu}>
          <TouchableOpacity style={s.menuItem} onPress={handleImport}>
            <Ionicons name="download-outline" size={18} color={C.accent} />
            <Text style={s.menuTxt}>Import CSV</Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: C.border }} />
          <TouchableOpacity style={s.menuItem} onPress={handleExport}>
            <Ionicons name="share-outline" size={18} color={C.primary} />
            <Text style={s.menuTxt}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons
          name="search-outline"
          size={17}
          color={C.textTertiary}
          style={{ marginRight: S.sm }}
        />
        <TextInput
          style={s.searchInput}
          placeholder="Name, SKU, barcode…"
          placeholderTextColor={C.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={17} color={C.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.catScroll}
        contentContainerStyle={s.catContent}>
        {["All", ...CATEGORIES].map((c) => {
          const active = c === "All" ? !category : category === c;
          return (
            <TouchableOpacity
              key={c}
              style={[s.catChip, active && s.catChipActive]}
              onPress={() => setCategory(c === "All" ? "" : c)}>
              <Text style={[s.catChipTxt, active && s.catChipTxtActive]}>
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => {
          setEditingItem(null);
          setEncodeModal(true);
        }}>
        <Ionicons name="add" size={30} color={C.white} />
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.primary}
            />
          }
          onEndReached={() => {
            if (hasMore) load();
          }}
          onEndReachedThreshold={0.4}
          ItemSeparatorComponent={() => <View style={{ height: S.sm }} />}
          ListEmptyComponent={
            <EmptyState
              icon="cube-outline"
              title="No items yet"
              subtitle="Tap + to add items, or import from CSV"
              action={{
                label: "Add Item",
                onPress: () => {
                  setEditingItem(null);
                  setEncodeModal(true);
                },
              }}
            />
          }
          ListFooterComponent={
            hasMore ? (
              <ActivityIndicator
                color={C.primary}
                style={{ paddingVertical: S.lg }}
              />
            ) : null
          }
        />
      )}

      <EncodeModal
        visible={encodeModal}
        onClose={() => setEncodeModal(false)}
        onSaved={(item) => {
          if (editingItem) {
            setItems((prev) => prev.map((i) => (i.id === item.id ? item : i)));
          } else {
            setItems((prev) => [item, ...prev]);
          }
        }}
        existing={editingItem}
        storeId={selectedStore?.id}
      />
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

  menu: {
    position: "absolute",
    top: 58,
    right: S.lg,
    zIndex: 20,
    backgroundColor: C.bgElevated,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    minWidth: 180,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.md,
    padding: S.lg,
  },
  menuTxt: { fontSize: F.md, color: C.textPrimary, fontWeight: W.medium },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bgInput,
    marginHorizontal: S.lg,
    marginTop: S.md,
    borderRadius: R.full,
    paddingHorizontal: S.md,
    height: 44,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, color: C.textPrimary, fontSize: F.md },

  catScroll: { maxHeight: 46, flexGrow: 0, marginTop: S.sm },
  catContent: { paddingHorizontal: S.lg, gap: S.sm, paddingBottom: S.sm },
  catChip: {
    paddingHorizontal: S.md,
    paddingVertical: S.xs + 1,
    borderRadius: R.full,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
  },
  catChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  catChipTxt: { fontSize: F.sm, color: C.textTertiary, fontWeight: W.medium },
  catChipTxtActive: { color: C.white },

  list: { padding: S.lg, paddingBottom: 90 },

  row: { padding: S.md },
  rowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: S.md,
  },
  rowDesc: {
    fontSize: F.md,
    fontWeight: W.semibold,
    color: C.textPrimary,
    flex: 1,
    paddingRight: S.md,
  },
  rowSku: { fontSize: F.xs, color: C.textTertiary, marginTop: 3 },
  stockBox: { alignItems: "center", minWidth: 44 },
  stockQty: { fontSize: F.xl, fontWeight: W.bold },
  stockUnit: { fontSize: F.xs, color: C.textTertiary },
  rowBot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    backgroundColor: C.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
