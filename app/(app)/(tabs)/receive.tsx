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
import { Card, Input, SectionHeader } from "@/src/components/UI";
import { useNetwork } from "@/src/hooks/useNetwork";
import { useAppStore } from "@/src/store/appStore";
import { C, F, R, S, W } from "@/src/utils/theme";

export default function ReceiveStockScreen() {
  const { isOnline } = useNetwork();
  const { addOfflineRecord } = useAppStore();

  const [poNumber, setPoNumber] = useState("");
  const [poData, setPoData] = useState<any | null>(null);
  const [loadingPO, setLoadingPO] = useState(false);
  const [errors, setErrors] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPO = async () => {
    if (!poNumber.trim()) {
      setErrors("PO Number is required");
      return;
    }

    if (!isOnline) {
      Alert.alert(
        "Offline",
        "You are offline. Please connect to the internet or Wi-Fi.",
      );
      return;
    }

    setLoadingPO(true);
    setErrors("");
    try {
      const data = await api.getPOByNumber(poNumber);
      setPoData(data.record);
    } catch (err: any) {
      setErrors(err?.message || "Failed to fetch PO");
      setPoData(null);
    } finally {
      setLoadingPO(false);
    }
  };

  const reset = () => {
    setPoNumber("");
    setPoData(null);
    setErrors("");
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
              <Text style={s.offlineTxt}>
                You are offline. Please connect to the internet or Wi-Fi.
              </Text>
            </View>
          )}

          {/* PO Number Input */}
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
            />
            {errors ? <Text style={s.error}>{errors}</Text> : null}
            <TouchableOpacity style={s.fetchBtn} onPress={fetchPO}>
              {loadingPO ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.fetchBtnTxt}>Fetch PO</Text>
              )}
            </TouchableOpacity>
          </Card>

          {/* PO Details */}
          {poData && (
            <Card style={s.card}>
              <SectionHeader title="PO Details" />
              <Text style={s.label}>PO Reference:</Text>
              <Text style={s.value}>{poData.poRefNo}</Text>

              <Text style={s.label}>PO Number:</Text>
              <Text style={s.value}>{poData.poNo}</Text>

              <Text style={s.label}>Supplier:</Text>
              <Text style={s.value}>
                {poData.supplierName} ({poData.supplierCode})
              </Text>

              <Text style={s.label}>PO Remark:</Text>
              <Text style={s.value}>{poData.poRemark}</Text>

              <Text style={s.label}>PO Date:</Text>
              <Text style={s.value}>{poData.poDate}</Text>

              <Text style={s.label}>Trade Discount:</Text>
              <Text style={s.value}>{poData.tradeDiscount?.text}</Text>

              {/* Items */}
              <Text style={s.label}>Items:</Text>
              {poData.supplierInvoice?.warehouseItems.map((item: any) => (
                <View key={item.recid} style={s.itemRow}>
                  <Text style={s.itemDesc}>{item.itemDesc}</Text>
                  <Text style={s.itemQty}>
                    PO Qty: {item.poQty} · Delivered: {item.qtyDelivered}
                  </Text>
                  <Text style={s.itemCost}>Cost: {item.cost}</Text>
                </View>
              ))}
            </Card>
          )}

          <TouchableOpacity style={s.resetBtn} onPress={reset}>
            <Text style={s.resetTxt}>Reset</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  label: { fontWeight: W.bold, fontSize: F.sm, marginTop: S.sm },
  value: { fontSize: F.sm, color: C.textPrimary, marginBottom: S.sm },
  itemRow: {
    marginBottom: S.sm,
    paddingVertical: S.sm,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  itemDesc: { fontSize: F.sm, fontWeight: W.medium },
  itemQty: { fontSize: F.xs, color: C.textTertiary },
  itemCost: { fontSize: F.xs, color: C.textTertiary },
  fetchBtn: {
    marginTop: S.md,
    backgroundColor: C.primary,
    paddingVertical: S.sm,
    borderRadius: R.md,
    alignItems: "center",
  },
  fetchBtnTxt: { color: "#fff", fontWeight: W.bold },
  resetBtn: {
    marginTop: S.md,
    backgroundColor: C.error,
    paddingVertical: S.sm,
    borderRadius: R.md,
    alignItems: "center",
  },
  resetTxt: { color: "#fff", fontWeight: W.bold },
  error: { color: C.error, fontSize: F.sm, marginTop: S.sm },
});
