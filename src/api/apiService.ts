// src/api/apiService.ts
//
// Boot flow
// ─────────
// 1. init() is called once on app start.
// 2. It resolves the base URL in priority order:
//      a. Saved override in secure storage  (user-configured)
//      b. EXPO_PUBLIC_API_URL from .env      (build-time default)
//      c. Nothing — URL stays empty, boot phase becomes 'no_api'
// 3. ping() hits GET /api/v1/config and returns ApiConfig.
//    The caller (root _layout) stores the result in Zustand + secure storage.
// 4. All subsequent requests use the resolved URL with a Bearer token.

import axios, { AxiosInstance, AxiosResponse } from "axios";
import Constants from "expo-constants";
import {
  ApiConfig,
  ApiResponse,
  DashboardSummary,
  InventoryItem,
  Item,
  ReceivedStock,
  Store,
  Supplier,
  User,
} from "../types";
import { storage } from "../utils/storage";

const KEY_URL = "sf_base_url"; // user-saved override
const KEY_TOKEN = "sf_token";

// Reads EXPO_PUBLIC_API_URL baked into the bundle via .env
function getEnvUrl(): string {
  return (
    (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
    process.env["EXPO_PUBLIC_API_URL"] ??
    ""
  );
}

class ApiService {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: "", // set properly in init()
      timeout: 12_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    // Attach token on every request
    this.http.interceptors.request.use(async (cfg) => {
      const token = await storage.get(KEY_TOKEN);
      if (token) cfg.headers.Authorization = `Bearer ${token}`;
      return cfg;
    });

    // Global 401 handler
    this.http.interceptors.response.use(
      (r) => r,
      async (err) => {
        if (err?.response?.status === 401) {
          await storage.remove(KEY_TOKEN);
          await storage.remove("sf_user");
        }
        return Promise.reject(err);
      },
    );
  }

  // ── URL resolution ─────────────────────────────────────────

  /**
   * Called once on app boot.
   * Returns the resolved URL (may be empty string if nothing configured).
   */
  async init(): Promise<string> {
    const saved = await storage.get(KEY_URL); // user override first
    const envUrl = getEnvUrl(); // .env fallback
    const url = saved || envUrl;

    if (url) this.http.defaults.baseURL = url;
    return url;
  }

  /**
   * Saves a new base URL (user-configured from the UI).
   * Writes to secure storage so it survives restarts.
   */
  async setBaseURL(url: string): Promise<void> {
    const u = url.trim().replace(/\/$/, ""); // strip trailing slash
    this.http.defaults.baseURL = u;
    await storage.set(KEY_URL, u);
  }

  getBaseURL(): string {
    return String(this.http.defaults.baseURL ?? "");
  }

  /** Clears the user-saved URL override (reverts to .env value on next boot) */
  async clearSavedURL(): Promise<void> {
    await storage.remove(KEY_URL);
    this.http.defaults.baseURL = getEnvUrl();
  }

  // ── Ping / Config ──────────────────────────────────────────

  /**
   * Hits GET /api/v1/config
   * Used on boot to verify the API is reachable and to fetch server settings.
   *
   * Expected response:
   * {
   *   "success": true,
   *   "data": {
   *     "app_name": "StockFlow API",
   *     "version": "1.0.0",
   *     "company": "Your Company",
   *     "stores": [ ... ]   // optional pre-load
   *   }
   * }
   *
   * Throws if unreachable or server returns an error.
   */
  async ping(): Promise<ApiConfig> {
    const res: AxiosResponse<ApiResponse<ApiConfig>> = await this.http.get(
      "/config",
      { timeout: 8_000 },
    );
    return res.data.data;
  }

  // ── Auth ───────────────────────────────────────────────────

  async login(username: string, password: string): Promise<User> {
    const res: AxiosResponse<ApiResponse<User>> = await this.http.post(
      "/auth/login",
      { username, password },
    );
    const user = res.data.data;
    await storage.set(KEY_TOKEN, user.token);
    await storage.set("sf_user", JSON.stringify(user));
    return user;
  }

  async logout(): Promise<void> {
    try {
      await this.http.post("/auth/logout");
    } catch {
      /* ignore */
    }
    await Promise.all([
      storage.remove(KEY_TOKEN),
      storage.remove("sf_user"),
      storage.remove("sf_store"),
    ]);
  }

  // ── Stores ─────────────────────────────────────────────────

  async getStores(): Promise<Store[]> {
    const res: AxiosResponse<ApiResponse<Store[]>> =
      await this.http.get("/stores");
    return res.data.data;
  }

  // ── Suppliers ──────────────────────────────────────────────

  async getSuppliers(): Promise<Supplier[]> {
    const res: AxiosResponse<ApiResponse<Supplier[]>> =
      await this.http.get("/suppliers");
    return res.data.data;
  }

  // ── Items ──────────────────────────────────────────────────

  async getItems(search?: string): Promise<Item[]> {
    const res: AxiosResponse<ApiResponse<Item[]>> = await this.http.get(
      "/items",
      { params: { search } },
    );
    return res.data.data;
  }

  async getItemByBarcode(barcode: string): Promise<Item> {
    const res: AxiosResponse<ApiResponse<Item>> = await this.http.get(
      `/items/barcode/${barcode}`,
    );
    return res.data.data;
  }

  // ── Received Stocks ────────────────────────────────────────

  async getReceivedStocks(params?: {
    search?: string;
    date_from?: string;
    date_to?: string;
    store_id?: number;
    page?: number;
  }): Promise<ApiResponse<ReceivedStock[]>> {
    const res: AxiosResponse<ApiResponse<ReceivedStock[]>> =
      await this.http.get("/received-stocks", { params });
    return res.data;
  }

  async createReceivedStock(data: ReceivedStock): Promise<ReceivedStock> {
    const res: AxiosResponse<ApiResponse<ReceivedStock>> = await this.http.post(
      "/received-stocks",
      data,
    );
    return res.data.data;
  }

  // ── Inventory ──────────────────────────────────────────────

  async getInventory(params?: {
    search?: string;
    category?: string;
    store_id?: number;
    page?: number;
  }): Promise<ApiResponse<InventoryItem[]>> {
    const res: AxiosResponse<ApiResponse<InventoryItem[]>> =
      await this.http.get("/inventory", { params });
    return res.data;
  }

  async createInventoryItem(data: InventoryItem): Promise<InventoryItem> {
    const res: AxiosResponse<ApiResponse<InventoryItem>> = await this.http.post(
      "/inventory",
      data,
    );
    return res.data.data;
  }

  async updateInventoryItem(
    id: number,
    data: Partial<InventoryItem>,
  ): Promise<InventoryItem> {
    const res: AxiosResponse<ApiResponse<InventoryItem>> = await this.http.put(
      `/inventory/${id}`,
      data,
    );
    return res.data.data;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await this.http.delete(`/inventory/${id}`);
  }

  async exportInventoryCSV(store_id?: number): Promise<string> {
    const res = await this.http.get("/inventory/export", {
      params: { store_id },
      responseType: "text",
    });
    return res.data as string;
  }

  async importInventoryCSV(csvData: string, store_id: number) {
    const res = await this.http.post("/inventory/import", {
      csv_data: csvData,
      store_id,
    });
    return res.data.data as { imported: number; errors: string[] };
  }

  // ── Dashboard ──────────────────────────────────────────────

  async getDashboard(store_id?: number): Promise<DashboardSummary> {
    const res: AxiosResponse<ApiResponse<DashboardSummary>> =
      await this.http.get("/dashboard/summary", { params: { store_id } });
    return res.data.data;
  }
}

export const api = new ApiService();
export default api;
