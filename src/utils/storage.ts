import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const IS_WEB = Platform.OS === "web";

// SecureStore has a ~2 KB per-value limit.
// For values larger than that (e.g. offline queue JSON) we chunk them.
const CHUNK = 1800;

async function setLarge(key: string, value: string): Promise<void> {
  if (value.length <= CHUNK) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  const total = Math.ceil(value.length / CHUNK);
  await SecureStore.setItemAsync(`${key}__n`, String(total));
  for (let i = 0; i < total; i++) {
    await SecureStore.setItemAsync(
      `${key}__${i}`,
      value.slice(i * CHUNK, (i + 1) * CHUNK),
    );
  }
}

async function getLarge(key: string): Promise<string | null> {
  const nStr = await SecureStore.getItemAsync(`${key}__n`);
  if (!nStr) return SecureStore.getItemAsync(key);
  const n = parseInt(nStr, 10);
  let out = "";
  for (let i = 0; i < n; i++) {
    out += (await SecureStore.getItemAsync(`${key}__${i}`)) ?? "";
  }
  return out;
}

async function deleteLarge(key: string): Promise<void> {
  const nStr = await SecureStore.getItemAsync(`${key}__n`).catch(() => null);
  if (nStr) {
    const n = parseInt(nStr, 10);
    for (let i = 0; i < n; i++) {
      await SecureStore.deleteItemAsync(`${key}__${i}`).catch(() => {});
    }
    await SecureStore.deleteItemAsync(`${key}__n`).catch(() => {});
  }
  await SecureStore.deleteItemAsync(key).catch(() => {});
}

export const storage = {
  async get(key: string): Promise<string | null> {
    try {
      if (IS_WEB) return localStorage.getItem(key);
      return await getLarge(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      if (IS_WEB) {
        localStorage.setItem(key, value);
        return;
      }
      await setLarge(key, value);
    } catch (e) {
      console.warn("[storage.set]", key, e);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      if (IS_WEB) {
        localStorage.removeItem(key);
        return;
      }
      await deleteLarge(key);
    } catch (e) {
      console.warn("[storage.remove]", key, e);
    }
  },
};
