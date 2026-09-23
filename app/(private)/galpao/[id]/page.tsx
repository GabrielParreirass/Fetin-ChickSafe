import { cores } from "@/constants/tema";
import { useGalpaoGestao } from "@/components/galpao-gestao";
import { SinoNotificacoes } from "@/components/notificacoes";
import { useAuth } from "@/contexts/auth";
import { useGalpao } from "@/hooks/use-galpao";
import { ehDono } from "@/lib/acesso";
import { acessoAprovado } from "@/lib/galpao";
import {
  correnteOk,
  formatarCorrente,
  formatarTempoSemSinal,
  formatarTensao,
  LIMIAR_CORRENTE_MA,
  LIMIAR_TENSAO_V,
  rotuloEnergia,
  statusGalpao,
  tensaoOk,
  corRotuloStatus,
} from "@/lib/status";
import type { Galpao, Leitura } from "@/lib/types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Href, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type StatusCard = {
  campo: "energia" | "tensao" | "corrente";
  titulo: string;
  valor: string;
  ok: boolean;
};

function cardsDaLeitura(
  leitura: Leitura | null,
  limiarTensao = LIMIAR_TENSAO_V,
  limiarCorrente = LIMIAR_CORRENTE_MA
): StatusCard[] {
  if (!leitura) {
    return [
      { campo: "energia", titulo: "Energia", valor: "Sem dados", ok: false },
      {
        campo: "tensao",
        titulo: "Tensão da Bateria",
        valor: "Sem dados",
        ok: false,
      },
      {
        campo: "corrente",
        titulo: "Corrente do ventilador",
        valor: "Sem dados",
        ok: false,
      },
    ];
  }

  const tensao = Number(leitura.tensao);
  const corrente = Number(leitura.corrente);

  return [
    {
      campo: "energia",
      titulo: "Energia",
      valor: rotuloEnergia(leitura.energia),
      ok: rotuloEnergia(leitura.energia) === "Fonte",
    },
    {
      campo: "tensao",
      titulo: "Tensão da Bateria",
      valor: formatarTensao(tensao),
      ok: tensaoOk(tensao, limiarTensao),
    },
    {
      campo: "corrente",
      titulo: "Corrente do ventilador",
      valor: formatarCorrente(corrente),
      ok: correnteOk(corrente, limiarCorrente),
    },
  ];
}

