import { useGalpaoGestao } from "@/components/galpao-gestao";
import { useAuth } from "@/contexts/auth";
import {
  buscarUltimaLeitura,
  listarGalpoesDoUsuario,
} from "@/lib/database";
import {
  correnteOk,
  formatarCorrente,
  formatarTensao,
  LIMIAR_CORRENTE_MA,
  LIMIAR_TENSAO_V,
  rotuloEnergia,
  tensaoOk,
} from "@/lib/status";
import { supabase } from "@/lib/supabase";
import type { Galpao, Leitura } from "@/lib/types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Href, router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { usuario, user } = useAuth();
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [ambienteSelecionado, setAmbienteSelecionado] = useState<Galpao | null>(
    null
  );
  const [leitura, setLeitura] = useState<Leitura | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const primeiroNome = (usuario?.nome ?? "produtor").split(" ")[0];
  const cards = cardsDaLeitura(
    leitura,
    ambienteSelecionado?.limiarTensao,
    ambienteSelecionado?.limiarCorrente
  );

  const carregarLeitura = useCallback(async (galpaoId: string) => {
    const atual = await buscarUltimaLeitura(galpaoId);
    setLeitura(atual);
  }, []);

  const recarregarGalpoes = useCallback(
    async (atualizado?: Galpao) => {
      if (!user) {
        return;
      }
      const lista = await listarGalpoesDoUsuario(user.id);
      setGalpoes(lista);
      if (atualizado) {
        setAmbienteSelecionado(atualizado);
        return;
      }
      setAmbienteSelecionado((atual) => {
        if (!atual) {
          return lista[0] ?? null;
        }
        return lista.find((item) => item.id === atual.id) ?? lista[0] ?? null;
      });
    },
    [user]
  );

  const { abrirAcessos, abrirConfig, modais } = useGalpaoGestao({
    aoAtualizar: recarregarGalpoes,
    aoApagar: () => router.back(),
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    let ativo = true;

    (async () => {
      try {
        setCarregando(true);
        const lista = await listarGalpoesDoUsuario(user.id);
        if (!ativo) {
          return;
        }
        setGalpoes(lista);
        const atual =
          lista.find((item) => item.id === id) ?? lista[0] ?? null;
        setAmbienteSelecionado(atual);
        if (atual) {
          await carregarLeitura(atual.id);
        }
      } catch (error) {
        const mensagem =
          error instanceof Error ? error.message : "Falha ao carregar o galpão.";
        Alert.alert("Galpão", mensagem);
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [user, id, carregarLeitura]);

  useEffect(() => {
    const galpaoId = ambienteSelecionado?.id;
    if (!galpaoId) {
      return;
    }

    const channel = supabase
      .channel(`leituras-${galpaoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leituras",
          filter: `galpao_id=eq.${galpaoId}`,
        },
        (payload) => {
          setLeitura(payload.new as Leitura);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ambienteSelecionado?.id]);

  const getIndicadorCor = () => {
    if (!leitura) {
      return "#9E9E9E";
    }
    return cards.every((card) => card.ok) ? "green" : "#F44336";
  };

  const selecionarAmbiente = async (ambiente: Galpao) => {
    setAmbienteSelecionado(ambiente);
    setModalVisible(false);
    try {
      await carregarLeitura(ambiente.id);
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Falha ao atualizar leituras.";
      Alert.alert("Galpão", mensagem);
    }
  };

  const abrirHistorico = () => {
    if (!ambienteSelecionado) {
      return;
    }
    router.push(
      `/(private)/historico/page?galpaoId=${ambienteSelecionado.id}` as Href
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f9ca0a" barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Voltar para a home"
        >
          <MaterialIcons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.userName}>Olá, {primeiroNome}!</Text>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: getIndicadorCor() },
          ]}
        />
      </View>

      <View style={styles.body}>
        {carregando ? (
          <ActivityIndicator color="#333" style={styles.loader} />
        ) : (
          <>
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
                accessibilityLabel="Abrir histórico"
              >
                <MaterialIcons name="history" size={22} color="#f9ca0a" />
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
                <MaterialIcons name="group" size={22} color="#f9ca0a" />
                <Text style={styles.acaoButtonText}>Acesso</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acaoButton}
                onPress={() => {
                  if (ambienteSelecionado) {
                    abrirConfig(ambienteSelecionado);
                  }
                }}
                disabled={!ambienteSelecionado}
                accessibilityLabel={`Configurar ${ambienteSelecionado?.nome ?? "galpão"}`}
              >
                <MaterialIcons name="settings" size={22} color="#f9ca0a" />
                <Text style={styles.acaoButtonText}>Ajustes</Text>
              </TouchableOpacity>
            </View>

            <Modal visible={modalVisible} transparent animationType="fade">
              <TouchableOpacity
                style={styles.modalContainer}
                onPress={() => setModalVisible(false)}
                activeOpacity={1}
              >
                <View style={styles.modalContent}>
                  <FlatList
                    data={galpoes}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => selecionarAmbiente(item)}
                        style={styles.modalItem}
                      >
                        <Text style={styles.modalItemText}>{item.nome}</Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </TouchableOpacity>
            </Modal>

            {cards.map((card) => (
              <View
                key={card.campo}
                style={[
                  styles.card,
                  { backgroundColor: card.ok ? "#4CAF50" : "#F44336" },
                ]}
              >
                <Text style={styles.cardTitle}>{card.titulo}</Text>
                <Text style={styles.cardStatus}>{card.valor}</Text>
              </View>
            ))}
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
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  userName: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  body: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  loader: {
    marginTop: 24,
  },
  dropdown: {
    backgroundColor: "#f1f1f1",
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
    color: "#333",
  },
  acoesRow: {
    flexDirection: "row",
    marginBottom: 24,
    marginHorizontal: -6,
  },
  acaoButton: {
    flex: 1,
    backgroundColor: "#333",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  acaoButtonText: {
    color: "#f9ca0a",
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 22,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  cardStatus: {
    fontSize: 20,
    color: "#fff",
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
  },
  modalItem: {
    paddingVertical: 15,
  },
  modalItemText: {
    fontSize: 20,
  },
});
