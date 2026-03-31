import { STATUS_CONFIG } from "@/src/components/Constants";
import { DeliveryStatus, ReceivedItem } from "@/src/types";
import { C, F, R, S, W } from "@/src/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBadge } from "./StatusBadge";

export const ItemRow = ({
  item,
  onUpdate,
  onRemove,
  onAddExcessItem,
}: {
  item: ReceivedItem;
  onUpdate: (u: ReceivedItem) => void;
  onRemove: () => void;
  onAddExcessItem?: (baseItem: ReceivedItem, excessQty: number) => void;
}) => {
  const [expanded, setExpanded] = useState(false);

  const setQty = (val: string) => {
    const qty = Math.max(0, parseInt(val) || 0);
    if (qty <= item.poQty) {
      let status: DeliveryStatus = "pending";
      if (qty === item.poQty && qty > 0) status = "delivered";
      else if (qty > 0) status = "partial";
      onUpdate({ ...item, receivedQty: qty, status });
    } else {
      const excess = qty - item.poQty;
      onUpdate({ ...item, receivedQty: item.poQty, status: "delivered" });
      onAddExcessItem?.(item, excess);
    }
  };

  const setNonPoQty = (val: string) => {
    const qty = Math.max(0, parseInt(val) || 0);
    onUpdate({ ...item, nonPoQty: qty });
  };

  const setStatus = (status: DeliveryStatus) =>
    onUpdate({
      ...item,
      status,
      receivedQty: status === "delivered" ? item.poQty : item.receivedQty,
    });

  return (
    <View style={ir.wrap}>
      {/* ── Main row ── */}
      <View style={ir.mainRow}>
        {/* Left: item info */}
        <View style={ir.leftCol}>
          <Text style={ir.desc} numberOfLines={2}>
            {item.itemDesc}
          </Text>
          <View style={ir.meta}>
            <Text style={ir.metaTxt}>PO: {item.poQty}</Text>
            <Text style={ir.metaDot}>·</Text>
            <Text style={ir.metaTxt}>
              {item.uom}/{item.factor}
            </Text>
            <Text style={ir.metaDot}>·</Text>
            <Text style={ir.metaTxt}>₱{Number(item.cost).toFixed(2)}</Text>
          </View>
          {item.barcode ? <Text style={ir.barcode}>{item.barcode}</Text> : null}
        </View>

        {/* Right: status + stepper */}
        <View style={ir.rightCol}>
          <StatusBadge status={item.status} />
          <View style={ir.stepper}>
            <TouchableOpacity
              style={ir.stepBtn}
              onPress={() => setQty(String(Math.max(0, item.receivedQty - 1)))}>
              <Ionicons name="remove" size={15} color={C.textPrimary} />
            </TouchableOpacity>
            <TextInput
              style={ir.stepInput}
              value={String(item.receivedQty)}
              onChangeText={setQty}
              keyboardType="number-pad"
              selectTextOnFocus
            />
            <TouchableOpacity
              style={ir.stepBtn}
              onPress={() => setQty(String(item.receivedQty + 1))}>
              <Ionicons name="add" size={15} color={C.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Non-PO row (always visible) ── */}
      <View style={ir.nonPoRow}>
        <Text style={ir.nonPoLabel}>Non-PO</Text>
        <View style={ir.nonPoStepper}>
          <TouchableOpacity
            style={ir.nonPoBtn}
            onPress={() =>
              setNonPoQty(String(Math.max(0, (item.nonPoQty ?? 0) - 1)))
            }>
            <Ionicons name="remove" size={13} color={C.textSecondary} />
          </TouchableOpacity>
          <Text
            style={[
              ir.nonPoVal,
              (item.nonPoQty ?? 0) > 0 && { color: C.warning },
            ]}>
            {item.nonPoQty ?? 0}
          </Text>
          <TouchableOpacity
            style={ir.nonPoBtn}
            onPress={() => setNonPoQty(String((item.nonPoQty ?? 0) + 1))}>
            <Ionicons name="add" size={13} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={ir.nonPoHint}>not included in total</Text>
        <TouchableOpacity
          style={ir.moreBtn}
          onPress={() => setExpanded((e) => !e)}
          hitSlop={10}>
          <Text style={ir.moreTxt}>{expanded ? "less ‹" : "more ›"}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Expanded: status buttons + remark + remove ── */}
      {expanded && (
        <View style={ir.expandedPanel}>
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
};

const ir = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    marginBottom: S.sm,
    overflow: "hidden",
  },
  // Main row
  mainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    padding: S.md,
    backgroundColor: C.bgElevated,
  },
  leftCol: { flex: 1, minWidth: 0 },
  rightCol: {
    alignItems: "flex-end",
    gap: 5,
  },
  desc: {
    fontSize: F.sm,
    fontWeight: W.medium,
    color: C.textPrimary,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  barcode: {
    fontSize: F.xs,
    color: C.textTertiary,
    marginTop: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  metaTxt: { fontSize: F.xs, color: C.textTertiary },
  metaDot: { fontSize: F.xs, color: C.textTertiary },
  // Received qty stepper
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    overflow: "hidden",
    height: 34,
  },
  stepBtn: {
    width: 32,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bgElevated,
  },
  stepInput: {
    width: 42,
    height: 34,
    textAlign: "center",
    fontSize: F.sm,
    color: C.textPrimary,
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
  },
  // Non-PO row
  nonPoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    paddingHorizontal: S.md,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.bg,
  },
  nonPoLabel: {
    fontSize: F.xs,
    color: C.textTertiary,
    width: 44,
  },
  nonPoStepper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.sm,
    overflow: "hidden",
    height: 26,
  },
  nonPoBtn: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bgElevated,
  },
  nonPoVal: {
    width: 30,
    textAlign: "center",
    fontSize: F.xs,
    fontWeight: W.bold,
    color: C.textPrimary,
  },
  nonPoHint: {
    fontSize: 10,
    color: C.textTertiary,
    flex: 1,
  },
  moreBtn: { paddingVertical: 2 },
  moreTxt: { fontSize: F.xs, color: C.textTertiary },
  // Expanded panel
  expandedPanel: {
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
