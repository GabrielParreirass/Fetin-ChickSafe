import { cores } from "@/constants/tema";
import { useAuth } from "@/contexts/auth";
import { usePush } from "@/contexts/push";
import { useGalpaoGestao } from "@/components/galpao-gestao";
import { SinoNotificacoes } from "@/components/notificacoes";
import { useHomeGalpoes } from "@/hooks/use-home-galpoes";
import {
  criarGalpao,
  entrarGalpaoPorCodigo,
  removerPushToken,
} from "@/lib/database";
import { acessoAprovado } from "@/lib/galpao";
import { corRotuloStatus, resumoLeitura, statusGalpao } from "@/lib/status";
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
  const { token: pushToken } = usePush();
  const { galpoes, leituras, carregando, agora, carregar } = useHomeGalpoes(
    user?.id
  );
  const [modal, setModal] = useState<"entrar" | "criar" | "criado" | null>(null);
  const [codigo, setCodigo] = useState("");
  const [nomeGalpao, setNomeGalpao] = useState("");
  const [nomeDispositivo, setNomeDispositivo] = useState("");
  const [codigoGerado, setCodigoGerado] = useState("");
  const [dispositivoGerado, setDispositivoGerado] = useState("");
  const [chaveGerada, setChaveGerada] = useState("");
  const [salvando, setSalvando] = useState(false);

  const primeiroNome = (usuario?.nome ?? "produtor").split(" ")[0];

  const { abrirAcessos, abrirConfig, modais: modaisGestao } = useGalpaoGestao({
    usuarioId: usuario?.id ?? user?.id,
    aoAtualizar: carregar,
  });

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const abrirGalpao = (galpao: Galpao) => {
    if (!acessoAprovado(galpao)) {
      Alert.alert(
        "Aguardando aprovação",
        "O dono ainda precisa aprovar o seu acesso a este galpão."
      );
      return;
    }
    router.push(`/(private)/galpao/${galpao.id}/page` as Href);
  };

  const fecharModal = () => {
    setModal(null);
    setCodigo("");
    setNomeGalpao("");
    setNomeDispositivo("");
    setCodigoGerado("");
    setDispositivoGerado("");
    setChaveGerada("");
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
        Alert.alert(
          "Pedido enviado",
          "O dono precisa aprovar o acesso a este galpão."
        );
      } else if (modal === "criar") {
        if (!nomeGalpao.trim()) {
          Alert.alert("Galpão", "Informe o nome do galpão.");
          return;
        }
        if (!nomeDispositivo.trim()) {
          Alert.alert("Galpão", "Informe o nome do dispositivo.");
          return;
        }
        const criado = await criarGalpao(nomeGalpao, nomeDispositivo);
        setCodigoGerado(criado.galpao.codigo ?? "");
        setDispositivoGerado(criado.dispositivoNome);
        setChaveGerada(criado.chave);
        setModal("criado");
        await carregar();
        return;
      }
      fecharModal();
      await carregar();
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível concluir.";
      Alert.alert("Galpão", mensagem);
    } finally {
      setSalvando(false);
    }
  };

  const handleSair = async () => {
    try {
      await removerPushToken(pushToken);
      await signOut();
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Não foi possível sair.";
      Alert.alert("Sair", mensagem);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={cores.fundo} barStyle="dark-content" />

      <View style={styles.header}>
        <View style={styles.userGreeting}>
          <Text style={styles.userName} numberOfLines={1}>
            Olá, {primeiroNome}!
          </Text>
          <SinoNotificacoes usuarioId={usuario?.id ?? user?.id} />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push("/(private)/perfil/page" as Href)}
            style={styles.headerButton}
            accessibilityLabel="Abrir perfil"
          >
            <MaterialIcons name="person" size={26} color={cores.tinta} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(private)/historico/page" as Href)}
            style={styles.headerButton}
            accessibilityLabel="Abrir histórico"
          >
            <MaterialIcons name="history" size={26} color={cores.tinta} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSair}
            style={styles.headerButton}
            accessibilityLabel="Sair"
          >
            <MaterialIcons name="logout" size={24} color={cores.tinta} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Galpões disponíveis</Text>

        {carregando ? (
          <ActivityIndicator color={cores.tinta} style={styles.loader} />
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
            renderItem={({ item }) => {
              const pendente = !acessoAprovado(item);
              const leitura = leituras[item.id] ?? null;
              const geral = pendente
                ? null
                : statusGalpao(
                    leitura,
                    item.limiarTensao,
                    item.limiarCorrente,
                    agora
                  );
              const rotuloStatus = pendente
                ? "Aguardando aprovação"
                : geral?.rotulo ?? "Sem dados";
              const corStatus = pendente
                ? cores.pendente
                : corRotuloStatus(geral?.rotulo ?? "Sem dados");

              return (
              <View style={styles.galpaoCard}>
                <TouchableOpacity
                  style={styles.galpaoCardMain}
                  onPress={() => abrirGalpao(item)}
                  accessibilityLabel={`${item.nome}, ${rotuloStatus}`}
                >
                  <MaterialIcons name="home" size={28} color={cores.tinta} />
                  <Text style={styles.galpaoNome}>{item.nome}</Text>
                  {item.codigo ? (
                    <Text style={styles.galpaoCodigo}>{item.codigo}</Text>
                  ) : null}
                  <View
                    style={[styles.statusBadge, { backgroundColor: corStatus }]}
                  >
                    <Text style={styles.statusBadgeText}>{rotuloStatus}</Text>
                  </View>
                  {!pendente && leitura ? (
                    <Text style={styles.galpaoLeitura}>
                      {resumoLeitura(leitura)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
                {!pendente ? (
                  <TouchableOpacity
                    style={styles.configButton}
                    onPress={() => abrirConfig(item)}
                    accessibilityLabel={`Configurar ${item.nome}`}
                  >
                    <MaterialIcons name="settings" size={20} color={cores.tinta} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.acessoButton}
                  onPress={() => void abrirAcessos(item)}
                  accessibilityLabel={`Ver acesso de ${item.nome}`}
                >
                  <MaterialIcons name="group" size={20} color={cores.tinta} />
                </TouchableOpacity>
              </View>
              );
            }}
          />
        )}

        <View style={styles.footerActions}>
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
        visible={modal === "entrar" || modal === "criar" || modal === "criado"}
        transparent
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {modal === "criado" ? (
              <>
                <Text style={styles.modalTitle}>Galpão criado</Text>
                <Text style={styles.campoLabel}>Código para convidar</Text>
                <Text style={styles.campoValor} selectable>
                  {codigoGerado}
                </Text>
                <Text style={styles.campoLabel}>X-Device-Key</Text>
                <Text style={styles.chaveDispositivo} selectable>
                  {chaveGerada || dispositivoGerado}
                </Text>
                <Text style={styles.campoAjuda}>
                  No ESP, o header X-Device-Key deve ser exatamente este nome.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={fecharModal}
                >
                  <Text style={styles.primaryButtonText}>Concluir</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>
                  {modal === "criar" ? "Novo galpão" : "Entrar em um galpão"}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={modal === "criar" ? "Nome do galpão" : "Código"}
                  placeholderTextColor={cores.tintaSuave}
                  autoCapitalize={modal === "criar" ? "sentences" : "characters"}
                  value={modal === "criar" ? nomeGalpao : codigo}
                  onChangeText={modal === "criar" ? setNomeGalpao : setCodigo}
                />
                {modal === "criar" ? (
                  <>
                    <Text style={styles.campoLabel}>Dispositivo ESP</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Nome do dispositivo"
                      placeholderTextColor={cores.tintaSuave}
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={nomeDispositivo}
                      onChangeText={setNomeDispositivo}
                    />
                    <Text style={styles.campoAjuda}>
                      Ex.: ESP-2. Esse nome é a chave que o ESP envia.
                    </Text>
                  </>
                ) : null}
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={confirmarAcao}
                  disabled={salvando}
                >
                  {salvando ? (
                    <ActivityIndicator color={cores.fundo} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Confirmar</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={fecharModal}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userGreeting: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
    marginRight: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: cores.tinta,
    flexShrink: 1,
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
    backgroundColor: cores.branco,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: cores.tinta,
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
    backgroundColor: cores.superficieSuave,
    borderRadius: 15,
    width: "47%",
    minHeight: 168,
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
    color: cores.tinta,
    marginTop: 8,
    textAlign: "center",
  },
  galpaoCodigo: {
    fontSize: 12,
    color: cores.tintaFraca,
    marginTop: 4,
  },
  statusBadge: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    color: cores.branco,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  galpaoLeitura: {
    fontSize: 11,
    color: cores.tintaSuave,
    marginTop: 6,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: cores.tintaSuave,
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
  primaryButton: {
    backgroundColor: cores.tinta,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: cores.fundo,
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: cores.tinta,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: cores.tinta,
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
    backgroundColor: cores.branco,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: cores.tinta,
    marginBottom: 4,
  },
  input: {
    height: 55,
    backgroundColor: cores.superficieSuave,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: cores.tinta,
  },
  cancelText: {
    color: cores.tinta,
    textAlign: "center",
    fontSize: 16,
    textDecorationLine: "underline",
    marginTop: 4,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: cores.tintaSuave,
    marginTop: 4,
  },
  campoValor: {
    fontSize: 16,
    color: cores.tinta,
    marginBottom: 8,
  },
  campoAjuda: {
    fontSize: 12,
    color: cores.tintaFraca,
    marginBottom: 8,
  },
  chaveDispositivo: {
    fontSize: 14,
    color: cores.tinta,
    fontWeight: "600",
    marginBottom: 8,
  },
});
