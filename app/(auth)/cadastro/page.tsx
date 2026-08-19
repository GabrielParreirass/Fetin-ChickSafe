import { useAuth } from "@/contexts/auth";
import { soDigitos } from "@/lib/database";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

export default function CadastroScreen() {
  const { signUp } = useAuth();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [codigoGalpao, setCodigoGalpao] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleCadastro = async () => {
    const cpfLimpo = soDigitos(cpf);

    if (!nome.trim() || !email.trim() || !telefone.trim() || !senha) {
      Alert.alert("Cadastro", "Preencha nome, e-mail, telefone e senha.");
      return;
    }

    if (cpfLimpo.length !== 11) {
      Alert.alert("Cadastro", "Informe um CPF com 11 dígitos.");
      return;
    }

    if (senha.length < 6) {
      Alert.alert("Cadastro", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert("Cadastro", "As senhas não coincidem.");
      return;
    }

    try {
      setEnviando(true);
      const resultado = await signUp({
        nome,
        cpf: cpfLimpo,
        email,
        telefone,
        senha,
        codigoGalpao,
      });

      if (resultado.needsConfirmation) {
        Alert.alert(
          "Confirme seu e-mail",
          "Sua conta foi criada. Confirme o e-mail e depois faça login."
        );
        router.navigate("/(auth)/login/page");
      }
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Não foi possível criar a conta.";
      Alert.alert("Cadastro", mensagem);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar backgroundColor="#f9ca0a" barStyle="dark-content" />

      <Text style={styles.title}>Criar Conta</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome completo"
        placeholderTextColor="#555"
        value={nome}
        onChangeText={setNome}
      />

      <TextInput
        style={styles.input}
        placeholder="CPF"
        placeholderTextColor="#555"
        keyboardType="number-pad"
        value={cpf}
        onChangeText={setCpf}
      />

      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor="#555"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Telefone"
        placeholderTextColor="#555"
        keyboardType="phone-pad"
        value={telefone}
        onChangeText={setTelefone}
      />

      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#555"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirmar senha"
        placeholderTextColor="#555"
        secureTextEntry
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
      />

      <TextInput
        style={styles.input}
        placeholder="Código de Galpão (opcional)"
        placeholderTextColor="#555"
        autoCapitalize="characters"
        value={codigoGalpao}
        onChangeText={setCodigoGalpao}
      />

      <TouchableOpacity
        style={[styles.button, enviando && styles.buttonDisabled]}
        onPress={handleCadastro}
        disabled={enviando}
      >
        {enviando ? (
          <ActivityIndicator color="#f9ca0a" />
        ) : (
          <Text style={styles.buttonText}>Criar Conta</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.navigate("/(auth)/login/page")}>
        <Text style={styles.linkText}>Já tenho uma conta</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f9ca0a",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 40,
  },
  input: {
    width: "100%",
    height: 55,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 20,
    color: "#333",
  },
  button: {
    backgroundColor: "#333",
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
    color: "#f9ca0a",
    fontSize: 18,
    fontWeight: "600",
  },
  linkText: {
    color: "#333",
    marginTop: 10,
    fontSize: 16,
    textDecorationLine: "underline",
  },
});
