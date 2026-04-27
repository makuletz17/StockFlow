import api from "@/src/api/apiService";
import { Badge, Button, Card, Input, SectionHeader } from "@/src/components/UI";
import {
  InventoryItem,
  Supplier,
  Withdrawal,
  WithdrawPayload,
} from "@/src/types";
import { generateId, getErrorMessage } from "@/src/utils/helpers";
import { C, F, R, S, W } from "@/src/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddItemModal from "./AddItemModal";

interface WithdrawFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmitted: (record: Withdrawal) => void;
}

interface WithdrawLineItem {
  key: string;
  inventory_item: InventoryItem;
  qty: number;
  unit_price: number;
  discount_percent: number;
}

export default function WithdrawFormModal({
  visible,
  onClose,
  onSubmitted,
}: WithdrawFormModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [supplierDropdown, setSupplierDropdown] = useState(false);
  const [reason, setReason] = useState("");
  const [withdrawnBy, setWithdrawnBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineItems, setLineItems] = useState<WithdrawLineItem[]>([]);
  const [addItemModal, setAddItemModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    if (visible) {
      loadSuppliers();
      setSelectedSupplier(null);
      setReason("");
      setWithdrawnBy("");
      setApprovedBy("");
      setLineItems([]);
      setErrors({});
    }
  }, [visible]);

  const loadSuppliers = async () => {
    setSuppliersLoading(true);
    try {
      const res = await api.getSuppliers();
      setSuppliers(res ?? []);
    } catch {
      setSuppliers([]);
    } finally {
      setSuppliersLoading(false);
    }
  };

  const clearError = (k: string) => setErrors((e) => ({ ...e, [k]: "" }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!selectedSupplier) e.supplier = "Select a supplier";
    if (!reason.trim()) e.reason = "Required";
    if (!withdrawnBy.trim()) e.withdrawnBy = "Required";
    if (!approvedBy.trim()) e.approvedBy = "Required";
    if (lineItems.length === 0) e.items = "Add at least one item";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAddItem = (item: InventoryItem, qty: number) => {
    const discount = selectedSupplier?.discount_percent ?? 0;
    setLineItems((prev) => {
      const existing = prev.find((l) => l.inventory_item.id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.inventory_item.id === item.id ? { ...l, qty: l.qty + qty } : l,
        );
      }
      return [
        ...prev,
        {
          key: generateId(),
          inventory_item: item,
          qty,
          unit_price: item.cost_price ?? 0,
          discount_percent: discount,
        },
      ];
    });
    clearError("items");
  };

  const handleRemoveLine = (key: string) =>
    setLineItems((prev) => prev.filter((l) => l.key !== key));

  const handleQtyChange = (key: string, val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0)
      setLineItems((prev) =>
        prev.map((l) => (l.key === key ? { ...l, qty: n } : l)),
      );
  };

  const grandTotal = lineItems.reduce(
    (sum, l) => sum + l.unit_price * (1 - l.discount_percent / 100) * l.qty,
    0,
  );
  const totalDiscount = lineItems.reduce(
    (sum, l) => sum + l.unit_price * (l.discount_percent / 100) * l.qty,
    0,
  );

  const handleSubmit = async () => {
    if (!validate()) return;
    const payload: WithdrawPayload = {
      supplier_id: selectedSupplier!.id,
      reason,
      withdrawn_by: withdrawnBy,
      approved_by: approvedBy,
      items: lineItems.map((l) => ({
        inventory_item_id: l.inventory_item.id!,
        qty: l.qty,
        unit_price: l.unit_price,
        discount_percent: l.discount_percent,
      })),
    };
    setSubmitting(true);
    try {
      const saved = await api.createWithdrawal(payload);
      onSubmitted(saved);
      onClose();
    } catch (err) {
      Alert.alert("Error", getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={wf.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={C.textPrimary} />
          </TouchableOpacity>
          <Text style={wf.title}>New Withdrawal</Text>
          <View style={{ width: 32 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <FlatList
            data={lineItems}
            keyExtractor={(item) => item.key}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={wf.content}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: S.sm }} />}
            ListHeaderComponent={
              <View>
                <Card style={{ marginBottom: S.md }}>
                  <TouchableOpacity
                    onPress={() => setShowInfo((v) => !v)}
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: S.sm,
                    }}>
                    <SectionHeader
                      title="Withdrawal Info"
                      action={
                        <TouchableOpacity
                          onPress={() => setShowInfo((v) => !v)}>
                          <Ionicons
                            name={showInfo ? "chevron-up" : "chevron-down"}
                            size={18}
                            color={C.textSecondary}
                          />
                        </TouchableOpacity>
                      }
                    />
                  </TouchableOpacity>

                  {/* Supplier Picker */}
                  {showInfo && (
                    <>
                      <View style={{ marginBottom: S.md }}>
                        <Text style={wf.fieldLabel}>
                          {"Supplier"}
                          {errors.supplier ? (
                            <Text style={{ color: C.error }}>{"  *"}</Text>
                          ) : null}
                        </Text>
                        <TouchableOpacity
                          style={[
                            wf.dropdownBtn,
                            errors.supplier ? { borderColor: C.error } : {},
                          ]}
                          onPress={() => setSupplierDropdown((v) => !v)}>
                          {suppliersLoading ? (
                            <ActivityIndicator size="small" color={C.primary} />
                          ) : (
                            <>
                              <Ionicons
                                name="business-outline"
                                size={17}
                                color={
                                  selectedSupplier
                                    ? C.textPrimary
                                    : C.textDisabled
                                }
                              />
                              <Text
                                style={[
                                  wf.dropdownTxt,
                                  !selectedSupplier && {
                                    color: C.textDisabled,
                                  },
                                ]}
                                numberOfLines={1}>
                                {selectedSupplier
                                  ? selectedSupplier.name
                                  : "Select supplier…"}
                              </Text>
                              {selectedSupplier?.discount_percent ? (
                                <Badge
                                  label={`${selectedSupplier.discount_percent}% OFF`}
                                  color={C.accent}
                                  bg={C.accent + "18"}
                                />
                              ) : null}
                              <Ionicons
                                name={
                                  supplierDropdown
                                    ? "chevron-up"
                                    : "chevron-down"
                                }
                                size={16}
                                color={C.textTertiary}
                              />
                            </>
                          )}
                        </TouchableOpacity>
                        {supplierDropdown && (
                          <View style={wf.dropdownList}>
                            {(suppliers ?? []).length === 0 ? (
                              <Text style={wf.dropdownEmpty}>
                                No suppliers found
                              </Text>
                            ) : (
                              (suppliers ?? []).map((sup) => (
                                <TouchableOpacity
                                  key={sup.id}
                                  style={[
                                    wf.dropdownItem,
                                    selectedSupplier?.id === sup.id &&
                                      wf.dropdownItemActive,
                                  ]}
                                  onPress={() => {
                                    setSelectedSupplier(sup);
                                    setSupplierDropdown(false);
                                    clearError("supplier");
                                    setLineItems((prev) =>
                                      prev.map((l) => ({
                                        ...l,
                                        discount_percent:
                                          sup.discount_percent ?? 0,
                                      })),
                                    );
                                  }}>
                                  <View style={{ flex: 1 }}>
                                    <Text
                                      style={[
                                        wf.dropdownItemTxt,
                                        selectedSupplier?.id === sup.id && {
                                          color: C.white,
                                        },
                                      ]}>
                                      {sup.name}
                                    </Text>
                                  </View>
                                  {sup.discount_percent ? (
                                    <Text
                                      style={[
                                        wf.dropdownDiscount,
                                        selectedSupplier?.id === sup.id && {
                                          color: C.white + "cc",
                                        },
                                      ]}>
                                      {sup.discount_percent}% OFF
                                    </Text>
                                  ) : null}
                                </TouchableOpacity>
                              ))
                            )}
                          </View>
                        )}
                        {errors.supplier ? (
                          <Text style={wf.fieldError}>{errors.supplier}</Text>
                        ) : null}
                      </View>

                      <Input
                        label="Reason"
                        value={reason}
                        onChangeText={(t) => {
                          setReason(t);
                          clearError("reason");
                        }}
                        icon="document-text-outline"
                        placeholder="e.g. Damaged, Expired, Returned to supplier"
                        error={errors.reason}
                        multiline
                      />

                      <Input
                        label="Withdrawn By"
                        value={withdrawnBy}
                        onChangeText={(t) => {
                          setWithdrawnBy(t);
                          clearError("withdrawnBy");
                        }}
                        icon="person-outline"
                        placeholder="Name"
                        error={errors.withdrawnBy}
                        containerStyle={{ flex: 1, marginRight: S.sm }}
                        autoCapitalize="words"
                      />
                      <Input
                        label="Approved By"
                        value={approvedBy}
                        onChangeText={(t) => {
                          setApprovedBy(t);
                          clearError("approvedBy");
                        }}
                        icon="checkmark-circle-outline"
                        placeholder="Name"
                        error={errors.approvedBy}
                        containerStyle={{ flex: 1 }}
                        autoCapitalize="words"
                      />
                    </>
                  )}
                </Card>

                {/* Items section header */}
                <View style={wf.itemsHeader}>
                  <Text style={wf.itemsTitle}>Items</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: S.sm,
                    }}>
                    {errors.items ? (
                      <Text style={wf.fieldError}>{errors.items}</Text>
                    ) : (
                      <Text style={wf.itemsCount}>
                        {lineItems.length} item
                        {lineItems.length !== 1 ? "s" : ""}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={wf.addItemBtn}
                      onPress={() => setAddItemModal(true)}>
                      <Ionicons name="add" size={18} color={C.white} />
                      <Text style={wf.addItemTxt}>Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            }
            renderItem={({ item: line }) => {
              const gross = line.unit_price * line.qty;
              const discAmt = gross * (line.discount_percent / 100);
              const net = gross - discAmt;
              return (
                <Card style={wf.lineCard}>
                  <View style={wf.lineTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={wf.lineDesc} numberOfLines={2}>
                        {line.inventory_item.description}
                      </Text>
                      <Text style={wf.lineMeta}>
                        {line.inventory_item.sku} ·{" "}
                        {line.inventory_item.barcode}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={wf.lineRemove}
                      onPress={() => handleRemoveLine(line.key)}>
                      <Ionicons name="close-circle" size={20} color={C.error} />
                    </TouchableOpacity>
                  </View>
                  <View style={wf.lineBottom}>
                    <View style={wf.qtyRow}>
                      <TouchableOpacity
                        style={wf.qtyBtn}
                        onPress={() =>
                          handleQtyChange(
                            line.key,
                            String(Math.max(1, line.qty - 1)),
                          )
                        }>
                        <Ionicons
                          name="remove"
                          size={16}
                          color={C.textPrimary}
                        />
                      </TouchableOpacity>
                      <Text style={wf.qtyVal}>{line.qty}</Text>
                      <TouchableOpacity
                        style={wf.qtyBtn}
                        onPress={() =>
                          handleQtyChange(line.key, String(line.qty + 1))
                        }>
                        <Ionicons name="add" size={16} color={C.textPrimary} />
                      </TouchableOpacity>
                      <Text style={wf.qtyUnit}>PCS</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      {line.discount_percent > 0 && (
                        <Text style={wf.lineGross}>₱{gross.toFixed(2)}</Text>
                      )}
                      <Text style={wf.lineNet}>₱{net.toFixed(2)}</Text>
                      {line.discount_percent > 0 && (
                        <Text style={wf.lineDisc}>
                          -{line.discount_percent}% (-₱{discAmt.toFixed(2)})
                        </Text>
                      )}
                    </View>
                  </View>
                </Card>
              );
            }}
            ListEmptyComponent={
              <View style={wf.emptyItems}>
                <Ionicons
                  name="cube-outline"
                  size={32}
                  color={C.textDisabled}
                />
                <Text style={wf.emptyItemsTxt}>No items added yet</Text>
              </View>
            }
            ListFooterComponent={
              <View>
                {lineItems.length > 0 && (
                  <Card style={wf.summaryCard}>
                    <SectionHeader title="Summary" />
                    <View style={wf.summaryRow}>
                      <Text style={wf.summaryLabel}>Total Items</Text>
                      <Text style={wf.summaryVal}>
                        {lineItems.reduce((sum, l) => sum + l.qty, 0)} PCS
                      </Text>
                    </View>
                    {totalDiscount > 0 ? (
                      <>
                        <View style={wf.summaryRow}>
                          <Text style={wf.summaryLabel}>Gross Amount</Text>
                          <Text style={wf.summaryVal}>
                            ₱{(grandTotal + totalDiscount).toFixed(2)}
                          </Text>
                        </View>
                        <View style={wf.summaryRow}>
                          <Text style={[wf.summaryLabel, { color: C.warning }]}>
                            Total Discount
                          </Text>
                          <Text style={[wf.summaryVal, { color: C.warning }]}>
                            -₱{totalDiscount.toFixed(2)}
                          </Text>
                        </View>
                        <View
                          style={[
                            wf.summaryRow,
                            {
                              borderTopWidth: 1,
                              borderTopColor: C.border,
                              paddingTop: S.sm,
                              marginTop: S.xs,
                            },
                          ]}>
                          <Text
                            style={[
                              wf.summaryLabel,
                              { color: C.accent, fontWeight: W.bold },
                            ]}>
                            Net Total
                          </Text>
                          <Text
                            style={[
                              wf.summaryVal,
                              {
                                color: C.accent,
                                fontWeight: W.bold,
                                fontSize: F.lg,
                              },
                            ]}>
                            ₱{grandTotal.toFixed(2)}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={wf.summaryRow}>
                        <Text
                          style={[
                            wf.summaryLabel,
                            { color: C.accent, fontWeight: W.bold },
                          ]}>
                          Total Amount
                        </Text>
                        <Text
                          style={[
                            wf.summaryVal,
                            {
                              color: C.accent,
                              fontWeight: W.bold,
                              fontSize: F.lg,
                            },
                          ]}>
                          ₱{grandTotal.toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </Card>
                )}
                {lineItems.length > 0 && (
                  <Button
                    title={submitting ? "Submitting…" : "Submit Withdrawal"}
                    onPress={handleSubmit}
                    loading={submitting}
                    icon="checkmark-circle-outline"
                    style={{
                      marginTop: S.md,
                      marginBottom: S.lg,
                      opacity: lineItems.length === 0 ? 0.5 : 1,
                    }}
                  />
                )}
              </View>
            }
          />
        </KeyboardAvoidingView>

        <AddItemModal
          visible={addItemModal}
          onClose={() => setAddItemModal(false)}
          onAdd={handleAddItem}
          supplierDiscount={selectedSupplier?.discount_percent ?? 0}
        />
      </SafeAreaView>
    </Modal>
  );
}

const wf = StyleSheet.create({
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
  content: { padding: S.lg, paddingBottom: 40 },
  fieldLabel: {
    fontSize: F.sm,
    color: C.textSecondary,
    fontWeight: W.medium,
    marginBottom: S.sm,
  },
  fieldError: { fontSize: F.xs, color: C.error, marginTop: S.xs },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: C.bgInput,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: S.md,
    height: 50,
  },
  dropdownTxt: { flex: 1, fontSize: F.md, color: C.textPrimary },
  dropdownList: {
    marginTop: S.xs,
    backgroundColor: C.bgElevated,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  dropdownEmpty: {
    padding: S.md,
    color: C.textTertiary,
    fontSize: F.sm,
    textAlign: "center",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S.lg,
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  dropdownItemActive: { backgroundColor: C.primary },
  dropdownItemTxt: { fontSize: F.md, color: C.textPrimary },
  dropdownDiscount: { fontSize: F.xs, color: C.accent, fontWeight: W.semibold },
  itemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.sm,
  },
  itemsTitle: { fontSize: F.lg, fontWeight: W.bold, color: C.textPrimary },
  itemsCount: { fontSize: F.sm, color: C.textTertiary },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.primary,
    borderRadius: R.full,
    paddingHorizontal: S.md,
    paddingVertical: S.xs + 2,
  },
  addItemTxt: { fontSize: F.sm, color: C.white, fontWeight: W.semibold },
  emptyItems: { alignItems: "center", paddingVertical: S.xl, gap: S.sm },
  emptyItemsTxt: { fontSize: F.sm, color: C.textDisabled },
  lineCard: { padding: S.md },
  lineTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: S.md,
  },
  lineDesc: { fontSize: F.md, fontWeight: W.semibold, color: C.textPrimary },
  lineMeta: { fontSize: F.xs, color: C.textTertiary, marginTop: 2 },
  lineRemove: { marginLeft: S.sm },
  lineBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: S.sm },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: R.sm,
    backgroundColor: C.bgElevated,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyVal: {
    fontSize: F.md,
    fontWeight: W.bold,
    color: C.textPrimary,
    minWidth: 28,
    textAlign: "center",
  },
  qtyUnit: { fontSize: F.xs, color: C.textTertiary, fontWeight: W.medium },
  lineGross: {
    fontSize: F.xs,
    color: C.textTertiary,
    textDecorationLine: "line-through",
  },
  lineNet: { fontSize: F.md, fontWeight: W.bold, color: C.textPrimary },
  lineDisc: { fontSize: F.xs, color: C.warning },
  summaryCard: { marginTop: S.md, padding: S.md },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: S.sm,
  },
  summaryLabel: { fontSize: F.sm, color: C.textSecondary },
  summaryVal: { fontSize: F.sm, fontWeight: W.semibold, color: C.textPrimary },
});
