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

export default function RedefinirSenhaScreen() {
  const { session, recuperacaoPendente, definirNovaSenha, cancelarRecuperacao } =
    useAuth();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const handleSalvar = async () => {
    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }

    try {
      setErro("");
      setEnviando(true);
      await definirNovaSenha(senha);
    } catch (error) {
      setErro(mensagemDeErro(error, "Não foi possível salvar a senha."));
    } finally {
      setEnviando(false);
    }
  };

  const handleCancelar = async () => {
    try {
      setErro("");
      setEnviando(true);
      await cancelarRecuperacao();
      router.replace("/(auth)/login/page");
    } catch (error) {
      setErro(mensagemDeErro(error, "Não foi possível cancelar."));
    } finally {
      setEnviando(false);
    }
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor={cores.fundo} barStyle="dark-content" />
        {recuperacaoPendente ? (
          <ActivityIndicator size="large" color={cores.tinta} />
        ) : (
          <>
            <Text style={styles.title}>Link inválido</Text>
            <Text style={styles.texto}>
              Este link expirou ou já foi usado. Peça outro e-mail de
              recuperação.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace("/(auth)/recuperar/page")}
            >
              <Text style={styles.buttonText}>Pedir um novo link</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={cores.fundo} barStyle="dark-content" />

      <Text style={styles.title}>Nova senha</Text>
      <Text style={styles.texto}>Escolha uma senha para entrar no ChickSafe.</Text>

      <TextInput
        style={styles.input}
        placeholder="Nova senha"
        placeholderTextColor={cores.tintaSuave}
        secureTextEntry
        value={senha}
        onChangeText={(valor) => {
          setSenha(valor);
          setErro("");
        }}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirmar senha"
        placeholderTextColor={cores.tintaSuave}
        secureTextEntry
        value={confirmar}
        onChangeText={(valor) => {
          setConfirmar(valor);
          setErro("");
        }}
      />

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}

      <TouchableOpacity
        style={[styles.button, enviando && styles.buttonDisabled]}
        onPress={handleSalvar}
        disabled={enviando}
      >
        {enviando ? (
          <ActivityIndicator color={cores.fundo} />
        ) : (
          <Text style={styles.buttonText}>Salvar senha</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleCancelar} disabled={enviando}>
        <Text style={styles.linkText}>Cancelar</Text>
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
    marginBottom: 16,
    textAlign: "center",
  },
  texto: {
    width: "100%",
    color: cores.tinta,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 28,
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
});
