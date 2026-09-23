import { cores } from "@/constants/tema";
import { useAuth } from "@/contexts/auth";
import { useRouter, useSegments } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading, recuperacaoPendente } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const recuperando = Boolean(recuperacaoPendente);
  const partes = [...segments];
  const naRedefinicao =
    partes[0] === "(auth)" &&
    partes[1] === "redefinir" &&
    partes[2] === "page";

  useEffect(() => {
    if (loading) {
      return;
    }

    if (recuperando && !naRedefinicao) {
      router.replace("/(auth)/redefinir/page");
      return;
    }

    const inPrivate = partes[0] === "(private)";

    if (!session && inPrivate) {
      router.replace("/");
      return;
    }

    if (session && !inPrivate && !recuperando) {
      router.replace("/(private)/home/page");
    }
  }, [loading, session, segments, router, recuperando, naRedefinicao]);

  const inPrivate = partes[0] === "(private)";
  const redirecionando =
    loading ||
    (recuperando && !naRedefinicao) ||
    (!session && inPrivate) ||
    (!!session && !inPrivate && !recuperando);

  return (
    <View style={styles.root}>
      {children}
      {redirecionando ? (
        <View style={styles.splash} testID="auth-splash">
          <ActivityIndicator size="large" color={cores.tinta} />
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
    backgroundColor: cores.fundo,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
