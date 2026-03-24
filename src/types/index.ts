// src/types/index.ts

export interface User {
  id: number;
  username: string;
  name: string;
  role: string;
  token: string;
}

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
