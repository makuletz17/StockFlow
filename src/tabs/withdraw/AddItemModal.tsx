import api from "@/src/api/apiService";
import BarcodeScannerModal from "@/src/components/BarcodeScannerModal";
import { Badge, Button, Card, Input, SectionHeader } from "@/src/components/UI";
import { InventoryItem } from "@/src/types";
import { getErrorMessage } from "@/src/utils/helpers";
import { C, F, R, S, W } from "@/src/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface AddItemModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: InventoryItem, qty: number) => void;
  supplierDiscount: number;
}

export default function AddItemModal({
  visible,
  onClose,
  onAdd,
  supplierDiscount,
}: AddItemModalProps) {
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState("1");
  const [scanner, setScanner] = useState(false);
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<InventoryItem | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setQuery("");
      setQty("1");
      setFound(null);
      setError("");
    }
  }, [visible]);

  const lookup = async (code: string) => {
    if (!code.trim()) return;
    setSearching(true);
    setError("");
    setFound(null);
    try {
      const item = await api.getItemByBarcode(code.trim());
      setFound(item);
    } catch {
      try {
        const res = await api.getInventory({ search: code.trim(), page: 1 });
        if (res.data.length > 0) {
          setFound(res.data[0]);
        } else {
          setError("Item not found. Check barcode or SKU.");
        }
      } catch (err) {
        setError(getErrorMessage(err));
      }
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = () => {
    if (!found) return;
    const parsedQty = parseInt(qty, 10);
    if (!parsedQty || parsedQty <= 0) {
      Alert.alert("Invalid Qty", "Enter a valid quantity.");
      return;
    }
    if (found.stock !== undefined && parsedQty > found.stock) {
      Alert.alert(
        "Insufficient Stock",
        `Only ${found.stock} ${found.unit} available.`,
      );
      return;
    }
    onAdd(found, parsedQty);
    onClose();
  };

  const discountedPrice =
    found && supplierDiscount > 0
      ? (found.cost_price ?? 0) * (1 - supplierDiscount / 100)
      : (found?.cost_price ?? 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={aim.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={aim.title}>Add Item</Text>
          <View style={{ width: 32 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={aim.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Card>
              <SectionHeader title="Search Item" />
              <View style={aim.barcodeRow}>
                <Input
                  label="Barcode or SKU"
                  value={query}
                  onChangeText={(t) => {
                    setQuery(t);
                    setFound(null);
                    setError("");
                  }}
                  icon="search-outline"
                  placeholder="Scan or type barcode / SKU"
                  autoCapitalize="none"
                  containerStyle={{ flex: 1, marginBottom: 0 }}
                  returnKeyType="search"
                  onSubmitEditing={() => lookup(query)}
                />
                <TouchableOpacity
                  style={aim.scanBtn}
                  onPress={() => setScanner(true)}>
                  <Ionicons name="scan-outline" size={22} color={C.primary} />
                </TouchableOpacity>
              </View>
              <Button
                title="Search"
                onPress={() => lookup(query)}
                loading={searching}
                icon="search-outline"
                style={{ marginTop: S.md }}
              />
            </Card>

            {error ? (
              <View style={aim.errorBox}>
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color={C.error}
                />
                <Text style={aim.errorTxt}>{error}</Text>
              </View>
            ) : null}

            {found && (
              <Card style={{ marginTop: S.md }}>
                <SectionHeader title="Item Found" />
                <View style={aim.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={aim.itemDesc}>{found.description}</Text>
                    <Text style={aim.itemMeta}>
                      {found.sku} · {found.barcode}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: S.sm,
                        marginTop: S.sm,
                      }}>
                      <Badge
                        label={found.category}
                        color={C.primary}
                        bg={C.primary + "18"}
                      />
                      <Badge
                        label={`Stock: ${found.stock ?? "—"} ${found.unit}`}
                        color={
                          (found.stock ?? 0) <= 0
                            ? C.error
                            : found.min_stock &&
                                (found.stock ?? 0) <= found.min_stock
                              ? C.warning
                              : C.accent
                        }
                        bg={
                          (found.stock ?? 0) <= 0
                            ? C.error + "18"
                            : C.accent + "18"
                        }
                      />
                    </View>
                  </View>
                </View>

                <View style={aim.priceBox}>
                  <View style={aim.priceRow}>
                    <Text style={aim.priceLabel}>Unit Cost</Text>
                    <Text style={aim.priceVal}>
                      ₱{(found.cost_price ?? 0).toFixed(2)}
                    </Text>
                  </View>
                  {supplierDiscount > 0 && (
                    <>
                      <View style={aim.priceRow}>
                        <Text style={[aim.priceLabel, { color: C.warning }]}>
                          Supplier Discount ({supplierDiscount}%)
                        </Text>
                        <Text style={[aim.priceVal, { color: C.warning }]}>
                          -₱
                          {(
                            (found.cost_price ?? 0) *
                            (supplierDiscount / 100)
                          ).toFixed(2)}
                        </Text>
                      </View>
                      <View
                        style={[
                          aim.priceRow,
                          {
                            borderTopWidth: 1,
                            borderTopColor: C.border,
                            paddingTop: S.sm,
                          },
                        ]}>
                        <Text
                          style={[
                            aim.priceLabel,
                            { color: C.accent, fontWeight: W.bold },
                          ]}>
                          Net Price
                        </Text>
                        <Text
                          style={[
                            aim.priceVal,
                            { color: C.accent, fontWeight: W.bold },
                          ]}>
                          ₱{discountedPrice.toFixed(2)}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <Input
                  label="Quantity (PCS)"
                  value={qty}
                  onChangeText={setQty}
                  keyboardType="numeric"
                  icon="layers-outline"
                  placeholder="Enter quantity"
                  style={{ marginTop: S.md }}
                />
                <Button
                  title="Add to Withdrawal"
                  onPress={handleAdd}
                  icon="add-circle-outline"
                  style={{ marginTop: S.md }}
                />
              </Card>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        <BarcodeScannerModal
          visible={scanner}
          onClose={() => setScanner(false)}
          onScanned={(code) => {
            setQuery(code);
            lookup(code);
          }}
          title="Scan Item Barcode"
        />
      </SafeAreaView>
    </Modal>
  );
}

const aim = StyleSheet.create({
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
  content: { padding: S.lg, paddingBottom: 60 },
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
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.error + "18",
    borderRadius: R.md,
    padding: S.md,
    marginTop: S.md,
    borderWidth: 1,
    borderColor: C.error + "40",
  },
  errorTxt: { fontSize: F.sm, color: C.error, flex: 1 },
  itemRow: { flexDirection: "row", alignItems: "flex-start" },
  itemDesc: { fontSize: F.md, fontWeight: W.semibold, color: C.textPrimary },
  itemMeta: { fontSize: F.xs, color: C.textTertiary, marginTop: 2 },
  priceBox: {
    backgroundColor: C.bgElevated,
    borderRadius: R.md,
    padding: S.md,
    marginTop: S.md,
    gap: S.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  priceRow: { flexDirection: "row", justifyContent: "space-between" },
  priceLabel: { fontSize: F.sm, color: C.textSecondary },
  priceVal: { fontSize: F.sm, color: C.textPrimary, fontWeight: W.semibold },
});