export default function GalpaoDetalheScreen() {
  const { id, acesso } = useLocalSearchParams<{ id: string; acesso?: string }>();
  const { usuario, user } = useAuth();
  const {
    galpoes,
    ambienteSelecionado,
    leitura,
    carregando,
    agora,
    recarregarGalpoes,
    selecionarAmbiente,
  } = useGalpao(id, user?.id);
  const [modalVisible, setModalVisible] = useState(false);

  const primeiroNome = (usuario?.nome ?? "produtor").split(" ")[0];
  const cards = cardsDaLeitura(
    leitura,
    ambienteSelecionado?.limiarTensao,
    ambienteSelecionado?.limiarCorrente
  );
  const geral = statusGalpao(
    leitura,
    ambienteSelecionado?.limiarTensao,
    ambienteSelecionado?.limiarCorrente,
    agora
  );
  const offline = geral.rotulo === "Offline";

  const { abrirAcessos, abrirConfig, modais } = useGalpaoGestao({
    usuarioId: usuario?.id ?? user?.id,
    aoAtualizar: recarregarGalpoes,
    aoApagar: () => router.back(),
    aoSair: () => router.back(),
  });

  const acessoAberto = useRef(false);

  useEffect(() => {
    acessoAberto.current = false;
  }, [id]);

  useEffect(() => {
    if (acesso !== "1" || carregando || !ambienteSelecionado) {
      return;
    }
    if (ambienteSelecionado.id !== id || acessoAberto.current) {
      return;
    }
    acessoAberto.current = true;
    void abrirAcessos(ambienteSelecionado);
  }, [acesso, carregando, ambienteSelecionado, id, abrirAcessos]);

  const escolherAmbiente = async (ambiente: Galpao) => {
    setModalVisible(false);
    await selecionarAmbiente(ambiente);
  };

  const abrirHistorico = () => {
    if (!ambienteSelecionado || !acessoAprovado(ambienteSelecionado)) {
      return;
    }
    router.push(
      `/(private)/historico/page?galpaoId=${ambienteSelecionado.id}` as Href
    );
  };

  const abrirDashboard = () => {
    if (!ambienteSelecionado || !ehDono(ambienteSelecionado.papel)) {
      return;
    }
    router.push(
      `/(private)/galpao/${ambienteSelecionado.id}/dashboard/page` as Href
    );
  };

  const galpoesVisiveis = galpoes.filter(acessoAprovado);
  const aguardando =
    ambienteSelecionado != null && !acessoAprovado(ambienteSelecionado);
  const donoDoGalpao = Boolean(
    ambienteSelecionado && ehDono(ambienteSelecionado.papel)
  );
  const corIndicador = aguardando
    ? cores.pendente
    : corRotuloStatus(geral.rotulo);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={cores.fundo} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Voltar para a home"
        >
          <MaterialIcons name="arrow-back" size={26} color={cores.tinta} />
        </TouchableOpacity>
        <View style={styles.userGreeting}>
          <Text style={styles.userName} numberOfLines={1}>
            Olá, {primeiroNome}!
          </Text>
          <SinoNotificacoes usuarioId={usuario?.id ?? user?.id} />
        </View>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: corIndicador },
          ]}
        />
      </View>

      <View style={styles.body}>
        {carregando ? (
          <ActivityIndicator color={cores.tinta} style={styles.loader} />
        ) : (
          <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
            >
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={styles.dropdown}
              >
                <View style={styles.dropdownText}>
                  <Text style={styles.dropdownLabel}>
                    {ambienteSelecionado?.nome ?? "Nenhum galpão"}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="black" />
                </View>
              </TouchableOpacity>

              <View style={styles.acoesRow}>
                <TouchableOpacity
                  style={styles.acaoButton}
                  onPress={abrirHistorico}
                  disabled={aguardando}
                  accessibilityLabel="Abrir histórico"
                >
                  <MaterialIcons name="history" size={22} color={cores.fundo} />
                  <Text style={styles.acaoButtonText}>Histórico</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acaoButton}
                  onPress={() => {
                    if (ambienteSelecionado) {
                      void abrirAcessos(ambienteSelecionado);
                    }
                  }}
                  disabled={!ambienteSelecionado}
                  accessibilityLabel={`Ver acesso de ${ambienteSelecionado?.nome ?? "galpão"}`}
                >
                  <MaterialIcons name="group" size={22} color={cores.fundo} />
                  <Text style={styles.acaoButtonText}>Acesso</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acaoButton}
                  onPress={() => {
                    if (ambienteSelecionado) {
                      abrirConfig(ambienteSelecionado);
                    }
                  }}
                  disabled={!ambienteSelecionado || aguardando}
                  accessibilityLabel={`Configurar ${ambienteSelecionado?.nome ?? "galpão"}`}
                >
                  <MaterialIcons name="settings" size={22} color={cores.fundo} />
                  <Text style={styles.acaoButtonText}>Ajustes</Text>
                </TouchableOpacity>
              </View>

              {donoDoGalpao && !aguardando ? (
                <TouchableOpacity
                  style={styles.dashboardButton}
                  onPress={abrirDashboard}
                  accessibilityLabel="Abrir dashboard"
                >
                  <MaterialIcons name="insights" size={22} color={cores.fundo} />
                  <Text style={styles.acaoButtonText}>Dashboard</Text>
                </TouchableOpacity>
              ) : null}

              {aguardando ? (
                <Text style={styles.pendenteText}>
                  Aguardando aprovação do dono para ver as leituras deste galpão.
                </Text>
              ) : (
                <>
                  {offline && leitura ? (
                    <View style={styles.offlineBanner}>
                      <Text style={styles.offlineTitulo}>Sensor offline</Text>
                      <Text style={styles.offlineTexto}>
                        Sem sinal {formatarTempoSemSinal(leitura.criado_em, agora)}.
                        Últimos valores abaixo.
                      </Text>
                    </View>
                  ) : null}
                  {cards.map((card) => (
                    <View
                      key={card.campo}
                      style={[
                        styles.card,
                        {
                          backgroundColor: offline
                            ? cores.offline
                            : card.ok
                              ? cores.normal
                              : cores.alerta,
                        },
                      ]}
                    >
                      <Text style={styles.cardTitle}>{card.titulo}</Text>
                      <Text style={styles.cardStatus}>{card.valor}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="fade">
              <TouchableOpacity
                style={styles.modalContainer}
                onPress={() => setModalVisible(false)}
                activeOpacity={1}
              >
                <View style={styles.modalContent}>
                  <FlatList
                    data={galpoesVisiveis}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => void escolherAmbiente(item)}
                        style={styles.modalItem}
                      >
                        <Text style={styles.modalItemText}>{item.nome}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
          </>
        )}
      </View>
      {modais}
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
  backButton: {
    marginRight: 8,
    padding: 4,
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
    flexShrink: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: cores.tinta,
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  body: {
    flex: 1,
    backgroundColor: cores.branco,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 36,
  },
  loader: {
    marginTop: 24,
  },
  dropdown: {
    backgroundColor: cores.superficieSuave,
    borderRadius: 10,
    padding: 15,
    marginBottom: 16,
  },
  dropdownText: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownLabel: {
    fontSize: 18,
    color: cores.tinta,
  },
  acoesRow: {
    flexDirection: "row",
    marginBottom: 12,
    marginHorizontal: -6,
  },
  acaoButton: {
    flex: 1,
    backgroundColor: cores.tinta,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  acaoButtonText: {
    color: cores.fundo,
    fontSize: 13,
    fontWeight: "600",
  },
  dashboardButton: {
    backgroundColor: cores.tinta,
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  pendenteText: {
    fontSize: 16,
    color: cores.tintaSuave,
    textAlign: "center",
    lineHeight: 24,
    marginTop: 12,
  },
  offlineBanner: {
    backgroundColor: cores.avisoFundo,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  offlineTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: cores.avisoTexto,
    marginBottom: 4,
    textAlign: "center",
  },
  offlineTexto: {
    fontSize: 14,
    color: cores.avisoTexto,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    borderRadius: 15,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 14,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: cores.branco,
    marginBottom: 6,
  },
  cardStatus: {
    fontSize: 18,
    color: cores.branco,
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
  },
  modalItem: {
    paddingVertical: 15,
  },
  modalItemText: {
    fontSize: 20,
  },
});
