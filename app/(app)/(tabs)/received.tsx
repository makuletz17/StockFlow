import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import api from "@/src/api/apiService";
import { Card, Input, SectionHeader } from "@/src/components/UI";
import { useNetwork } from "@/src/hooks/useNetwork";
import { C, F, R, S, W } from "@/src/utils/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryStatus = "pending" | "delivered" | "partial" | "missing";

interface ReceivedItem {
  recid: string | number;
  itemDesc: string;
  itemCode?: string;
  barcode?: string;
  factor?: string;
  uom?: string;
  poQty: number;
  qtyDelivered: number;
  receivedQty: number;
  cost: number | string;
  status: DeliveryStatus;
  remark?: string;
  isManuallyAdded?: boolean;
}

interface DropdownOption {
  id: number;
  text: string;
}

interface InvoiceForm {
  invoiceType: DropdownOption | null;
  tradeDiscount: DropdownOption | null;
  invNo: string;
  invDate: string;
  supplierInvoiceNo: string;
  invRemark: string;
  itemExpiry: string;
  freight: string;
  vatAmount: string;
  discountAmount: string;
}

interface DraftRecord {
  id: string;
  poNumber: string;
  poData: any;
  invoiceForm: InvoiceForm;
  items: ReceivedItem[];
  savedAt: string;
  submitted: boolean;
  invoiceTypes: DropdownOption[];
  tradeDiscounting: DropdownOption[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; color: string; icon: string }
> = {
  pending: { label: "Pending", color: "#F59E0B", icon: "time-outline" },
  delivered: {
    label: "Delivered",
    color: "#10B981",
    icon: "checkmark-circle-outline",
  },
  partial: { label: "Partial", color: "#3B82F6", icon: "git-branch-outline" },
  missing: { label: "Missing", color: "#EF4444", icon: "close-circle-outline" },
};

const generateId = () =>
  `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const mapApiItems = (warehouseItems: any[]): ReceivedItem[] =>
  (warehouseItems || []).map((item: any) => ({
    recid: item.recid,
    itemDesc: item.itemDesc,
    itemCode: item.itemCode,
    barcode: item.barcode,
    poQty: Number(item.poQty) || 0,
    qtyDelivered: Number(item.qtyDelivered) || 0,
    receivedQty: 0,
    cost: item.cost,
    factor: item.factor,
    uom: item.uom,
    status: "pending" as DeliveryStatus,
    remark: "",
  }));

function buildInvoiceForm(record: any): InvoiceForm {
  const inv = record?.supplierInvoice || {};
  return {
    invoiceType: inv.invoiceType || null,
    tradeDiscount: record?.tradeDiscount || null,
    invNo: String(inv.invNo || ""),
    invDate: inv.invDate || "",
    supplierInvoiceNo: String(inv.supplierInvoiceNo || ""),
    invRemark: inv.invRemark || "",
    itemExpiry: inv.itemExpiry || "",
    freight: String(inv.freight ?? "0"),
    vatAmount: String(inv.vatAmount ?? "0"),
    discountAmount: String(inv.discountAmount ?? "0"),
  };
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DeliveryStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View
      style={[
        bdg.wrap,
        { backgroundColor: cfg.color + "22", borderColor: cfg.color + "55" },
      ]}>
      <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
      <Text style={[bdg.txt, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}
const bdg = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  txt: { fontSize: 10, fontWeight: "700" },
});

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function Dropdown({
  label,
  value,
  options,
  onSelect,
  placeholder = "Select...",
}: {
  label: string;
  value: DropdownOption | null;
  options: DropdownOption[];
  onSelect: (opt: DropdownOption) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={dd.wrap}>
      <Text style={dd.label}>{label}</Text>
      <TouchableOpacity
        style={dd.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}>
        <Text
          style={[dd.triggerTxt, !value && { color: C.textTertiary }]}
          numberOfLines={1}>
          {value ? value.text : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color={C.textTertiary} />
      </TouchableOpacity>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <TouchableOpacity
          style={dd.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}>
          <View style={dd.sheet}>
            <Text style={dd.sheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[dd.option, value?.id === item.id && dd.optionActive]}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}>
                  <Text
                    style={[
                      dd.optionTxt,
                      value?.id === item.id && {
                        color: C.primary,
                        fontWeight: W.bold,
                      },
                    ]}>
                    {item.text}
                  </Text>
                  {value?.id === item.id && (
                    <Ionicons name="checkmark" size={14} color={C.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
const dd = StyleSheet.create({
  wrap: { gap: 4 },
  label: {
    fontSize: F.xs,
    fontWeight: W.bold,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    padding: S.sm,
    backgroundColor: C.bgElevated,
  },
  triggerTxt: { fontSize: F.sm, color: C.textPrimary, flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: S.lg,
  },
  sheet: {
    backgroundColor: C.bg,
    borderRadius: R.lg,
    padding: S.md,
    maxHeight: 400,
  },
  sheetTitle: {
    fontSize: F.md,
    fontWeight: W.bold,
    color: C.textPrimary,
    marginBottom: S.sm,
    paddingHorizontal: S.sm,
  },
  option: {
    paddingVertical: S.md,
    paddingHorizontal: S.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: R.sm,
  },
  optionActive: { backgroundColor: C.primary + "11" },
  optionTxt: { fontSize: F.sm, color: C.textPrimary, flex: 1 },
});

// ─── FieldInput ───────────────────────────────────────────────────────────────

function FieldInput({
  label,
  value,
  onChange,
  placeholder = "",
  keyboardType = "default",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
}) {
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        style={[
          fi.input,
          multiline && { minHeight: 60, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textTertiary}
        keyboardType={keyboardType}
        multiline={multiline}
      />
    </View>
  );
}
const fi = StyleSheet.create({
  wrap: { gap: 4 },
  label: {
    fontSize: F.xs,
    fontWeight: W.bold,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    padding: S.sm,
    fontSize: F.sm,
    color: C.textPrimary,
    backgroundColor: C.bgElevated,
  },
});

// ─── ItemRow ──────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onUpdate,
  onRemove,
}: {
  item: ReceivedItem;
  onUpdate: (u: ReceivedItem) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const setQty = (val: string) => {
    const qty = Math.max(0, parseInt(val) || 0);
    let status: DeliveryStatus = "pending";
    if (qty >= item.poQty && qty > 0) status = "delivered";
    else if (qty > 0) status = "partial";
    onUpdate({ ...item, receivedQty: qty, status });
  };

  const setStatus = (status: DeliveryStatus) =>
    onUpdate({
      ...item,
      status,
      receivedQty:
        status === "delivered"
          ? item.poQty
          : status === "missing"
            ? 0
            : item.receivedQty,
    });

  return (
    <View style={ir.wrap}>
      <TouchableOpacity
        style={ir.topRow}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}>
        <View style={ir.leftCol}>
          <Text style={ir.desc} numberOfLines={expanded ? undefined : 2}>
            {item.itemDesc}
          </Text>
          {item.barcode ? <Text style={ir.code}>{item.barcode}</Text> : null}
        </View>
        <View style={ir.rightCol}>
          <StatusBadge status={item.status} />
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={C.textTertiary}
          />
        </View>
      </TouchableOpacity>

      <View style={ir.summaryBar}>
        <Text style={ir.sTxt}>
          PO: <Text style={ir.sVal}>{item.poQty}</Text>
        </Text>
        <Text style={ir.sTxt}>
          Expected: <Text style={ir.sVal}>{item.poQty}</Text>
        </Text>
        <Text style={ir.sTxt}>
          Received:{" "}
          <Text style={[ir.sVal, { color: C.primary }]}>
            {item.receivedQty}
          </Text>
        </Text>
        <Text style={ir.sTxt}>
          Factor:{" "}
          <Text style={ir.sVal}>
            {item.uom}/{item.factor}
          </Text>
        </Text>
        <Text style={ir.sTxt}>
          Cost: <Text style={ir.sVal}>{Number(item.cost).toFixed(2)}</Text>
        </Text>
      </View>

      {expanded && (
        <View style={ir.controls}>
          {/* Qty stepper */}
          <View style={ir.qtyRow}>
            <Text style={ir.ctrlLabel}>Received Qty</Text>
            <View style={ir.qtyWrap}>
              <TouchableOpacity
                style={ir.qtyBtn}
                onPress={() =>
                  setQty(String(Math.max(0, item.receivedQty - 1)))
                }>
                <Ionicons name="remove" size={16} color={C.textPrimary} />
              </TouchableOpacity>
              <TextInput
                style={ir.qtyInput}
                value={String(item.receivedQty)}
                onChangeText={setQty}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TouchableOpacity
                style={ir.qtyBtn}
                onPress={() => setQty(String(item.receivedQty + 1))}>
                <Ionicons name="add" size={16} color={C.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Status buttons */}
          <Text style={ir.ctrlLabel}>Mark As</Text>
          <View style={ir.statusRow}>
            {(Object.keys(STATUS_CONFIG) as DeliveryStatus[]).map((s) => {
              const cfg = STATUS_CONFIG[s];
              const active = item.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    ir.statusBtn,
                    { borderColor: cfg.color + "66" },
                    active && { backgroundColor: cfg.color + "22" },
                  ]}
                  onPress={() => setStatus(s)}>
                  <Ionicons
                    name={cfg.icon as any}
                    size={12}
                    color={cfg.color}
                  />
                  <Text style={[ir.statusBtnTxt, { color: cfg.color }]}>
                    {cfg.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Remark */}
          <TextInput
            style={ir.remark}
            placeholder="Remark (optional)..."
            placeholderTextColor={C.textTertiary}
            value={item.remark}
            onChangeText={(t) => onUpdate({ ...item, remark: t })}
            multiline
          />

          {item.isManuallyAdded && (
            <TouchableOpacity style={ir.removeBtn} onPress={onRemove}>
              <Ionicons name="trash-outline" size={13} color={C.error} />
              <Text style={ir.removeTxt}>Remove Item</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
const ir = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    marginBottom: S.sm,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: S.md,
    backgroundColor: C.bgElevated,
  },
  leftCol: { flex: 1, marginRight: S.sm },
  rightCol: { flexDirection: "row", alignItems: "center", gap: S.sm },
  desc: { fontSize: F.sm, fontWeight: W.medium, color: C.textPrimary },
  code: { fontSize: F.xs, color: C.textTertiary, marginTop: 2 },
  summaryBar: {
    flexDirection: "row",
    gap: S.md,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexWrap: "wrap",
  },
  sTxt: { fontSize: F.xs, color: C.textTertiary },
  sVal: { fontWeight: W.bold, color: C.textPrimary },
  controls: {
    padding: S.md,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: S.sm,
  },
  ctrlLabel: {
    fontSize: F.xs,
    fontWeight: W.bold,
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    overflow: "hidden",
  },
  qtyBtn: {
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    backgroundColor: C.bgElevated,
  },
  qtyInput: {
    width: 52,
    textAlign: "center",
    fontSize: F.md,
    fontWeight: W.bold,
    color: C.textPrimary,
    paddingVertical: S.sm,
  },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: S.sm },
  statusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: R.sm,
    borderWidth: 1,
  },
  statusBtnTxt: { fontSize: F.xs, fontWeight: W.medium },
  remark: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    padding: S.sm,
    fontSize: F.sm,
    color: C.textPrimary,
    minHeight: 48,
    textAlignVertical: "top",
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  removeTxt: { fontSize: F.xs, color: C.error, fontWeight: W.medium },
});

// ─── Add Item Modal ───────────────────────────────────────────────────────────

function AddItemModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: ReceivedItem) => void;
}) {
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");

  const reset = () => {
    setDesc("");
    setCode("");
    setBarcode("");
    setQty("1");
    setCost("");
  };

  const handleAdd = () => {
    if (!desc.trim()) {
      Alert.alert("Validation", "Description is required.");
      return;
    }
    onAdd({
      recid: generateId(),
      itemDesc: desc.trim(),
      itemCode: code.trim() || undefined,
      barcode: barcode.trim() || undefined,
      poQty: parseInt(qty) || 1,
      qtyDelivered: 0,
      receivedQty: parseInt(qty) || 1,
      cost: cost.trim() || "0",
      status: "delivered",
      remark: "",
      isManuallyAdded: true,
    });
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={am.overlay}>
        <View style={am.sheet}>
          <View style={am.header}>
            <Text style={am.title}>Add Item Manually</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={C.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={am.fields}>
              <FieldInput
                label="Description *"
                value={desc}
                onChange={setDesc}
                placeholder="Item description..."
              />
              <View style={am.row}>
                <View style={{ flex: 1 }}>
                  <FieldInput
                    label="Item Code"
                    value={code}
                    onChange={setCode}
                    placeholder="SKU / Code"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FieldInput
                    label="Barcode"
                    value={barcode}
                    onChange={setBarcode}
                    placeholder="Barcode"
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <View style={am.row}>
                <View style={{ flex: 1 }}>
                  <FieldInput
                    label="Qty"
                    value={qty}
                    onChange={setQty}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FieldInput
                    label="Cost"
                    value={cost}
                    onChange={setCost}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                  />
                </View>
              </View>
            </View>
          </ScrollView>
          <TouchableOpacity style={am.addBtn} onPress={handleAdd}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={am.addBtnTxt}>Add Item</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
const am = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: S.lg,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.lg,
  },
  title: { fontSize: F.lg, fontWeight: W.bold, color: C.textPrimary },
  fields: { gap: S.md, paddingBottom: S.lg },
  row: { flexDirection: "row", gap: S.md },
  addBtn: {
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
    paddingVertical: S.md,
    borderRadius: R.md,
    marginTop: S.sm,
  },
  addBtnTxt: { color: "#fff", fontWeight: W.bold, fontSize: F.md },
});

// ─── Drafts Modal ─────────────────────────────────────────────────────────────

function DraftsModal({
  visible,
  drafts,
  onClose,
  onLoad,
  onDelete,
}: {
  visible: boolean;
  drafts: DraftRecord[];
  onClose: () => void;
  onLoad: (d: DraftRecord) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={dm.overlay}>
        <View style={dm.sheet}>
          <View style={dm.header}>
            <Text style={dm.title}>Saved Drafts</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={C.textPrimary} />
            </TouchableOpacity>
          </View>
          {drafts.length === 0 ? (
            <View style={dm.empty}>
              <Ionicons
                name="archive-outline"
                size={40}
                color={C.textTertiary}
              />
              <Text style={dm.emptyTxt}>No saved drafts</Text>
            </View>
          ) : (
            <FlatList
              data={drafts}
              keyExtractor={(d) => d.id}
              renderItem={({ item }) => (
                <View style={dm.row}>
                  <TouchableOpacity
                    style={dm.info}
                    onPress={() => {
                      onLoad(item);
                      onClose();
                    }}>
                    <View style={dm.rowTop}>
                      <Text style={dm.po}>PO #{item.poNumber}</Text>
                      {item.submitted && (
                        <View style={dm.submittedBadge}>
                          <Text style={dm.submittedTxt}>Submitted</Text>
                        </View>
                      )}
                    </View>
                    <Text style={dm.meta}>
                      {item.items.length} items · {item.savedAt}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    hitSlop={10}
                    onPress={() =>
                      Alert.alert("Delete Draft", "Are you sure?", [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: () => onDelete(item.id),
                        },
                      ])
                    }>
                    <Ionicons name="trash-outline" size={18} color={C.error} />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
const dm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: S.lg,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.lg,
  },
  title: { fontSize: F.lg, fontWeight: W.bold, color: C.textPrimary },
  empty: { alignItems: "center", paddingVertical: 40, gap: S.sm },
  emptyTxt: { color: C.textTertiary, fontSize: F.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: S.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  info: { flex: 1 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: S.sm },
  po: { fontSize: F.md, fontWeight: W.bold, color: C.textPrimary },
  submittedBadge: {
    backgroundColor: "#10B98122",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "#10B98155",
  },
  submittedTxt: { fontSize: 10, color: "#10B981", fontWeight: "700" },
  meta: { fontSize: F.xs, color: C.textTertiary, marginTop: 2 },
});

async function scanBarcode(): Promise<string | null> {
  return null;
}

// ─── Main Screen ──────────────────────────────

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

  // ── Fetch PO ──────────────────────────────────────────────────────────────

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
      // res shape: { status, record, invoiceTypes, tradeDiscounting }
      const record = res.record;
      setPoData(record);
      setInvoiceTypes(res.invoiceTypes || []);
      setTradeDiscounting(res.tradeDiscounting || []);
      setItems(mapApiItems(record?.supplierInvoice?.warehouseItems || []));
      setInvoiceForm(buildInvoiceForm(record));
      setActiveDraftId(null);
    } catch (err: any) {
      setErrors(err?.message || "Failed to fetch PO");
      setPoData(null);
      setItems([]);
    } finally {
      setLoadingPO(false);
    }
  };

  // ── Barcode scan ──────────────────────────────────────────────────────────

  const handleScan = async () => {
    const code = await scanBarcode();
    if (!code) return;
    const matchIdx = items.findIndex(
      (i) => i.barcode === code || i.itemCode === code,
    );
    if (matchIdx !== -1) {
      setItems((prev) =>
        prev.map((item, idx) => {
          if (idx !== matchIdx) return item;
          const newQty = item.receivedQty + 1;
          return {
            ...item,
            receivedQty: newQty,
            status: newQty >= item.poQty ? "delivered" : "partial",
          };
        }),
      );
      Alert.alert("✓ Scanned", `Matched: ${items[matchIdx].itemDesc}`);
    } else {
      Alert.alert(
        "Unknown Barcode",
        `"${code}" not found in PO items.\nAdd as a new item?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Add Item", onPress: () => setShowAddItem(true) },
        ],
      );
    }
  };

  // ── Item ops ──────────────────────────────────────────────────────────────

  const updateItem = (i: number, updated: ReceivedItem) =>
    setItems((prev) => prev.map((item, idx) => (idx === i ? updated : item)));

  const removeItem = (i: number) =>
    setItems((prev) => prev.filter((_, idx) => idx !== i));

  const addItem = (item: ReceivedItem) => setItems((prev) => [...prev, item]);

  const setInv = (key: keyof InvoiceForm, val: any) =>
    setInvoiceForm((prev) => ({ ...prev, [key]: val }));

  // ── Save draft ────────────────────────────────────────────────────────────

  const saveDraft = () => {
    if (!poData) {
      Alert.alert("No PO loaded", "Fetch a PO first.");
      return;
    }
    const draftId = activeDraftId || generateId();
    const draft: DraftRecord = {
      id: draftId,
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
      const idx = prev.findIndex((d) => d.id === draftId);
      if (idx !== -1) {
        const u = [...prev];
        u[idx] = draft;
        return u;
      }
      return [draft, ...prev];
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
    setDrafts((prev) => prev.filter((d) => d.id !== id));
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
    missing: items.filter((i) => i.status === "missing").length,
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
              <SectionHeader title="PO Details" />
              <View style={s.detailGrid}>
                {(
                  [
                    ["PO Reference", poData.poRefNo],
                    ["PO Number", String(poData.poNo)],
                    ["Receipt Ref", poData.receiptRefNo],
                    ["PO Date", poData.poDate],
                    ["Supplier Code", String(poData.supplierCode)],
                    ["Supplier", poData.supplierName],
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
                  onSelect={(v) => setInv("tradeDiscount", v)}
                  placeholder="Select trade discount..."
                />
                <View style={s.formRow}>
                  <View style={{ flex: 1 }}>
                    <FieldInput
                      label="Inv No"
                      value={invoiceForm.invNo}
                      onChange={(v) => setInv("invNo", v)}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FieldInput
                      label="Supplier Inv No"
                      value={invoiceForm.supplierInvoiceNo}
                      onChange={(v) => setInv("supplierInvoiceNo", v)}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
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
                      label: "Missing",
                      count: stats.missing,
                      color: "#EF4444",
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
                  />
                ))
              )}
            </Card>
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
                      <Text style={s.submitTxt}>Submit to Server</Text>
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
  detailCell: { minWidth: "45%", flex: 1 },
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
