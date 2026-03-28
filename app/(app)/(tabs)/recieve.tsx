// app/(app)/(tabs)/receive.tsx  — Receive Stock

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import BarcodeScannerModal from "@/src/components/BarcodeScannerModal";
import { Button, Card, Input, SectionHeader } from "@/src/components/UI";
import { useNetwork } from "@/src/hooks/useNetwork";
import { useAppStore } from "@/src/store/appStore";
import { Item, ReceivedStock, Supplier } from "@/src/types";
import { generateId, getErrorMessage, todayISO } from "@/src/utils/helpers";
import { C, F, R, S, W } from "@/src/utils/theme";

export default function ReceiveStockScreen() {
  const { selectedStore, addOfflineRecord } = useAppStore();
  const { isOnline } = useNetwork();

  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [scanner, setScanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showItemDrop, setShowItemDrop] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [showSupplierDrop, setShowSupplierDrop] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [date, setDate] = useState(todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOnline) return;
    api
      .getItems()
      .then(setItems)
      .catch(() => {});
    api
      .getSuppliers()
      .then(setSuppliers)
      .catch(() => {});
  }, [isOnline]);

  const filteredItems = items.filter(
    (i) =>
      i.description.toLowerCase().includes(itemSearch.toLowerCase()) ||
      i.sku.toLowerCase().includes(itemSearch.toLowerCase()) ||
      i.barcode.includes(itemSearch),
  );

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(supplierSearch.toLowerCase()),
  );

  const onBarcode = async (code: string) => {
    setItemSearch(code);
    try {
      const found = await api.getItemByBarcode(code);
      setSelectedItem(found);
      setItemSearch(found.description);
    } catch {
      Alert.alert("Not Found", `No item with barcode: ${code}`);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedItem) e.item = "Select an item";
    if (!quantity || Number(quantity) <= 0) e.qty = "Enter valid quantity";
    if (!selectedSupplier) e.supplier = "Select a supplier";
    if (!refNumber.trim()) e.ref = "Reference number required";
    if (!date) e.date = "Date required";
    if (!selectedStore) e.store = "No store selected — check Settings";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload: ReceivedStock = {
      item_id: selectedItem!.id,
      quantity: Number(quantity),
      supplier_id: selectedSupplier!.id,
      reference_number: refNumber.trim(),
      date,
      store_id: selectedStore!.id,
    };

    if (!isOnline) {
      await addOfflineRecord({
        id: generateId(),
        type: "receive_stock",
        data: payload,
        timestamp: new Date().toISOString(),
        synced: false,
      });
      Alert.alert("Saved Offline", "Will sync automatically when online.");
      reset();
      return;
    }

    setSubmitting(true);
    try {
      await api.createReceivedStock(payload);
      Alert.alert("Success ✓", "Stock received successfully!", [
        { text: "Add Another", onPress: reset },
        { text: "Done" },
      ]);
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSelectedItem(null);
    setItemSearch("");
    setSelectedSupplier(null);
    setSupplierSearch("");
    setQuantity("");
    setRefNumber("");
    setDate(todayISO());
    setErrors({});
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Receive Stock</Text>
        <TouchableOpacity onPress={reset} hitSlop={10}>
          <Ionicons name="refresh-outline" size={22} color={C.textTertiary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Offline banner */}
          {!isOnline && (
            <View style={s.offlineBanner}>
              <Ionicons
                name="cloud-offline-outline"
                size={15}
                color={C.warning}
              />
              <Text style={s.offlineTxt}>Offline — record will sync later</Text>
            </View>
          )}

          {/* Store indicator */}
          {selectedStore ? (
            <View style={s.storeChip}>
              <Ionicons name="storefront-outline" size={13} color={C.primary} />
              <Text style={s.storeChipTxt}>{selectedStore.name}</Text>
            </View>
          ) : (
            <View style={s.storeWarning}>
              <Ionicons name="warning-outline" size={15} color={C.warning} />
              <Text style={s.storeWarningTxt}>
                No store selected. Go to More → Settings
              </Text>
            </View>
          )}

          {/* ── Item section ──────────────────────────────── */}
          <Card style={s.card}>
            <SectionHeader title="Item Details" />

            <View>
              <Input
                label="Item / Product"
                value={itemSearch}
                onChangeText={(t) => {
                  setItemSearch(t);
                  setSelectedItem(null);
                  setShowItemDrop(true);
                  setErrors((e) => ({ ...e, item: "" }));
                }}
                icon="cube-outline"
                placeholder="Search name, SKU or barcode…"
                rightIcon="barcode-outline"
                onRightIconPress={() => setScanner(true)}
                onFocus={() => setShowItemDrop(true)}
                error={errors.item}
              />

              {selectedItem && (
                <View style={s.selectedChip}>
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={C.accent}
                  />
                  <Text style={s.selectedTxt}>
                    {selectedItem.description} · {selectedItem.sku}
                  </Text>
                </View>
              )}

              {showItemDrop && !selectedItem && filteredItems.length > 0 && (
                <View style={s.dropdown}>
                  {filteredItems.slice(0, 6).map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={s.dropItem}
                      onPress={() => {
                        setSelectedItem(item);
                        setItemSearch(item.description);
                        setShowItemDrop(false);
                        setErrors((e) => ({ ...e, item: "" }));
                      }}>
                      <Text style={s.dropName}>{item.description}</Text>
                      <Text style={s.dropSub}>
                        {item.sku} · {item.barcode}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Input
              label="Quantity"
              value={quantity}
              onChangeText={(t) => {
                setQuantity(t);
                setErrors((e) => ({ ...e, qty: "" }));
              }}
              icon="layers-outline"
              placeholder="0"
              keyboardType="numeric"
              error={errors.qty}
            />
          </Card>

          {/* ── Supplier & Reference ──────────────────────── */}
          <Card style={s.card}>
            <SectionHeader title="Supplier & Reference" />

            <View>
              <Input
                label="Supplier"
                value={supplierSearch}
                onChangeText={(t) => {
                  setSupplierSearch(t);
                  setSelectedSupplier(null);
                  setShowSupplierDrop(true);
                  setErrors((e) => ({ ...e, supplier: "" }));
                }}
                icon="business-outline"
                placeholder="Search supplier…"
                onFocus={() => setShowSupplierDrop(true)}
                error={errors.supplier}
              />

              {selectedSupplier && (
                <View style={s.selectedChip}>
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={C.accent}
                  />
                  <Text style={s.selectedTxt}>{selectedSupplier.name}</Text>
                </View>
              )}

              {showSupplierDrop &&
                !selectedSupplier &&
                filteredSuppliers.length > 0 && (
                  <View style={s.dropdown}>
                    {filteredSuppliers.slice(0, 5).map((sup) => (
                      <TouchableOpacity
                        key={sup.id}
                        style={s.dropItem}
                        onPress={() => {
                          setSelectedSupplier(sup);
                          setSupplierSearch(sup.name);
                          setShowSupplierDrop(false);
                          setErrors((e) => ({ ...e, supplier: "" }));
                        }}>
                        <Text style={s.dropName}>{sup.name}</Text>
                        <Text style={s.dropSub}>{sup.code}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
            </View>

            <Input
              label="Reference Number"
              value={refNumber}
              onChangeText={(t) => {
                setRefNumber(t);
                setErrors((e) => ({ ...e, ref: "" }));
              }}
              icon="document-text-outline"
              placeholder="DR-2025-00001"
              autoCapitalize="characters"
              error={errors.ref}
            />

            <Input
              label="Date"
              value={date}
              onChangeText={(t) => {
                setDate(t);
                setErrors((e) => ({ ...e, date: "" }));
              }}
              icon="calendar-outline"
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              error={errors.date}
            />
          </Card>

          {errors.store ? (
            <Text style={s.globalError}>{errors.store}</Text>
          ) : null}

          <Button
            title={isOnline ? "Submit Received Stock" : "Save Offline"}
            onPress={handleSubmit}
            loading={submitting}
            icon={
              isOnline ? "checkmark-circle-outline" : "cloud-offline-outline"
            }
            variant={isOnline ? "primary" : "secondary"}
            style={{ marginTop: S.sm }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <BarcodeScannerModal
        visible={scanner}
        onClose={() => setScanner(false)}
        onScanned={onBarcode}
        title="Scan Item Barcode"
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
  content: { padding: S.lg, paddingBottom: 80, gap: S.md },
  card: {},

  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.warning + "18",
    borderRadius: R.md,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.warning + "40",
  },
  offlineTxt: { fontSize: F.sm, color: C.warning },

  storeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.primary + "18",
    paddingHorizontal: S.md,
    paddingVertical: 5,
    borderRadius: R.full,
    alignSelf: "flex-start",
  },
  storeChipTxt: { fontSize: F.sm, color: C.primary, fontWeight: W.medium },

  storeWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.warning + "15",
    borderRadius: R.md,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.warning + "40",
  },
  storeWarningTxt: { fontSize: F.sm, color: C.warning },

  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.accent + "15",
    borderRadius: R.sm,
    padding: S.sm,
    marginTop: -S.sm,
    marginBottom: S.sm,
  },
  selectedTxt: {
    fontSize: F.sm,
    color: C.accent,
    fontWeight: W.medium,
    flex: 1,
  },

  dropdown: {
    backgroundColor: C.bgElevated,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginTop: -S.sm,
    marginBottom: S.sm,
  },
  dropItem: {
    paddingHorizontal: S.md,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropName: { fontSize: F.sm, color: C.textPrimary, fontWeight: W.medium },
  dropSub: { fontSize: F.xs, color: C.textTertiary, marginTop: 2 },

  globalError: { fontSize: F.sm, color: C.error, textAlign: "center" },
});
