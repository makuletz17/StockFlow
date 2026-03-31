import { Card } from "@/src/components/UI";
import { InvoiceForm, ReceivedItem } from "@/src/types";
import { C, F, R, S, W } from "@/src/utils/theme";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { computeTotals } from "./helpers";

export const TotalsCard = ({
  items,
  invoiceForm,
  onToggleDiscount,
}: {
  items: ReceivedItem[];
  invoiceForm: InvoiceForm;
  onToggleDiscount: () => void;
}) => {
  const { subtotal, tradeDiscountAmt, tradeDiscountRates, total } =
    computeTotals(items, invoiceForm);

  const hasTradeDiscount =
    invoiceForm.tradeDiscount && Number(invoiceForm.tradeDiscount.id) > 0;

  return (
    <Card style={tc.wrap}>
      <View style={tc.header}>
        <Text style={tc.title}>Receipt Summary</Text>
        {hasTradeDiscount && (
          <TouchableOpacity
            style={[
              tc.discountToggle,
              invoiceForm.applyTradeDiscount && tc.discountToggleActive,
            ]}
            onPress={onToggleDiscount}
            activeOpacity={0.7}>
            <View
              style={[
                tc.checkbox,
                invoiceForm.applyTradeDiscount && tc.checkboxActive,
              ]}>
              {invoiceForm.applyTradeDiscount && (
                <Ionicons name="checkmark" size={11} color="#fff" />
              )}
            </View>
            <Text
              style={[
                tc.discountToggleTxt,
                invoiceForm.applyTradeDiscount && { color: C.primary },
              ]}>
              Apply Trade Discount ({invoiceForm.tradeDiscount?.text})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={tc.rows}>
        <View style={tc.row}>
          <Text style={tc.rowLabel}>Subtotal</Text>
          <Text style={tc.rowVal}>{subtotal.toFixed(2)}</Text>
        </View>
        {invoiceForm.applyTradeDiscount && tradeDiscountAmt > 0 && (
          <View style={tc.row}>
            <Text style={[tc.rowLabel, { color: C.error }]}>
              Trade Discount
            </Text>
            <Text style={[tc.rowVal, { color: C.error }]}>
              {tradeDiscountAmt.toFixed(2)}
            </Text>
          </View>
        )}
        {parseFloat(invoiceForm.freight) > 0 && (
          <View style={tc.row}>
            <Text style={tc.rowLabel}>Freight</Text>
            <Text style={tc.rowVal}>
              +{parseFloat(invoiceForm.freight).toFixed(2)}
            </Text>
          </View>
        )}
        {parseFloat(invoiceForm.vatAmount) > 0 && (
          <View style={tc.row}>
            <Text style={tc.rowLabel}>VAT</Text>
            <Text style={tc.rowVal}>
              +{parseFloat(invoiceForm.vatAmount).toFixed(2)}
            </Text>
          </View>
        )}
        <View style={tc.divider} />
        <View style={tc.row}>
          <Text style={tc.totalLabel}>Total Amount</Text>
          <Text style={tc.totalVal}>{total.toFixed(2)}</Text>
        </View>
      </View>
    </Card>
  );
};

const tc = StyleSheet.create({
  wrap: { marginBottom: 0 },
  header: { marginBottom: S.md },
  title: {
    fontSize: F.md,
    fontWeight: W.bold,
    color: C.textPrimary,
    marginBottom: S.sm,
  },
  discountToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgElevated,
  },
  discountToggleActive: {
    borderColor: C.primary + "66",
    backgroundColor: C.primary + "11",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  discountToggleTxt: {
    fontSize: F.sm,
    color: C.textSecondary,
    fontWeight: W.medium,
  },
  rows: { gap: S.sm },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: { fontSize: F.sm, color: C.textSecondary },
  rowVal: {
    fontSize: F.sm,
    color: C.textPrimary,
    fontWeight: W.medium,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: S.xs ?? 4,
  },
  totalLabel: {
    fontSize: F.md,
    fontWeight: W.bold,
    color: C.textPrimary,
  },
  totalVal: {
    fontSize: F.lg,
    fontWeight: W.bold,
    color: C.primary,
  },
});
