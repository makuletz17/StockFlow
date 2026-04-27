// user ----------------------------------
export interface User {
  username: string; // entered at login, saved to storage
  name: string; // defaults to username
  token: string; // the token returned by API
}

//user login
export interface LoginApiResponse {
  status: string;
  token: string;
}
//end user ----------------------------------

//received tabs ---------------------------------------
export type DeliveryStatus = "pending" | "delivered" | "partial";

export interface ReceivedItem {
  recid: string | number;
  itemDesc: string;
  itemCode?: string;
  barcode?: string;
  factor?: string;
  uom?: string;
  poQty: number;
  qtyDelivered: number;
  receivedQty: number;
  nonPoQty?: number;
  cost: number | string;
  status: DeliveryStatus;
  remark?: string;
  isManuallyAdded?: boolean;
}

export interface DropdownOption {
  id: number;
  text: string;
}

export interface InvoiceForm {
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
  applyTradeDiscount?: boolean;
}

export interface DraftRecord {
  id: string;
  poNumber: string;
  poData: any;
  invoiceForm: InvoiceForm;
  items: ReceivedItem[];
  savedAt: string;
  submitted: boolean;
  invoiceTypes: DropdownOption[];
  tradeDiscounting: DropdownOption[];
  totalAmount?: number;
}
//end of received tabs
export interface Store {
  id: number;
  code: string;
  name: string;
  address?: string;
  city?: string;
}

export interface Supplier {
  id: number;
  code: string;
  name: string;
  discount_percent?: number;
}

export interface Item {
  id: number;
  barcode: string;
  sku: string;
  description: string;
  category: string;
  unit: string;
  stock?: number;
}

export interface ReceivedStock {
  id?: number;
  item_id: number;
  item?: Item;
  quantity: number;
  supplier_id: number;
  supplier?: Supplier;
  reference_number: string;
  date: string;
  store_id: number;
  store?: Store;
  status?: "pending" | "posted" | "cancelled";
  created_at?: string;
}

export interface InventoryItem {
  id?: number;
  barcode: string;
  sku: string;
  description: string;
  category: string;
  unit: string;
  stock?: number;
  min_stock?: number;
  cost_price?: number;
  selling_price?: number;
  store_id?: number;
  created_at?: string;
}

export interface DashboardSummary {
  total_items: number;
  low_stock_count: number;
  received_today: number;
  pending_stocks: number;
  recent_activity: ActivityItem[];
}

export interface ActivityItem {
  id: number;
  type: "receive" | "inventory" | "adjustment";
  description: string;
  timestamp: string;
  user: string;
}

export interface OfflineRecord {
  id: string;
  type: "receive_stock" | "inventory_item";
  data: ReceivedStock | InventoryItem;
  timestamp: string;
  synced: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  pagination?: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}

//withdrawal
export interface WithdrawalItem {
  inventory_item_id: string | number;
  qty: number;
  unit_price: number;
  discount_percent: number;
}

export interface WithdrawPayload {
  supplier_id: number;
  reason: string;
  withdrawn_by: string;
  approved_by: string;
  items: WithdrawalItem[];
}

export interface Withdrawal {
  id?: number;
  supplier_id: number;
  reason: string;
  withdrawn_by: string;
  approved_by: string;
  items: WithdrawalItem[];
  created_at?: string;
  updated_at?: string;
}

//api setting
export interface ApiSettings {
  baseUrl: string;
  config: null;
  savedAt: string;
  loginRequired: boolean;
}

// Boot phases used by the root layout
export type BootPhase =
  | "checking" // querying saved URL / .env URL
  | "no_api" // no URL configured yet
  | "api_error" // URL set but unreachable
  | "ready"; // API reachable, proceed to auth guard
