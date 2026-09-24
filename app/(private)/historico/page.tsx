import { cores } from "@/constants/tema";
import { useAuth } from "@/contexts/auth";
import { useHistorico } from "@/hooks/use-historico";
import { compartilharPdfHtml } from "@/lib/compartilhar";
import {
  avancarMes,
  celulasDoMes,
  diasDaSemana,
  formatarDataAcessivel,
  formatarDataBr,
  formatarDataHora,
  inicioDoMes,
  mesmoDia,
  rotuloMesAno,
} from "@/lib/calendario";
import { htmlHistorico, nomeArquivoHtmlHistorico } from "@/lib/exportar";
import { filtrarMudancas } from "@/lib/historico";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
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

type AlvoCalendario = "inicio" | "fim";

export default function HistoricoScreen() {
  const { galpaoId } = useLocalSearchParams<{ galpaoId?: string }>();
  const { user } = useAuth();
  const galpaoSelecionado = typeof galpaoId === "string" ? galpaoId : undefined;
  const { itens, carregando } = useHistorico(user?.id, galpaoSelecionado);
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [alvoCalendario, setAlvoCalendario] = useState<AlvoCalendario | null>(
    null
  );
  const [mesVisivel, setMesVisivel] = useState(() => inicioDoMes(new Date()));
  const [exportando, setExportando] = useState(false);

  const filtrados = useMemo(
    () =>
      filtrarMudancas(itens, {
        dataInicio,
        dataFim,
      }),
    [itens, dataInicio, dataFim]
  );

  const abrirCalendario = (alvo: AlvoCalendario) => {
    const atual = alvo === "inicio" ? dataInicio : dataFim;
    setMesVisivel(inicioDoMes(atual ?? new Date()));
    setAlvoCalendario(alvo);
  };

  const escolherDia = (data: Date) => {
    if (alvoCalendario === "inicio") {
      setDataInicio(data);
    } else if (alvoCalendario === "fim") {
      setDataFim(data);
    }
    setAlvoCalendario(null);
  };

  const limparData = () => {
    if (alvoCalendario === "inicio") {
      setDataInicio(null);
    } else if (alvoCalendario === "fim") {
      setDataFim(null);
    }
    setAlvoCalendario(null);
  };

  const exportar = async () => {
    if (filtrados.length === 0) {
      Alert.alert("Histórico", "Não há mudanças para exportar neste filtro.");
      return;
    }
    try {
      setExportando(true);
      await compartilharPdfHtml(
        htmlHistorico(filtrados),
        "Exportar histórico",
        nomeArquivoHtmlHistorico()
      );
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível exportar o histórico.";
      Alert.alert("Histórico", mensagem);
    } finally {
      setExportando(false);
    }
  };

  const selecionada =
    alvoCalendario === "inicio"
      ? dataInicio
      : alvoCalendario === "fim"
        ? dataFim
        : null;

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
        <Text style={styles.title}>Histórico</Text>
        <TouchableOpacity
          onPress={() => void exportar()}
          style={styles.exportButton}
          disabled={carregando || exportando}
          hitSlop={12}
          accessibilityLabel="Exportar histórico"
        >
          {exportando ? (
            <ActivityIndicator color={cores.tinta} size="small" />
          ) : (
            <MaterialIcons name="picture-as-pdf" size={26} color={cores.tinta} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.filtrosData}>
          <TouchableOpacity
            style={styles.botaoData}
            onPress={() => abrirCalendario("inicio")}
            accessibilityLabel="Escolher data inicial"
          >
            <MaterialIcons name="calendar-today" size={18} color={cores.tinta} />
            <Text style={styles.botaoDataTexto}>
              {dataInicio
                ? `De ${formatarDataBr(dataInicio)}`
                : "Data inicial"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.botaoData}
            onPress={() => abrirCalendario("fim")}
            accessibilityLabel="Escolher data final"
          >
            <MaterialIcons name="calendar-today" size={18} color={cores.tinta} />
            <Text style={styles.botaoDataTexto}>
              {dataFim ? `Até ${formatarDataBr(dataFim)}` : "Data final"}
            </Text>
          </TouchableOpacity>
        </View>

        {carregando ? (
          <ActivityIndicator color={cores.tinta} style={styles.loader} />
        ) : itens.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhuma mudança registrada ainda. Aguarde o ESP32 publicar
            leituras diferentes.
          </Text>
        ) : filtrados.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhuma mudança neste filtro.
          </Text>
        ) : (
          <FlatList
            data={filtrados}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.item,
                  item.entrouEmAlerta && styles.itemAlerta,
                  item.voltouAoNormal && styles.itemNormal,
                ]}
              >
                {item.galpaoNome ? (
                  <Text style={styles.itemGalpao}>{item.galpaoNome}</Text>
                ) : null}
                {item.campos.map((parte) => (
                  <Text key={parte.campo} style={styles.itemLinha}>
                    <Text style={styles.itemCampo}>{parte.campo}: </Text>
                    {parte.anterior} → {parte.novo}
                  </Text>
                ))}
                <Text style={styles.itemData}>
                  {formatarDataHora(item.dataHora)}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      <Modal
        visible={alvoCalendario != null}
        transparent
        animationType="fade"
        onRequestClose={() => setAlvoCalendario(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {alvoCalendario === "fim" ? "Data final" : "Data inicial"}
            </Text>
            <View style={styles.mesHeader}>
              <TouchableOpacity
                onPress={() => setMesVisivel((atual) => avancarMes(atual, -1))}
                accessibilityLabel="Mês anterior"
                style={styles.mesSeta}
              >
                <MaterialIcons name="chevron-left" size={20} color={cores.tinta} />
              </TouchableOpacity>
              <Text style={styles.mesTitulo}>{rotuloMesAno(mesVisivel)}</Text>
              <TouchableOpacity
                onPress={() => setMesVisivel((atual) => avancarMes(atual, 1))}
                accessibilityLabel="Próximo mês"
                style={styles.mesSeta}
              >
                <MaterialIcons name="chevron-right" size={20} color={cores.tinta} />
              </TouchableOpacity>
            </View>
            <View style={styles.semanaRow}>
              {diasDaSemana().map((dia) => (
                <Text key={dia} style={styles.semanaLabel}>
                  {dia}
                </Text>
              ))}
            </View>
            <View style={styles.grade}>
              {celulasDoMes(mesVisivel).map((celula) => (
                <TouchableOpacity
                  key={celula.data.toISOString()}
                  style={[
                    styles.diaCelula,
                    !celula.noMes && styles.diaFora,
                    selecionada &&
                      mesmoDia(celula.data, selecionada) &&
                      styles.diaSelecionado,
                  ]}
                  disabled={!celula.noMes}
                  onPress={() => escolherDia(celula.data)}
                  accessibilityLabel={formatarDataAcessivel(celula.data)}
                >
                  <Text
                    style={[
                      styles.diaTexto,
                      !celula.noMes && styles.diaTextoFora,
                      selecionada &&
                        mesmoDia(celula.data, selecionada) &&
                        styles.diaTextoSelecionado,
                    ]}
                  >
                    {celula.dia}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={limparData}>
              <Text style={styles.limparText}>Limpar data</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAlvoCalendario(null)}>
              <Text style={styles.cancelText}>Fechar</Text>
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
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: cores.tinta,
  },
  exportButton: {
    padding: 4,
    minWidth: 34,
    alignItems: "center",
  },
  body: {
    flex: 1,
    backgroundColor: cores.branco,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  filtrosData: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  botaoData: {
    flex: 1,
    height: 48,
    backgroundColor: cores.superficieSuave,
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  botaoDataTexto: {
    fontSize: 14,
    color: cores.tinta,
    fontWeight: "600",
    flexShrink: 1,
  },
  loader: {
    marginTop: 24,
  },
  emptyText: {
    fontSize: 16,
    color: cores.tintaSuave,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 24,
  },
  itemAlerta: {
    backgroundColor: cores.fundoAlerta,
  },
  itemNormal: {
    backgroundColor: cores.fundoNormal,
  },
  item: {
    backgroundColor: cores.superficieSuave,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemCampo: {
    fontSize: 18,
    fontWeight: "bold",
    color: cores.tinta,
    marginBottom: 4,
  },
  itemGalpao: {
    fontSize: 14,
    color: cores.tintaSuave,
    marginBottom: 8,
  },
  itemLinha: {
    fontSize: 15,
    color: cores.tinta,
    marginBottom: 4,
  },
  itemData: {
    fontSize: 13,
    color: cores.tintaFraca,
    marginTop: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: cores.branco,
    borderRadius: 14,
    padding: 12,
    width: 260,
    maxWidth: "100%",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: cores.tinta,
    marginBottom: 8,
    textAlign: "center",
  },
  mesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  mesSeta: {
    padding: 2,
  },
  mesTitulo: {
    fontSize: 13,
    fontWeight: "600",
    color: cores.tinta,
    textTransform: "capitalize",
  },
  semanaRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  semanaLabel: {
    width: "14.28%",
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    color: cores.tintaFraca,
  },
  grade: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  diaCelula: {
    width: "14.28%",
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  diaFora: {
    opacity: 0.3,
  },
  diaSelecionado: {
    backgroundColor: cores.tinta,
  },
  diaTexto: {
    fontSize: 12,
    color: cores.tinta,
  },
  diaTextoFora: {
    color: cores.desabilitado,
  },
  diaTextoSelecionado: {
    color: cores.fundo,
    fontWeight: "700",
  },
  limparText: {
    color: cores.tinta,
    textAlign: "center",
    fontSize: 13,
    marginTop: 8,
  },
  cancelText: {
    color: cores.tinta,
    textAlign: "center",
    fontSize: 13,
    textDecorationLine: "underline",
    marginTop: 6,
  },
});
