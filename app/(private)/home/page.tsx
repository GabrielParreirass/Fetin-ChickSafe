import { useAuth } from "@/contexts/auth";
import { useSimulador } from "@/contexts/simulador";
import { useGalpaoGestao } from "@/components/galpao-gestao";
import {
  criarGalpao,
  entrarGalpaoPorCodigo,
  listarGalpoesDoUsuario,
} from "@/lib/database";
import type { Galpao } from "@/lib/types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Href, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeLogadaScreen() {
  const { usuario, user, signOut } = useAuth();
  const { ativo, ultima, iniciar, parar } = useSimulador();
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState<"entrar" | "criar" | null>(null);
  const [codigo, setCodigo] = useState("");
  const [nomeGalpao, setNomeGalpao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const primeiroNome = (usuario?.nome ?? "produtor").split(" ")[0];

  const carregar = useCallback(async () => {
    if (!user) {
      return;
    }

    try {
      setCarregando(true);
      const lista = await listarGalpoesDoUsuario(user.id);
      setGalpoes(lista);
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Falha ao carregar galpões.";
      Alert.alert("Galpões", mensagem);
    } finally {
      setCarregando(false);
    }
  }, [user]);

  const { abrirAcessos, abrirConfig, modais: modaisGestao } = useGalpaoGestao({
    aoAtualizar: carregar,
  });

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const abrirGalpao = (galpao: Galpao) => {
    router.push(`/(private)/galpao/${galpao.id}/page` as Href);
  };

  const fecharModal = () => {
    setModal(null);
    setCodigo("");
    setNomeGalpao("");
  };

  const confirmarAcao = async () => {
    try {
      setSalvando(true);
      if (modal === "entrar") {
        if (!codigo.trim()) {
          Alert.alert("Galpão", "Informe o código.");
          return;
        }
        await entrarGalpaoPorCodigo(codigo);
      } else if (modal === "criar") {
        if (!nomeGalpao.trim()) {
          Alert.alert("Galpão", "Informe o nome do galpão.");
          return;
        }
        const criado = await criarGalpao(nomeGalpao);
        Alert.alert(
          "Galpão criado",
          `Código para convidar outros usuários: ${criado.codigo}`
        );
      }
      fecharModal();
      await carregar();
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível concluir. Rode supabase/extras.sql no SQL Editor.";
      Alert.alert("Galpão", mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const handleSair = async () => {
    try {
      await signOut();
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Não foi possível sair.";
      Alert.alert("Sair", mensagem);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f9ca0a" barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.userName}>Olá, {primeiroNome}!</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push("/(private)/perfil/page" as Href)}
            style={styles.headerButton}
            accessibilityLabel="Abrir perfil"
          >
            <MaterialIcons name="person" size={26} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(private)/historico/page" as Href)}
            style={styles.headerButton}
            accessibilityLabel="Abrir histórico"
          >
            <MaterialIcons name="history" size={26} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSair}
            style={styles.headerButton}
            accessibilityLabel="Sair"
          >
            <MaterialIcons name="logout" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Galpões disponíveis</Text>

        {carregando ? (
          <ActivityIndicator color="#333" style={styles.loader} />
        ) : (
          <FlatList
            data={galpoes}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.galpaoRow}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Você ainda não está em nenhum galpão. Entre com um código ou
                crie o primeiro.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.galpaoCard}>
                <TouchableOpacity
                  style={styles.galpaoCardMain}
                  onPress={() => abrirGalpao(item)}
                >
                  <MaterialIcons name="home" size={28} color="#333" />
                  <Text style={styles.galpaoNome}>{item.nome}</Text>
                  {item.codigo ? (
                    <Text style={styles.galpaoCodigo}>{item.codigo}</Text>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.configButton}
                  onPress={() => abrirConfig(item)}
                  accessibilityLabel={`Configurar ${item.nome}`}
                >
                  <MaterialIcons name="settings" size={20} color="#333" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acessoButton}
                  onPress={() => void abrirAcessos(item)}
                  accessibilityLabel={`Ver acesso de ${item.nome}`}
                >
                  <MaterialIcons name="group" size={20} color="#333" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}

        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[
              ativo ? styles.primaryButton : styles.secondaryButton,
              styles.footerButton,
            ]}
            onPress={() => (ativo ? parar() : void iniciar())}
          >
            <Text
              style={ativo ? styles.primaryButtonText : styles.secondaryButtonText}
            >
              {ativo ? "Parar simulador ESP32" : "Simular ESP32 (1 min)"}
            </Text>
          </TouchableOpacity>
          {ativo && ultima ? (
            <Text style={styles.simuladorStatus}>
              Último envio: {ultima.energia} · {Number(ultima.tensao).toFixed(1)} V ·{" "}
              {Math.round(Number(ultima.corrente))} mA
            </Text>
          ) : null}
          <TouchableOpacity
            style={[styles.secondaryButton, styles.footerButton]}
            onPress={() => setModal("entrar")}
          >
            <Text style={styles.secondaryButtonText}>Entrar com código</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setModal("criar")}
          >
            <Text style={styles.primaryButtonText}>Novo galpão</Text>
          </TouchableOpacity>
        </View>
      </View>

      {modaisGestao}

      <Modal
        visible={modal === "entrar" || modal === "criar"}
        transparent
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modal === "criar" ? "Novo galpão" : "Entrar em um galpão"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={modal === "criar" ? "Nome do galpão" : "Código"}
              placeholderTextColor="#555"
              autoCapitalize={modal === "criar" ? "sentences" : "characters"}
              value={modal === "criar" ? nomeGalpao : codigo}
              onChangeText={modal === "criar" ? setNomeGalpao : setCodigo}
            />
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={confirmarAcao}
              disabled={salvando}
            >
              {salvando ? (
                <ActivityIndicator color="#f9ca0a" />
              ) : (
                <Text style={styles.primaryButtonText}>Confirmar</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={fecharModal}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9ca0a",
  },
  header: {
    backgroundColor: "#f9ca0a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    padding: 4,
  },
  body: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  loader: {
    marginTop: 24,
  },
  listContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  galpaoRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  galpaoCard: {
    backgroundColor: "#f1f1f1",
    borderRadius: 15,
    width: "47%",
    minHeight: 130,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  galpaoCardMain: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  acessoButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
  },
  configButton: {
    position: "absolute",
    top: 8,
    left: 8,
    padding: 4,
  },
  galpaoNome: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
    marginTop: 8,
    textAlign: "center",
  },
  galpaoCodigo: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 24,
    lineHeight: 24,
  },
  footerActions: {
    paddingTop: 20,
    paddingBottom: 4,
  },
  footerButton: {
    marginBottom: 16,
  },
  simuladorStatus: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#333",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#f9ca0a",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: "#333",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  input: {
    height: 55,
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#333",
  },
  cancelText: {
    color: "#333",
    textAlign: "center",
    fontSize: 16,
    textDecorationLine: "underline",
    marginTop: 4,
  },
  emptyAcessoText: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
  },
  acessoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  acessoInfo: {
    flex: 1,
  },
  acessoNome: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  acessoEmail: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  acessoPapel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginTop: 4,
  },
  campoValor: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  campoAjuda: {
    fontSize: 12,
    color: "#777",
    marginBottom: 8,
  },
  erroAcesso: {
    color: "#8B0000",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  avisoAcesso: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  removerText: {
    color: "#8B0000",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  dangerButton: {
    borderWidth: 2,
    borderColor: "#8B0000",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerButtonText: {
    color: "#8B0000",
    fontSize: 16,
    fontWeight: "600",
  },
});
