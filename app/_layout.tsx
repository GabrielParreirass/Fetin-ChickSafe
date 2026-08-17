import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login/page" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/cadastro/page" options={{ headerShown: false }} />
        <Stack.Screen name="(private)/home/page" options={{ headerShown: false }} />
        <Stack.Screen name="(private)/galpao/[id]/page" options={{ headerShown: false }} />
        <Stack.Screen name="(private)/historico/page" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
