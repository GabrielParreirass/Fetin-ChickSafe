import { cores } from "@/constants/tema";
import { useAuth } from "@/contexts/auth";
import { mensagemDeErro } from "@/lib/erros";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !senha) {
      setErro("Preencha e-mail e senha.");
      return;
    }

    try {
      setErro("");
      setEnviando(true);
      await signIn(email, senha);
    } catch (error) {
      setErro(mensagemDeErro(error, "Não foi possível entrar."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={cores.fundo} barStyle="dark-content" />

      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor={cores.tintaSuave}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={(valor) => {
          setEmail(valor);
          setErro("");
        }}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor={cores.tintaSuave}
        secureTextEntry
        value={senha}
        onChangeText={(valor) => {
          setSenha(valor);
          setErro("");
        }}
      />

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <TouchableOpacity
        style={[styles.button, enviando && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={enviando}
      >
        {enviando ? (
          <ActivityIndicator color={cores.fundo} />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() =>
          router.navigate({
            pathname: "/(auth)/recuperar/page",
            params: email.trim() ? { email: email.trim() } : {},
          })
        }
      >
        <Text style={styles.linkText}>Esqueci minha senha</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.navigate("/(auth)/cadastro/page")}>
        <Text style={styles.createAccountText}>Criar uma conta</Text>
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
    marginBottom: 40,
  },
  input: {
    width: "100%",
    height: 55,
    backgroundColor: cores.branco,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    color: cores.tinta,
  },
  erro: {
    width: "100%",
    color: cores.erro,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    backgroundColor: cores.tinta,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    marginBottom: 20,
    width: "100%",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: cores.fundo,
    fontSize: 18,
    fontWeight: "600",
  },
  linkText: {
    color: cores.tinta,
    marginTop: 10,
    fontSize: 16,
    textDecorationLine: "underline",
  },
  createAccountText: {
    color: cores.tinta,
    marginTop: 25,
    fontSize: 16,
    fontWeight: "600",
  },
});
