import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
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

const DEFAULT_URL = "https://api.stockflow.example.com/v1";
const KEY_URL = "sf_base_url";
const KEY_TOKEN = "sf_token";

class ApiService {
  private http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: DEFAULT_URL,
      timeout: 15_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.http.interceptors.request.use(async (cfg) => {
      const token = await storage.get(KEY_TOKEN);
      if (token) cfg.headers.Authorization = `Bearer ${token}`;
      return cfg;
    });

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

  // ── Setup ──────────────────────────────────────────────────
  async init(): Promise<void> {
    const saved = await storage.get(KEY_URL);
    if (saved) this.http.defaults.baseURL = saved;
  }

  async setBaseURL(url: string): Promise<void> {
    const u = url.trim() || DEFAULT_URL;
    this.http.defaults.baseURL = u;
    await storage.set(KEY_URL, u);
  }

  getBaseURL(): string {
    return String(this.http.defaults.baseURL ?? DEFAULT_URL);
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
