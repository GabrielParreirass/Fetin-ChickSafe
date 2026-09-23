import { cores } from "@/constants/tema";
import { useAuth } from "@/contexts/auth";
import { usePush } from "@/contexts/push";
import { formatarCpf } from "@/lib/database";
import { mensagemDeErro } from "@/lib/erros";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function PerfilScreen() {
  const { usuario, atualizarConta } = useAuth();
  const { token: tokenPush, erro: erroPush } = usePush();
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [telefone, setTelefone] = useState(usuario?.telefone ?? "");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    setNome(usuario?.nome ?? "");
    setTelefone(usuario?.telefone ?? "");
  }, [usuario]);

  const atualizarCampo =
    (setter: (valor: string) => void) => (valor: string) => {
      setter(valor);
      setErro("");
      setAviso("");
    };

  const handleSalvar = async () => {
    if (!nome.trim() || !telefone.trim()) {
      setErro("Preencha nome e telefone.");
      return;
    }

    if (senha || confirmarSenha || senhaAtual) {
      if (!senhaAtual) {
        setErro("Informe a senha atual.");
        return;
      }
      if (senha.length < 6) {
        setErro("A senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (senha !== confirmarSenha) {
        setErro("As senhas não coincidem.");
        return;
      }
    }

    try {
      setErro("");
      setAviso("");
      setEnviando(true);
      await atualizarConta({
        nome,
        telefone,
        senha: senha || undefined,
        senhaAtual: senhaAtual || undefined,
      });
      setSenhaAtual("");
      setSenha("");
      setConfirmarSenha("");
      setAviso("Dados atualizados.");
    } catch (error) {
      setErro(mensagemDeErro(error, "Não foi possível atualizar o perfil."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={cores.fundo} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Voltar"
        >
          <MaterialIcons name="arrow-back" size={26} color={cores.tinta} />
        </TouchableOpacity>
        <Text style={styles.title}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.label}>Nome completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Nome completo"
          placeholderTextColor={cores.tintaSuave}
          value={nome}
          onChangeText={atualizarCampo(setNome)}
        />

        <Text style={styles.label}>Telefone</Text>
        <TextInput
          style={styles.input}
          placeholder="Telefone"
          placeholderTextColor={cores.tintaSuave}
          keyboardType="phone-pad"
          value={telefone}
          onChangeText={atualizarCampo(setTelefone)}
        />

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={[styles.input, styles.inputBloqueado]}
          value={usuario?.email ?? ""}
          editable={false}
        />
        <Text style={styles.ajuda}>O e-mail não pode ser alterado.</Text>

        <Text style={styles.label}>CPF</Text>
        <TextInput
          style={[styles.input, styles.inputBloqueado]}
          value={formatarCpf(usuario?.cpf ?? "")}
          editable={false}
        />
        <Text style={styles.ajuda}>O CPF não pode ser alterado.</Text>

        <Text style={styles.label}>Senha atual</Text>
        <TextInput
          style={styles.input}
          placeholder="Senha atual"
          placeholderTextColor={cores.tintaSuave}
          secureTextEntry
          value={senhaAtual}
          onChangeText={atualizarCampo(setSenhaAtual)}
        />

        <Text style={styles.label}>Nova senha (opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Nova senha"
          placeholderTextColor={cores.tintaSuave}
          secureTextEntry
          value={senha}
          onChangeText={atualizarCampo(setSenha)}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirmar nova senha"
          placeholderTextColor={cores.tintaSuave}
          secureTextEntry
          value={confirmarSenha}
          onChangeText={atualizarCampo(setConfirmarSenha)}
        />

        <Text style={styles.label}>Token push (teste)</Text>
        <Text selectable style={styles.tokenPush}>
          {tokenPush ??
            erroPush ??
            "Ainda sem token. Use o development build, não o Expo Go."}
        </Text>
        <Text style={styles.ajuda}>
          Copie este valor para enviar uma notificação de teste com o app
          fechado.
        </Text>

        {erro ? <Text style={styles.erro}>{erro}</Text> : null}
        {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}

        <TouchableOpacity
          style={[styles.button, enviando && styles.buttonDisabled]}
          onPress={() => void handleSalvar()}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color={cores.fundo} />
          ) : (
            <Text style={styles.buttonText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  header: {
    backgroundColor: cores.fundo,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: cores.tinta,
  },
  body: {
    backgroundColor: cores.branco,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    flexGrow: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: cores.tinta,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    height: 55,
    backgroundColor: cores.superficieSuave,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 12,
    color: cores.tinta,
  },
  inputBloqueado: {
    color: cores.tintaFraca,
  },
  ajuda: {
    fontSize: 13,
    color: cores.tintaFraca,
    marginTop: -6,
    marginBottom: 16,
  },
  tokenPush: {
    width: "100%",
    backgroundColor: cores.superficieSuave,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: cores.tinta,
    marginBottom: 6,
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
});
