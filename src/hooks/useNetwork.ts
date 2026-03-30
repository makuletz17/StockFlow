// src/hooks/useNetwork.ts

import * as Network from "expo-network";
import { useEffect, useRef } from "react";
import { useAppStore } from "../store/appStore";

export const useNetwork = () => {
  const setIsOnline = useAppStore((s) => s.setIsOnline);
  const isOnline = useAppStore((s) => s.isOnline);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const state = await Network.getNetworkStateAsync();
        setIsOnline(
          state.isConnected === true && state.isInternetReachable !== false,
        );
      } catch {
        setIsOnline(false);
      }
    };

    check();
    timer.current = setInterval(check, 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  return { isOnline };
};
