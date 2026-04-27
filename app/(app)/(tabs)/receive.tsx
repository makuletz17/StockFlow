import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { Card, Input, SectionHeader } from "@/src/components/UI";
import { useNetwork } from "@/src/hooks/useNetwork";
import { Dropdown } from "@/src/tabs/received/Dropdown";
import { FieldInput } from "@/src/tabs/received/FieldInput";
import {
  buildInvoiceForm,
  computeTotals,
  mapApiItems,
} from "@/src/tabs/received/helpers";
import { ItemRow } from "@/src/tabs/received/ItemRow";
import { AddItemModal, DraftsModal } from "@/src/tabs/received/Modal";
import { TotalsCard } from "@/src/tabs/received/TotalsCard";
import {
  DraftRecord,
  DropdownOption,
  InvoiceForm,
  ReceivedItem,
} from "@/src/types";
import { generateId } from "@/src/utils/helpers";
import { persistDrafts } from "@/src/utils/storage";
import { C, F, R, S, W } from "@/src/utils/theme";

export default function ReceiveStockScreen() {
  const { isOnline } = useNetwork();

  // PO state
  const [poNumber, setPoNumber] = useState("");
  const [poData, setPoData] = useState<any | null>(null);
  const [invoiceTypes, setInvoiceTypes] = useState<DropdownOption[]>([]);
  const [tradeDiscounting, setTradeDiscounting] = useState<DropdownOption[]>(
    [],
  );
  const [loadingPO, setLoadingPO] = useState(false);
  const [errors, setErrors] = useState("");

  // Form state
  const [items, setItems] = useState<ReceivedItem[]>([]);
  const [invoiceForm, setInvoiceForm] = useState<InvoiceForm>({
    invoiceType: null,
    tradeDiscount: null,
    applyTradeDiscount: false,
    invNo: "",
    invDate: "",
    supplierInvoiceNo: "",
    invRemark: "",
    itemExpiry: "",
    freight: "0",
    vatAmount: "0",
    discountAmount: "0",
  });

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  const [scanner, setScanner] = useState(false);

  // get po
  const fetchPO = async () => {
    if (!poNumber.trim()) {
      setErrors("PO Number is required");
      return;
    }
    if (!isOnline) {
      Alert.alert("Offline", "Connect to the internet first.");
      return;
    }
    setLoadingPO(true);
    setErrors("");
    try {
      const res = await api.getPOByNumber(poNumber);
      const record = res.record;
      if (record) {
        setPoData(record);
        setInvoiceTypes(res.invoiceTypes || []);
        setTradeDiscounting(res.tradeDiscounting || []);
        setItems(mapApiItems(record?.supplierInvoice?.warehouseItems || []));
        setInvoiceForm(buildInvoiceForm(record));
        setActiveDraftId(null);
      } else {
        setErrors("PO # not found!");
      }
    } catch (err: any) {
      setErrors(err?.message || "Failed to fetch PO");
      setPoData(null);
      setItems([]);
    } finally {
      setLoadingPO(false);
    }
  };

  // ── Barcode scan

  const handleScan = () => setScanner(true);
  // ── Item ops

  const updateItem = (i: number, updated: ReceivedItem) =>
    setItems((prev) => prev.map((item, idx) => (idx === i ? updated : item)));

  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const addItem = (item: ReceivedItem) => setItems((prev) => [...prev, item]);

  const setInv = (key: keyof InvoiceForm, val: any) =>
    setInvoiceForm((prev) => ({ ...prev, [key]: val }));

  const toggleTradeDiscount = () => {
    if (!invoiceForm.tradeDiscount) return;

    setInvoiceForm((prev) => ({
      ...prev,
      applyTradeDiscount: !prev.applyTradeDiscount,
    }));
  };

  // --- handle excesss item
  const handleExcessItem = (baseItem: ReceivedItem, excessQty: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.recid === baseItem.recid
          ? { ...item, nonPoQty: (item.nonPoQty ?? 0) + excessQty }
          : item,
      ),
    );
  };

  // ── Save draft ────────────────────────────────────────────────────────────

  const saveDraft = () => {
    if (!poData) {
      Alert.alert("No PO loaded", "Fetch a PO first.");
      return;
    }
    const draftId = activeDraftId || generateId();
    const { total } = computeTotals(items, invoiceForm);
    const draft: DraftRecord = {
      id: draftId,
      totalAmount: total,
      poNumber,
      poData,
      invoiceForm,
      items,
      savedAt: new Date().toLocaleString(),
      submitted: false,
      invoiceTypes,
      tradeDiscounting,
    };
    setDrafts((prev) => {
      let updated;
      const idx = prev.findIndex((d) => d.id === draftId);
      if (idx !== -1) {
        updated = [...prev];
        updated[idx] = draft;
      } else {
        updated = [draft, ...prev];
      }
      persistDrafts(updated);
      return updated;
    });
    setActiveDraftId(draftId);
    Alert.alert("Draft Saved", `PO #${poNumber} saved locally.`);
  };

  const loadDraft = (draft: DraftRecord) => {
    setPoNumber(draft.poNumber);
    setPoData(draft.poData);
    setItems(draft.items);
    setInvoiceForm(draft.invoiceForm);
    setInvoiceTypes(draft.invoiceTypes);
    setTradeDiscounting(draft.tradeDiscounting);
    setActiveDraftId(draft.id);
    setErrors("");
  };

  const deleteDraft = (id: string) => {
    setDrafts((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      persistDrafts(updated);
      return updated;
    });

    if (activeDraftId === id) setActiveDraftId(null);
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!poData) {
      Alert.alert("No PO loaded");
      return;
    }
    if (!isOnline) {
      Alert.alert("Offline", "Connect to the internet to submit.");
      return;
    }
    if (!invoiceForm.invoiceType) {
      Alert.alert("Validation", "Please select an Invoice Type.");
      return;
    }

    const pending = items.filter((i) => i.status === "pending");
    if (pending.length > 0) {
      Alert.alert(
        "Untagged Items",
        `${pending.length} item(s) still Pending. Submit anyway?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Submit Anyway", onPress: doSubmit },
        ],
      );
      return;
    }
    doSubmit();
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        poNumber,
        poRefNo: poData.poRefNo,
        receiptRefNo: poData.receiptRefNo,
        supplierCode: poData.supplierCode,
        supplierName: poData.supplierName,
        invoiceType: invoiceForm.invoiceType,
        tradeDiscount: invoiceForm.tradeDiscount,
        invNo: invoiceForm.invNo,
        invDate: invoiceForm.invDate,
        supplierInvoiceNo: invoiceForm.supplierInvoiceNo,
        invRemark: invoiceForm.invRemark,
        itemExpiry: invoiceForm.itemExpiry,
        freight: parseFloat(invoiceForm.freight) || 0,
        vatAmount: parseFloat(invoiceForm.vatAmount) || 0,
        discountAmount: parseFloat(invoiceForm.discountAmount) || 0,
        items: items.map((item) => ({
          recid: item.recid,
          itemDesc: item.itemDesc,
          itemCode: item.itemCode,
          receivedQty: item.receivedQty,
          nonPoQty: item.nonPoQty ?? 0,
          status: item.status,
          remark: item.remark,
          isManuallyAdded: item.isManuallyAdded || false,
        })),
      };

      await api.createReceivedStock(payload as any);

      if (activeDraftId) {
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === activeDraftId ? { ...d, submitted: true } : d,
          ),
        );
      }

      Alert.alert("Success ✓", "Stock received and submitted to server.", [
        { text: "OK", onPress: reset },
      ]);
    } catch (err: any) {
      Alert.alert("Submit Failed", err?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const reset = () => {
    setPoNumber("");
    setPoData(null);
    setItems([]);
    setErrors("");
    setActiveDraftId(null);
    setInvoiceForm({
      invoiceType: null,
      tradeDiscount: null,
      invNo: "",
      invDate: "",
      supplierInvoiceNo: "",
      invRemark: "",
      itemExpiry: "",
      freight: "0",
      vatAmount: "0",
      discountAmount: "0",
    });
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = {
    delivered: items.filter((i) => i.status === "delivered").length,
    partial: items.filter((i) => i.status === "partial").length,
    pending: items.filter((i) => i.status === "pending").length,
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Receive Stock</Text>
        <View style={s.headerActions}>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => setShowDrafts(true)}
            hitSlop={10}>
            <Ionicons name="archive-outline" size={20} color={C.textTertiary} />
            {drafts.length > 0 && (
              <View style={s.badgeWrap}>
                <Text style={s.badgeTxt}>{drafts.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={reset} hitSlop={10}>
            <Ionicons name="refresh-outline" size={20} color={C.textTertiary} />
          </TouchableOpacity>
        </View>
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
              <Text style={s.offlineTxt}>
                Offline — changes saved locally only.
              </Text>
            </View>
          )}

          {/* ── PO Lookup ── */}
          {!poData && (
            <Card style={s.card}>
              <SectionHeader title="Enter PO Number" />
              <Input
                label="PO Number"
                value={poNumber}
                onChangeText={setPoNumber}
                placeholder="Enter PO number..."
                icon="document-text-outline"
                rightIcon="search-outline"
                onRightIconPress={fetchPO}
                keyboardType="number-pad"
                editable={poData ? false : true}
              />
              {errors ? <Text style={s.error}>{errors}</Text> : null}

              <TouchableOpacity
                style={s.fetchBtn}
                onPress={fetchPO}
                disabled={loadingPO}>
                {loadingPO ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="search-outline" size={16} color="#fff" />
                    <Text style={s.fetchBtnTxt}>Fetch PO</Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>
          )}

          {/* ── PO Details ── */}
          {poData && (
            <Card style={s.card}>
              <SectionHeader title={poData.supplierName} />
              <View style={s.detailGrid}>
                {(
                  [
                    ["PO Date", poData.poDate],
                    ["PO Reference", poData.poRefNo],
                    ["Receipt Ref", poData.receiptRefNo],
                  ] as [string, string][]
                ).map(([label, val]) => (
                  <View key={label} style={s.detailCell}>
                    <Text style={s.detailLabel}>{label}</Text>
                    <Text style={s.detailValue}>{val}</Text>
                  </View>
                ))}
                {poData.poRemark ? (
                  <View style={s.detailFull}>
                    <Text style={s.detailLabel}>PO Remark</Text>
                    <Text style={s.detailValue}>{poData.poRemark}</Text>
                  </View>
                ) : null}
              </View>
            </Card>
          )}

          {/* ── Invoice / Delivery Form ── */}
          {poData && (
            <Card style={s.card}>
              <SectionHeader title="Invoice Details" />
              <View style={s.formGrid}>
                <Dropdown
                  label="Invoice Type *"
                  value={invoiceForm.invoiceType}
                  options={invoiceTypes}
                  onSelect={(v) => setInv("invoiceType", v)}
                  placeholder="Select invoice type..."
                />
                <Dropdown
                  label="Trade Discount"
                  value={invoiceForm.tradeDiscount}
                  options={tradeDiscounting}
                  onSelect={(v) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      tradeDiscount: v,
                      applyTradeDiscount: !!v,
                    }))
                  }
                  placeholder="Select trade discount..."
                />
                <View style={s.formRow}>
                  <View style={{ flex: 1 }}>
                    <FieldInput
                      label="Inv Date"
                      value={invoiceForm.invDate}
                      onChange={(v) => setInv("invDate", v)}
                      placeholder="MM/DD/YYYY"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldInput
                      label="Inv No"
                      value={invoiceForm.invNo}
                      onChange={(v) => setInv("invNo", v)}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <View style={s.formRow}>
                  <View style={{ flex: 1 }}>
                    <FieldInput
                      label="Item Expiry"
                      value={invoiceForm.itemExpiry}
                      onChange={(v) => setInv("itemExpiry", v)}
                      placeholder="MM/DD/YYYY"
                    />
                  </View>
                </View>
                <View style={s.formRow}>
                  <View style={{ flex: 1 }}>
                    <FieldInput
                      label="Freight"
                      value={invoiceForm.freight}
                      onChange={(v) => setInv("freight", v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldInput
                      label="VAT Amount"
                      value={invoiceForm.vatAmount}
                      onChange={(v) => setInv("vatAmount", v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldInput
                      label="Discount Amt"
                      value={invoiceForm.discountAmount}
                      onChange={(v) => setInv("discountAmount", v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <FieldInput
                  label="Invoice Remark"
                  value={invoiceForm.invRemark}
                  onChange={(v) => setInv("invRemark", v)}
                  placeholder="Optional remark..."
                  multiline
                />
              </View>
            </Card>
          )}

          {/* ── Items ── */}
          {poData && (
            <Card style={s.card}>
              <View style={s.itemsHeader}>
                <Text style={s.sectionHeader}>{`Items (${items.length})`}</Text>
                <View style={s.itemsActions}>
                  <TouchableOpacity style={s.iconBtn} onPress={handleScan}>
                    <Ionicons
                      name="barcode-outline"
                      size={15}
                      color={C.primary}
                    />
                    <Text style={s.iconBtnTxt}>Scan</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.iconBtn}
                    onPress={() => setShowAddItem(true)}>
                    <Ionicons name="add" size={15} color={C.primary} />
                    <Text style={s.iconBtnTxt}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Stats strip */}
              {items.length > 0 && (
                <View style={s.statsRow}>
                  {[
                    {
                      label: "Delivered",
                      count: stats.delivered,
                      color: "#10B981",
                    },
                    {
                      label: "Partial",
                      count: stats.partial,
                      color: "#3B82F6",
                    },
                    {
                      label: "Pending",
                      count: stats.pending,
                      color: "#F59E0B",
                    },
                  ].map((st) => (
                    <View
                      key={st.label}
                      style={[
                        s.statChip,
                        { backgroundColor: st.color + "18" },
                      ]}>
                      <Text style={[s.statNum, { color: st.color }]}>
                        {st.count}
                      </Text>
                      <Text style={s.statLbl}>{st.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Item list */}
              {items.length === 0 ? (
                <View style={s.emptyItems}>
                  <Ionicons
                    name="cube-outline"
                    size={32}
                    color={C.textTertiary}
                  />
                  <Text style={s.emptyTxt}>
                    No items. Scan barcode or add manually.
                  </Text>
                </View>
              ) : (
                items.map((item, idx) => (
                  <ItemRow
                    key={String(item.recid)}
                    item={item}
                    onUpdate={(u) => updateItem(idx, u)}
                    onRemove={() => removeItem(idx)}
                    onAddExcessItem={handleExcessItem}
                  />
                ))
              )}
            </Card>
          )}

          {/* ── Totals ── */}
          {poData && items.length > 0 && (
            <TotalsCard
              items={items}
              invoiceForm={invoiceForm}
              onToggleDiscount={toggleTradeDiscount}
            />
          )}

          {/* ── Actions ── */}
          {poData && (
            <>
              <View style={s.actionRow}>
                <TouchableOpacity style={s.saveDraftBtn} onPress={saveDraft}>
                  <Ionicons name="save-outline" size={16} color={C.primary} />
                  <Text style={s.saveDraftTxt}>
                    {activeDraftId ? "Update Draft" : "Save Draft"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.submitBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name="cloud-upload-outline"
                        size={16}
                        color="#fff"
                      />
                      <Text style={s.submitTxt}>Submit</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={s.resetBtn} onPress={reset}>
                <Text style={s.resetTxt}>Reset / New PO</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <AddItemModal
        visible={showAddItem}
        onClose={() => setShowAddItem(false)}
        onAdd={addItem}
      />
      <DraftsModal
        visible={showDrafts}
        drafts={drafts}
        onClose={() => setShowDrafts(false)}
        onLoad={loadDraft}
        onDelete={deleteDraft}
      />

      <BarcodeScannerModal
        visible={scanner}
        onClose={() => setScanner(false)}
        onScanned={(code) => {
          setScanner(false);
          const matchIdx = items.findIndex(
            (i) => i.barcode === code || i.itemCode === code,
          );
          if (matchIdx !== -1) {
            setItems((prev) =>
              prev.map((item, idx) => {
                if (idx !== matchIdx) return item;
                const newQty = item.receivedQty + 1;
                if (newQty <= item.poQty) {
                  return {
                    ...item,
                    receivedQty: newQty,
                    status: newQty === item.poQty ? "delivered" : "partial",
                  };
                } else {
                  return {
                    ...item,
                    receivedQty: item.poQty,
                    status: "delivered",
                    nonPoQty: (item.nonPoQty ?? 0) + 1,
                  };
                }
              }),
            );
            Alert.alert("✓ Scanned", `Matched: ${items[matchIdx].itemDesc}`);
          } else {
            Alert.alert(
              "Item not found!",
              `"${code}" not found in PO items.\nAdd as a new item?`,
              [
                { text: "Cancel", style: "cancel" },
                { text: "Add Item", onPress: () => setShowAddItem(true) },
              ],
            );
          }
        }}
        title="Scan Barcode"
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  headerActions: { flexDirection: "row", alignItems: "center", gap: S.md },
  headerBtn: { position: "relative" },
  badgeWrap: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: C.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTxt: { color: "#fff", fontSize: 9, fontWeight: "800" },
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
  error: { color: C.error, fontSize: F.sm, marginTop: S.sm },
  fetchBtn: {
    marginTop: S.md,
    backgroundColor: C.primary,
    paddingVertical: S.sm,
    borderRadius: R.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: S.sm,
  },
  fetchBtnTxt: { color: "#fff", fontWeight: W.bold },
  // PO details
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  detailCell: { minWidth: "30%", flex: 1 },
  detailFull: { width: "100%" },
  detailLabel: {
    fontSize: F.xs,
    fontWeight: W.bold,
    color: C.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: { fontSize: F.sm, color: C.textPrimary },
  // Invoice form
  formGrid: { gap: S.md },
  formRow: { flexDirection: "row", gap: S.md },
  // Items
  itemsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.sm,
  },
  itemsActions: { flexDirection: "row", gap: S.sm },
  sectionHeader: {
    height: 30,
    color: C.textPrimary,
    justifyContent: "center",
  },
  iconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.primary + "55",
    backgroundColor: C.primary + "11",
  },
  iconBtnTxt: { fontSize: F.xs, color: C.primary, fontWeight: W.bold },
  statsRow: {
    flexDirection: "row",
    gap: S.sm,
    marginBottom: S.md,
    flexWrap: "wrap",
  },
  statChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: S.sm,
    borderRadius: R.sm,
    minWidth: 60,
  },
  statNum: { fontSize: F.lg, fontWeight: W.bold },
  statLbl: { fontSize: 10, color: C.textTertiary, marginTop: 1 },
  emptyItems: { alignItems: "center", paddingVertical: S.xl, gap: S.sm },
  emptyTxt: { color: C.textTertiary, fontSize: F.sm },
  // Actions
  actionRow: { flexDirection: "row", gap: S.md },
  saveDraftBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
    paddingVertical: S.md,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  saveDraftTxt: { color: C.primary, fontWeight: W.bold, fontSize: F.sm },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
    paddingVertical: S.md,
    borderRadius: R.md,
    backgroundColor: C.primary,
  },
  submitTxt: { color: "#fff", fontWeight: W.bold, fontSize: F.sm },
  resetBtn: {
    alignItems: "center",
    paddingVertical: S.md,
    backgroundColor: C.error,
    borderRadius: R.md,
  },
  resetTxt: { color: C.textPrimary, fontSize: F.sm },
});
