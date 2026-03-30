import axios, { AxiosInstance, AxiosResponse } from "axios";
import { encode as btoa } from "base-64";
import Constants from "expo-constants";
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
      const fullUrl = `${cfg.baseURL || ""}${cfg.url}`;

      console.log("➡️ Request:");
      console.log("URL:", fullUrl);
      console.log("Method:", cfg.method);
      console.log("Headers:", { ...cfg.headers });
      console.log("Body:", cfg.data);

      const token = await storage.get(KEY_TOKEN);
      console.log("Interceptor Token:", token);
      if (token) {
        cfg.headers.set("x-token", token);
      }
      return cfg;
    });

    this.http.interceptors.response.use(
      async (res) => {
        console.log("⬅️ Response:");
        console.log("URL:", res.config.url);
        console.log("Status:", res.status);
        console.log("Data:", res.data);

        const newToken = res.data?.token || res.data?.data?.token;
        if (newToken && typeof newToken === "string") {
          await storage.set(KEY_TOKEN, newToken);
        }

        return res;
      },
      async (err) => {
        console.log("❌ Error Response:");
        console.log("URL:", err?.config?.url);
        console.log("Status:", err?.response?.status);
        console.log("Message:", err?.response?.data);

        const status = err?.response?.status;
        const message = err?.response?.data?.message;

        if (status === 401 || message === "please renew your access!") {
          await this.logout();
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

  // ── Test ping ───────────────────────────────────────────────────
  // ok
  async ping(): Promise<boolean> {
    try {
      await this.http.head("/", { timeout: 8_000 });
      return true;
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      if (e && e["response"] !== undefined) {
        return true;
      }
      return false;
    }
  }

  // ── Warehouse ──────────────────────────────────────────────
  async getPOByNumber(poNo: string): Promise<{
    status: string;
    record: any;
    invoiceTypes: { id: number; text: string }[];
    tradeDiscounting: { id: number; text: string }[];
  }> {
    const res = await this.http.get(`/wh/${poNo}`, {
      headers: {
        "x-scopecode": "MQ==",
      },
    });
    return res.data;
  }

  // ── Auth ───────────────────────────────────────────────────
  async login(username: string, password: string): Promise<User> {
    const credential = btoa(`${username}<:>${btoa(password)}`);

    const res = await this.http.get("/login", {
      headers: {
        Authorization: credential,
        "x-scopecode": "MC4x",
      },
    });

    const responseData = res.data;

    const token = responseData?.token || responseData?.data?.token;
    const status = responseData?.status || (token ? "success" : null);

    if (token && typeof token === "string" && token.length > 0) {
      const user: User = {
        username,
        name: username,
        token,
      };

      await storage.set("sf_user", JSON.stringify(user));
      await storage.set("sf_username", username);

      return user;
    } else {
      throw new Error(
        "Login failed: " + (res.data?.message || "Invalid credentials"),
      );
    }
  }

  async logout(): Promise<void> {
    await Promise.all([
      storage.remove(KEY_TOKEN),
      storage.remove("sf_user"),
      storage.remove("sf_username"),
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
