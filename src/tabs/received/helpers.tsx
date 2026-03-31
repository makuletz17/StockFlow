import { DeliveryStatus, InvoiceForm, ReceivedItem } from "@/src/types";

export const mapApiItems = (warehouseItems: any[]): ReceivedItem[] =>
  (warehouseItems || []).map((item: any) => {
    const inv =
      !Array.isArray(item.invoiceRecord) && item.invoiceRecord
        ? item.invoiceRecord
        : null;

    const prevQty = inv ? Number(inv.receiptQty) || 0 : 0;
    const noPoQty = inv ? Number(inv.noPoQty) || 0 : 0;
    const poQty = Number(item.poQty) || 0;

    const receivedQty = Math.min(prevQty, poQty);
    const nonPoQty = noPoQty > 0 ? noPoQty : Math.max(0, prevQty - poQty);

    let status: DeliveryStatus = "pending";
    if (receivedQty >= poQty && receivedQty > 0) status = "delivered";
    else if (receivedQty > 0) status = "partial";

    return {
      recid: item.recid,
      itemDesc: item.itemDesc,
      itemCode: item.itemCode,
      barcode: item.barcode,
      poQty,
      qtyDelivered: Number(item.qtyDelivered) || 0,
      receivedQty,
      nonPoQty,
      cost: item.cost,
      factor: item.factor,
      uom: item.uom,
      status,
      remark: "",
    };
  });

export const computeTotals = (
  items: ReceivedItem[],
  invoiceForm: InvoiceForm,
) => {
  const subtotal = items.reduce((sum, item) => {
    const poAmt = item.receivedQty * Number(item.cost || 0);
    const nonPoAmt = (item.nonPoQty ?? 0) * Number(item.cost || 0);
    return sum + poAmt + nonPoAmt;
  }, 0);
  const freight = parseFloat(invoiceForm.freight) || 0;
  const vatAmount = parseFloat(invoiceForm.vatAmount) || 0;

  let discountedTotal = subtotal;
  let tradeDiscountAmt = 0;
  let tradeDiscountRates: number[] = [];

  if (invoiceForm.applyTradeDiscount && invoiceForm.tradeDiscount?.text) {
    // Extract numbers from "LESS 10 10"
    tradeDiscountRates =
      invoiceForm.tradeDiscount.text.match(/\d+/g)?.map(Number) || [];

    // Apply sequential discounts
    tradeDiscountRates.forEach((rate) => {
      const discount = discountedTotal * (rate / 100);
      tradeDiscountAmt += discount;
      discountedTotal -= discount;
    });
  }

  const total = discountedTotal - freight + vatAmount;

  return { subtotal, tradeDiscountAmt, tradeDiscountRates, total };
};

export const buildInvoiceForm = (record: any): InvoiceForm => {
  const inv = record?.supplierInvoice || {};
  const tradeDiscount = record?.tradeDiscount || null;

  return {
    invoiceType: inv.invoiceType || null,
    tradeDiscount,
    applyTradeDiscount: !!tradeDiscount,
    invNo: String(inv.invNo || ""),
    invDate: inv.invDate || "",
    supplierInvoiceNo: String(inv.supplierInvoiceNo || ""),
    invRemark: inv.invRemark || "",
    itemExpiry: inv.itemExpiry || "",
    freight: String(inv.freight ?? "0"),
    vatAmount: String(inv.vatAmount ?? "0"),
    discountAmount: String(inv.discountAmount ?? "0"),
  };
};
