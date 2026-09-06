import type { ExpoConfig } from "expo/config";
import product from "./product.json";
const config: ExpoConfig = {
  name: product.name,
  slug: product.slug,
  owner: "bowlord",
  version: "1.1.0",
  scheme: product.scheme,
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.bowlord23.ourplant",
    config: { usesNonExemptEncryption: false },
  },
  android: {
    package: "com.bowlord23.ourplant",
    googleServicesFile: "./google-services.json",
  },
  extra: { eas: { projectId: "985492ed-d728-4ba5-85a4-43a8c0079152" } },
  updates: { url: "https://u.expo.dev/985492ed-d728-4ba5-85a4-43a8c0079152" },
  runtimeVersion: { policy: "appVersion" },
  plugins: [
    "expo-router",
    "expo-secure-store",
    ["expo-notifications", { color: "#496B50", defaultChannel: "attention" }],
  ],
  web: { bundler: "metro", output: "single", favicon: "./assets/favicon.png" },
};
export default config;
