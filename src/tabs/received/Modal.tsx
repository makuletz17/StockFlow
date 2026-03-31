import { DraftRecord, ReceivedItem } from "@/src/types";
import { generateId } from "@/src/utils/helpers";
import { C, F, R, S, W } from "@/src/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FieldInput } from "./FieldInput";

export const AddItemModal = ({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (item: ReceivedItem) => void;
}) => {
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
};
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

export const DraftsModal = ({
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
}) => {
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
                      {item.totalAmount !== undefined
                        ? ` · ₱${item.totalAmount.toFixed(2)}`
                        : ""}
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
};
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
