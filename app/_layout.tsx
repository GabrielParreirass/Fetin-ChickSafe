import { AuthProvider, useAuth } from "@/contexts/auth";
import { SimuladorProvider } from "@/contexts/simulador";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "index",
};

function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    const inPrivate = segments[0] === "(private)";

    if (!session && inPrivate) {
      router.replace("/");
      return;
    }

    if (session && !inPrivate) {
      router.replace("/(private)/home/page");
    }
  }, [loading, session, segments, router]);

  const inPrivate = segments[0] === "(private)";
  const redirecionando =
    loading || (!session && inPrivate) || (!!session && !inPrivate);

  return (
    <View style={styles.root}>
      {children}
      {redirecionando ? (
        <View style={styles.splash}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      ) : null}
    </View>
  );
}

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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#f9ca0a",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
