import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";

export async function registerPushToken(userId: string): Promise<void> {
  if (
    !Device.isDevice ||
    Platform.OS === "web" ||
    Constants.appOwnership === "expo"
  )
    throw new Error("Development build required");
  const projectId = Constants.easConfig?.projectId;
  if (!projectId) throw new Error("EAS project not configured");
  const Notifications = await import("expo-notifications");
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("attention", {
      name: "Знаки внимания",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 100, 180],
    });
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted
    ? existing
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId,
  });
  const result = await supabase
    .from("push_tokens")
    .upsert({ user_id: userId, token });
  if (result.error) throw result.error;
}
export async function disablePush(userId: string): Promise<void> {
  const result = await supabase
    .from("push_tokens")
    .delete()
    .eq("user_id", userId);
  if (result.error) throw result.error;
}
