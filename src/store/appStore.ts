// src/store/appStore.ts

import { create } from "zustand";
import { ApiSettings, OfflineRecord, Store, User } from "../types";
import { storage } from "../utils/storage";

const Q_KEY = "sf_offline_queue";
const API_CONFIG_KEY = "sf_api_settings"; // persisted ApiSettings JSON

interface AppState {
  // ── Auth ─────────────────────────────────────────────────
  user: User | null;
  isAuthenticated: boolean;

  // ── Store ────────────────────────────────────────────────
  selectedStore: Store | null;

  // ── API config (from server ping) ────────────────────────
  apiSettings: ApiSettings | null;

  // ── Connectivity ─────────────────────────────────────────
  isOnline: boolean;

  // ── Offline queue ────────────────────────────────────────
  offlineQueue: OfflineRecord[];

  // ── Actions ──────────────────────────────────────────────
  setUser: (u: User | null) => void;
  setSelectedStore: (s: Store | null) => void;
  setApiSettings: (s: ApiSettings | null) => Promise<void>;
  setIsOnline: (v: boolean) => void;
  addOfflineRecord: (r: OfflineRecord) => Promise<void>;
  removeOfflineRecord: (id: string) => Promise<void>;
  markSynced: (id: string) => Promise<void>;
  loadState: () => Promise<void>;
  clearAuth: () => Promise<void>;
  clearApiSettings: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  selectedStore: null,
  apiSettings: null,
  isOnline: true,
  offlineQueue: [],

  // ── Auth ─────────────────────────────────────────────────

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    if (user) storage.set("sf_user", JSON.stringify(user));
  },

  // ── Store ────────────────────────────────────────────────

  setSelectedStore: (store) => {
    set({ selectedStore: store });
    if (store) storage.set("sf_store", JSON.stringify(store));
    else storage.remove("sf_store");
  },

  // ── API settings (persisted) ─────────────────────────────

  /**
   * Called after a successful ping.
   * Saves the full ApiSettings object so on the next cold boot the app
   * can display the saved config name while re-pinging.
   */
  setApiSettings: async (settings) => {
    set({ apiSettings: settings });
    if (settings) {
      await storage.set(API_CONFIG_KEY, JSON.stringify(settings));
    } else {
      await storage.remove(API_CONFIG_KEY);
    }
  },

  // ── Network ──────────────────────────────────────────────

  setIsOnline: (v) => set({ isOnline: v }),

  // ── Offline queue ────────────────────────────────────────

  addOfflineRecord: async (r) => {
    const q = [...get().offlineQueue, r];
    set({ offlineQueue: q });
    await storage.set(Q_KEY, JSON.stringify(q));
  },

  removeOfflineRecord: async (id) => {
    const q = get().offlineQueue.filter((r) => r.id !== id);
    set({ offlineQueue: q });
    await storage.set(Q_KEY, JSON.stringify(q));
  },

  markSynced: async (id) => {
    const q = get().offlineQueue.map((r) =>
      r.id === id ? { ...r, synced: true } : r,
    );
    set({ offlineQueue: q });
    await storage.set(Q_KEY, JSON.stringify(q));
  },

  // ── Hydration ────────────────────────────────────────────

  loadState: async () => {
    const [uStr, sStr, qStr, cfgStr] = await Promise.all([
      storage.get("sf_user"),
      storage.get("sf_store"),
      storage.get(Q_KEY),
      storage.get(API_CONFIG_KEY),
    ]);
    set({
      user: uStr ? (JSON.parse(uStr) as User) : null,
      selectedStore: sStr ? (JSON.parse(sStr) as Store) : null,
      offlineQueue: qStr ? (JSON.parse(qStr) as OfflineRecord[]) : [],
      apiSettings: cfgStr ? (JSON.parse(cfgStr) as ApiSettings) : null,
      isAuthenticated: !!uStr,
    });
  },

  clearAuth: async () => {
    set({ user: null, isAuthenticated: false });
    await Promise.all([storage.remove("sf_user"), storage.remove("sf_token")]);
  },

  clearApiSettings: async () => {
    set({ apiSettings: null });
    await storage.remove(API_CONFIG_KEY);
  },
}));
