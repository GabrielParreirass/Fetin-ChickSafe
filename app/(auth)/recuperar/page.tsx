import { cores } from "@/constants/tema";
import { useAuth } from "@/contexts/auth";
import { mensagemDeErro } from "@/lib/erros";
import { emailRecuperacaoValido } from "@/lib/recuperar-senha";
import { router, useLocalSearchParams } from "expo-router";
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

export default function RecuperarSenhaScreen() {
  const { solicitarRecuperacao } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const emailInicial = typeof params.email === "string" ? params.email : "";
  const [email, setEmail] = useState(emailInicial);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  const handleEnviar = async () => {
    if (!emailRecuperacaoValido(email)) {
      setErro("Informe um e-mail válido.");
      return;
    }

    try {
      setErro("");
      setEnviando(true);
      await solicitarRecuperacao(email);
      setEnviado(true);
    } catch (error) {
      setErro(mensagemDeErro(error, "Não foi possível enviar o e-mail."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={cores.fundo} barStyle="dark-content" />

      <Text style={styles.title}>Recuperar senha</Text>
      <Text style={styles.texto}>
        Enviaremos um link para este e-mail. Abra o link neste aparelho para
        criar uma senha nova.
      </Text>

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
          setEnviado(false);
        }}
      />

      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      {enviado ? (
        <Text style={styles.aviso}>
          Se esse e-mail estiver cadastrado, o link já foi enviado. Confira
          também a caixa de spam.
        </Text>
      ) : null}

      <TouchableOpacity
        style={[styles.button, enviando && styles.buttonDisabled]}
        onPress={handleEnviar}
        disabled={enviando}
      >
        {enviando ? (
          <ActivityIndicator color={cores.fundo} />
        ) : (
          <Text style={styles.buttonText}>
            {enviado ? "Enviar de novo" : "Enviar link"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.navigate("/(auth)/login/page")}>
        <Text style={styles.linkText}>Voltar ao login</Text>
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
  aviso: {
    width: "100%",
    color: cores.tinta,
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
