import { create } from "zustand";
import { OfflineRecord, Store, User } from "../types";
import { storage } from "../utils/storage";

const Q_KEY = "sf_offline_queue";

interface AppState {
  user: User | null;
  selectedStore: Store | null;
  isAuthenticated: boolean;
  isOnline: boolean;
  offlineQueue: OfflineRecord[];

  setUser: (u: User | null) => void;
  setSelectedStore: (s: Store | null) => void;
  setIsOnline: (v: boolean) => void;
  addOfflineRecord: (r: OfflineRecord) => Promise<void>;
  removeOfflineRecord: (id: string) => Promise<void>;
  markSynced: (id: string) => Promise<void>;
  loadState: () => Promise<void>;
  clearAuth: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  selectedStore: null,
  isAuthenticated: false,
  isOnline: true,
  offlineQueue: [],

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    if (user) storage.set("sf_user", JSON.stringify(user));
  },

  setSelectedStore: (store) => {
    set({ selectedStore: store });
    if (store) storage.set("sf_store", JSON.stringify(store));
    else storage.remove("sf_store");
  },

  setIsOnline: (v) => set({ isOnline: v }),

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

  loadState: async () => {
    const [uStr, sStr, qStr] = await Promise.all([
      storage.get("sf_user"),
      storage.get("sf_store"),
      storage.get(Q_KEY),
    ]);
    set({
      user: uStr ? (JSON.parse(uStr) as User) : null,
      selectedStore: sStr ? (JSON.parse(sStr) as Store) : null,
      offlineQueue: qStr ? (JSON.parse(qStr) as OfflineRecord[]) : [],
      isAuthenticated: !!uStr,
    });
  },

  clearAuth: async () => {
    set({ user: null, isAuthenticated: false, selectedStore: null });
    await Promise.all([
      storage.remove("sf_user"),
      storage.remove("sf_token"),
      storage.remove("sf_store"),
    ]);
  },
}));
