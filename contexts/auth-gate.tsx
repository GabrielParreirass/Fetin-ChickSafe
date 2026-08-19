import { useAuth } from "@/contexts/auth";
import { useRouter, useSegments } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export function AuthGate({ children }: { children: ReactNode }) {
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
        <View style={styles.splash} testID="auth-splash">
          <ActivityIndicator size="large" color="#333" />
        </View>
      ) : null}
    </View>
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
