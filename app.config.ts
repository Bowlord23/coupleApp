import type { ExpoConfig } from "expo/config";
import product from "./product.json";
const config: ExpoConfig = {
  name: product.name,
  slug: product.slug,
  version: "1.0.0",
  scheme: product.scheme,
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.bowlord23.ourplant",
    config: { usesNonExemptEncryption: false },
  },
  android: { package: "com.bowlord23.ourplant" },
  plugins: ["expo-router", "expo-secure-store", "expo-notifications"],
  web: { bundler: "metro", output: "single", favicon: "./assets/favicon.png" },
};
export default config;
