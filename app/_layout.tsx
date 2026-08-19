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
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="(auth)/login/page"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="(auth)/cadastro/page"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="(private)/home/page"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="(private)/galpao/[id]/page"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="(private)/historico/page"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
        </AuthGate>
      </SimuladorProvider>
      <StatusBar style="auto" />
    </AuthProvider>
  );
}
