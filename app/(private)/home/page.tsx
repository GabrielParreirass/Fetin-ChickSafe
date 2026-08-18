import { useAuth } from "@/contexts/auth";
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
              <TouchableOpacity
                style={styles.galpaoCard}
                onPress={() => abrirGalpao(item)}
              >
                <MaterialIcons name="home" size={28} color="#333" />
                <Text style={styles.galpaoNome}>{item.nome}</Text>
                {item.codigo ? (
                  <Text style={styles.galpaoCodigo}>{item.codigo}</Text>
                ) : null}
              </TouchableOpacity>
            )}
          />
        )}

        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
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

      <Modal visible={modal != null} transparent animationType="fade">
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
    gap: 10,
    paddingTop: 8,
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
});
