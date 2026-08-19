import { ehDono } from "@/lib/acesso";
import { useAuth } from "@/contexts/auth";
import {
  fatiasEnergia,
  pontosCorrente,
  pontosTensao,
  resumoDashboard,
} from "@/lib/dashboard";
import { listarGalpoesDoUsuario, listarLeituras } from "@/lib/database";
import {
  formatarCorrente,
  formatarTensao,
} from "@/lib/status";
import type { Galpao, Leitura } from "@/lib/types";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart, PieChart } from "react-native-gifted-charts";

const LARGURA_GRAFICO = Math.max(Dimensions.get("window").width - 64, 220);

export default function DashboardGalpaoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [galpao, setGalpao] = useState<Galpao | null>(null);
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!user || !id) {
      return;
    }

    let ativo = true;

    (async () => {
      try {
        setCarregando(true);
        const lista = await listarGalpoesDoUsuario(user.id);
        const atual = lista.find((item) => item.id === id) ?? null;
        if (!ativo) {
          return;
        }
        setGalpao(atual);
        if (atual && ehDono(atual.papel)) {
          setLeituras(await listarLeituras(atual.id, 200));
        } else {
          setLeituras([]);
        }
      } catch (error) {
        const mensagem =
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o dashboard.";
        Alert.alert("Dashboard", mensagem);
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [user, id]);

  const resumo = useMemo(
    () =>
      galpao
        ? resumoDashboard(leituras, galpao.limiarTensao, galpao.limiarCorrente)
        : null,
    [leituras, galpao]
  );
  const serieTensao = useMemo(() => pontosTensao(leituras), [leituras]);
  const serieCorrente = useMemo(() => pontosCorrente(leituras), [leituras]);
  const energia = resumo ? fatiasEnergia(resumo) : [];

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f9ca0a" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Voltar"
        >
          <MaterialIcons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Dashboard</Text>
      </View>

      <View style={styles.body}>
        {carregando ? (
          <ActivityIndicator color="#333" style={styles.loader} />
        ) : !galpao || !ehDono(galpao.papel) ? (
          <Text style={styles.emptyText}>
            Só o dono pode ver o dashboard deste galpão.
          </Text>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.subtitulo}>{galpao.nome}</Text>
            {!resumo ? (
              <Text style={styles.emptyText}>
                Ainda não há leituras para montar os gráficos. Ligue o
                simulador ou aguarde o ESP32.
              </Text>
            ) : (
              <>
                <View style={styles.resumoGrid}>
                  <View style={styles.resumoCard}>
                    <Text style={styles.resumoRotulo}>Tensão média</Text>
                    <Text style={styles.resumoValor}>
                      {formatarTensao(resumo.mediaTensao)}
                    </Text>
                    <Text style={styles.resumoDetalhe}>
                      {formatarTensao(resumo.minTensao)} –{" "}
                      {formatarTensao(resumo.maxTensao)}
                    </Text>
                  </View>
                  <View style={styles.resumoCard}>
                    <Text style={styles.resumoRotulo}>Corrente média</Text>
                    <Text style={styles.resumoValor}>
                      {formatarCorrente(resumo.mediaCorrente)}
                    </Text>
                    <Text style={styles.resumoDetalhe}>
                      {formatarCorrente(resumo.minCorrente)} –{" "}
                      {formatarCorrente(resumo.maxCorrente)}
                    </Text>
                  </View>
                  <View style={styles.resumoCard}>
                    <Text style={styles.resumoRotulo}>Tempo em bateria</Text>
                    <Text style={styles.resumoValor}>
                      {Math.round(resumo.percentualBateria)}%
                    </Text>
                    <Text style={styles.resumoDetalhe}>
                      {resumo.leiturasBateria} de {resumo.total} leituras
                    </Text>
                  </View>
                  <View style={styles.resumoCard}>
                    <Text style={styles.resumoRotulo}>Leituras em alerta</Text>
                    <Text style={styles.resumoValor}>
                      {Math.round(resumo.percentualAlerta)}%
                    </Text>
                    <Text style={styles.resumoDetalhe}>
                      {resumo.leiturasAlerta} de {resumo.total}
                    </Text>
                  </View>
                </View>

                <Text style={styles.graficoTitulo}>Tensão ao longo do tempo</Text>
                <Text style={styles.graficoAjuda}>
                  Linha vermelha: limiar de {formatarTensao(galpao.limiarTensao)}
                </Text>
                <LineChart
                  data={serieTensao}
                  width={LARGURA_GRAFICO}
                  height={180}
                  color="#333"
                  thickness={2}
                  isAnimated={false}
                  hideDataPoints={serieTensao.length > 16}
                  yAxisColor="#ccc"
                  xAxisColor="#ccc"
                  yAxisTextStyle={styles.eixo}
                  xAxisLabelTextStyle={styles.eixo}
                  noOfSections={4}
                  spacing={Math.max(
                    18,
                    Math.floor(LARGURA_GRAFICO / Math.max(serieTensao.length, 1))
                  )}
                  showReferenceLine1
                  referenceLine1Position={galpao.limiarTensao}
                  referenceLine1Config={{
                    color: "#F44336",
                    dashWidth: 4,
                    dashGap: 3,
                  }}
                />

                <Text style={styles.graficoTitulo}>
                  Corrente ao longo do tempo
                </Text>
                <Text style={styles.graficoAjuda}>
                  Linha vermelha: limiar de{" "}
                  {formatarCorrente(galpao.limiarCorrente)}
                </Text>
                <LineChart
                  data={serieCorrente}
                  width={LARGURA_GRAFICO}
                  height={180}
                  color="#333"
                  thickness={2}
                  isAnimated={false}
                  hideDataPoints={serieCorrente.length > 16}
                  yAxisColor="#ccc"
                  xAxisColor="#ccc"
                  yAxisTextStyle={styles.eixo}
                  xAxisLabelTextStyle={styles.eixo}
                  noOfSections={4}
                  spacing={Math.max(
                    18,
                    Math.floor(
                      LARGURA_GRAFICO / Math.max(serieCorrente.length, 1)
                    )
                  )}
                  showReferenceLine1
                  referenceLine1Position={galpao.limiarCorrente}
                  referenceLine1Config={{
                    color: "#F44336",
                    dashWidth: 4,
                    dashGap: 3,
                  }}
                />

                <Text style={styles.graficoTitulo}>Fonte vs bateria</Text>
                <View style={styles.pizzaWrap}>
                  <PieChart
                    data={energia}
                    donut
                    radius={80}
                    innerRadius={48}
                    showText
                    textColor="#fff"
                    fontWeight="700"
                    isAnimated={false}
                  />
                </View>
                <View style={styles.legenda}>
                  <Text style={styles.legendaItem}>Verde: fonte/USB</Text>
                  <Text style={styles.legendaItem}>Vermelho: bateria</Text>
                </View>
              </>
            )}
          </ScrollView>
        )}
      </View>
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
    color: "#333",
  },
  body: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  scroll: {
    paddingBottom: 24,
  },
  loader: {
    marginTop: 24,
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 24,
    lineHeight: 24,
  },
  resumoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  resumoCard: {
    width: "48%",
    backgroundColor: "#f1f1f1",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  resumoRotulo: {
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
  },
  resumoValor: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 6,
  },
  resumoDetalhe: {
    fontSize: 11,
    color: "#777",
    marginTop: 4,
  },
  graficoTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginTop: 16,
    marginBottom: 4,
  },
  graficoAjuda: {
    fontSize: 12,
    color: "#777",
    marginBottom: 8,
  },
  eixo: {
    color: "#555",
    fontSize: 10,
  },
  pizzaWrap: {
    alignItems: "center",
    marginTop: 8,
  },
  legenda: {
    alignItems: "center",
    marginTop: 12,
    gap: 4,
  },
  legendaItem: {
    fontSize: 13,
    color: "#555",
  },
});
