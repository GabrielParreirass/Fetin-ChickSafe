import { AuthGate } from "@/contexts/auth-gate";
import { AuthProvider } from "@/contexts/auth";
import { SimuladorProvider } from "@/contexts/simulador";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "index",
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <SimuladorProvider>
        <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login/page" />
          <Stack.Screen name="(auth)/cadastro/page" />
          <Stack.Screen name="(private)/home/page" />
          <Stack.Screen name="(private)/perfil/page" />
          <Stack.Screen name="(private)/galpao/[id]/page" />
          <Stack.Screen name="(private)/galpao/[id]/dashboard/page" />
          <Stack.Screen name="(private)/historico/page" />
          <Stack.Screen name="+not-found" />
        </Stack>
        </AuthGate>
      </SimuladorProvider>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
