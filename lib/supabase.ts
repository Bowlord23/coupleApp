import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Database } from "../types/database";

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "https://dwdclseobbibwnhwbbid.supabase.co";
const key =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_b07iThjbVNs128zl9i0mHQ_t0U9m1sQ";
export const isConfigured =
  /^https:\/\/.+\.supabase\.co\/?$/.test(url) && key.length > 20;
// Web is a preview only: keep sessions in memory, never in localStorage.
const memory = new Map<string, string>();
const storage = {
  getItem: (name: string) =>
    Platform.OS === "web"
      ? Promise.resolve(memory.get(name) ?? null)
      : SecureStore.getItemAsync(name),
  setItem: async (name: string, value: string) => {
    if (Platform.OS === "web") {
      memory.set(name, value);
      return;
    }
    await SecureStore.setItemAsync(name, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  removeItem: async (name: string) => {
    if (Platform.OS === "web") {
      memory.delete(name);
      return;
    }
    await SecureStore.deleteItemAsync(name);
  },
};
export const supabase = createClient<Database>(
  isConfigured ? url : "https://unconfigured.supabase.co",
  isConfigured ? key : "unconfigured-public-key",
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(15_000),
        }),
    },
  },
);
