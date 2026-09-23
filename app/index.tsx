import { cores } from "@/constants/tema";
import { router } from "expo-router";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={cores.fundo} barStyle="dark-content" />
      <Text style={styles.title}>Bem-vindo ao ChickSafe!</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.navigate("/(auth)/login/page")}
      >
        <Text style={styles.buttonText}>Fazer Login</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonSecondary}
        onPress={() => router.navigate("/(auth)/cadastro/page")}
      >
        <Text style={styles.buttonSecondaryText}>Criar Conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: cores.tinta,
    marginBottom: 50,
    textAlign: "center",
  },
  button: {
    backgroundColor: cores.tinta,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonText: {
    color: cores.fundo,
    fontSize: 18,
    fontWeight: "600",
  },
  buttonSecondary: {
    borderWidth: 2,
    borderColor: cores.tinta,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  buttonSecondaryText: {
    color: cores.tinta,
    fontSize: 18,
    fontWeight: "600",
  },
});
