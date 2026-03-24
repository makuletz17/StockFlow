// src/hooks/useOfflineSync.ts

import { useEffect, useRef } from "react";
import api from "../api/apiService";
import { useAppStore } from "../store/appStore";
import { InventoryItem, ReceivedStock } from "../types";

export const useOfflineSync = () => {
  const { isOnline, offlineQueue, markSynced } = useAppStore();
  const prevOnline = useRef(isOnline);

  useEffect(() => {
    // Only trigger when coming BACK online
    if (isOnline && !prevOnline.current) {
      syncAll();
    }
    prevOnline.current = isOnline;
  }, [isOnline]);

  const syncAll = async () => {
    const pending = offlineQueue.filter((r) => !r.synced);
    if (!pending.length) return;
    console.log(`[OfflineSync] syncing ${pending.length} record(s)…`);
    for (const rec of pending) {
      try {
        if (rec.type === "receive_stock") {
          await api.createReceivedStock(rec.data as ReceivedStock);
        } else {
          await api.createInventoryItem(rec.data as InventoryItem);
        }
        await markSynced(rec.id);
        console.log(`[OfflineSync] synced ${rec.id}`);
      } catch (e) {
        console.warn(`[OfflineSync] failed ${rec.id}`, e);
      }
    }
  };

  return { syncAll };
};
