import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider, useApp } from "../features/auth/AppProvider";
import { Loading } from "../components/ui";

function Navigation() {
  const { booting, session } = useApp();

  if (booting) return <Loading />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={Boolean(session)}>
        <Stack.Screen name="memories" />
        <Stack.Screen name="us" />
      </Stack.Protected>
    </Stack>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Navigation />
      </AppProvider>
    </SafeAreaProvider>
  );
}
