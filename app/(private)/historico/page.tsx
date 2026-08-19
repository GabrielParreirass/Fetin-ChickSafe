import { useAuth } from "@/contexts/auth";
import { formatarDataHora } from "@/app/utils/historico";
import {
  avancarMes,
  celulasDoMes,
  diasDaSemana,
  formatarDataAcessivel,
  formatarDataBr,
  inicioDoMes,
  mesmoDia,
  rotuloMesAno,
} from "@/lib/calendario";
import { listarGalpoesDoUsuario, listarLeituras } from "@/lib/database";
import {
  extrairMudancas,
  filtrarMudancas,
  type FiltroCampoMudanca,
  type MudancaLeitura,
} from "@/lib/historico";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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

const FILTROS_CAMPO: Array<{ id: FiltroCampoMudanca; rotulo: string }> = [
  { id: "todos", rotulo: "Todos" },
  { id: "energia", rotulo: "Energia" },
  { id: "tensao", rotulo: "Tensão da bateria" },
  { id: "corrente", rotulo: "Corrente do ventilador" },
];

type AlvoCalendario = "inicio" | "fim";

export default function HistoricoScreen() {
  const { galpaoId } = useLocalSearchParams<{ galpaoId?: string }>();
  const { user } = useAuth();
  const [itens, setItens] = useState<MudancaLeitura[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [campo, setCampo] = useState<FiltroCampoMudanca>("todos");
  const [dataInicio, setDataInicio] = useState<Date | null>(null);
  const [dataFim, setDataFim] = useState<Date | null>(null);
  const [alvoCalendario, setAlvoCalendario] = useState<AlvoCalendario | null>(
    null
  );
  const [mesVisivel, setMesVisivel] = useState(() => inicioDoMes(new Date()));

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      (async () => {
        if (!user) {
          return;
        }

        try {
          setCarregando(true);
          const galpoes = await listarGalpoesDoUsuario(user.id);
          const nomesPorGalpao = Object.fromEntries(
            galpoes.map((item) => [item.id, item.nome])
          );
          const limiaresPorGalpao = Object.fromEntries(
            galpoes.map((item) => [
              item.id,
              { tensao: item.limiarTensao, corrente: item.limiarCorrente },
            ])
          );

          const ids = galpaoId
            ? [galpaoId]
            : galpoes.map((item) => item.id);

          const leituras = (
            await Promise.all(ids.map((id) => listarLeituras(id)))
          ).flat();

          if (ativo) {
            setItens(extrairMudancas(leituras, nomesPorGalpao, limiaresPorGalpao));
          }
        } catch (error) {
          const mensagem =
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o histórico.";
          Alert.alert("Histórico", mensagem);
        } finally {
          if (ativo) {
            setCarregando(false);
          }
        }
      })();

      return () => {
        ativo = false;
      };
    }, [galpaoId, user])
  );

  const filtrados = useMemo(
    () =>
      filtrarMudancas(itens, {
        campo,
        dataInicio,
        dataFim,
      }),
    [itens, campo, dataInicio, dataFim]
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

  const selecionada =
    alvoCalendario === "inicio"
      ? dataInicio
      : alvoCalendario === "fim"
        ? dataFim
        : null;

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
        <Text style={styles.title}>Histórico</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.filtrosCampo}>
          {FILTROS_CAMPO.map((filtro) => (
            <TouchableOpacity
              key={filtro.id}
              style={[
                styles.chip,
                campo === filtro.id && styles.chipAtivo,
              ]}
              onPress={() => setCampo(filtro.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: campo === filtro.id }}
            >
              <Text
                style={[
                  styles.chipText,
                  campo === filtro.id && styles.chipTextAtivo,
                ]}
              >
                {filtro.rotulo}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filtrosData}>
          <TouchableOpacity
            style={styles.botaoData}
            onPress={() => abrirCalendario("inicio")}
            accessibilityLabel="Escolher data inicial"
          >
            <MaterialIcons name="calendar-today" size={18} color="#333" />
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
            <MaterialIcons name="calendar-today" size={18} color="#333" />
            <Text style={styles.botaoDataTexto}>
              {dataFim ? `Até ${formatarDataBr(dataFim)}` : "Data final"}
            </Text>
          </TouchableOpacity>
        </View>

        {carregando ? (
          <ActivityIndicator color="#333" style={styles.loader} />
        ) : itens.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhuma mudança registrada ainda. Ligue o simulador ou aguarde o
            ESP32 publicar leituras diferentes.
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
              <View style={styles.item}>
                <Text style={styles.itemCampo}>{item.campo}</Text>
                {item.galpaoNome ? (
                  <Text style={styles.itemGalpao}>{item.galpaoNome}</Text>
                ) : null}
                <Text style={styles.itemLinha}>
                  Anterior: {item.estadoAnterior}
                </Text>
                <Text style={styles.itemLinha}>Novo: {item.novoEstado}</Text>
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
                <MaterialIcons name="chevron-left" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.mesTitulo}>{rotuloMesAno(mesVisivel)}</Text>
              <TouchableOpacity
                onPress={() => setMesVisivel((atual) => avancarMes(atual, 1))}
                accessibilityLabel="Próximo mês"
                style={styles.mesSeta}
              >
                <MaterialIcons name="chevron-right" size={20} color="#333" />
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
  filtrosCampo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipAtivo: {
    backgroundColor: "#333",
  },
  chipText: {
    color: "#333",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextAtivo: {
    color: "#f9ca0a",
  },
  filtrosData: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  botaoData: {
    flex: 1,
    height: 48,
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  botaoDataTexto: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
    flexShrink: 1,
  },
  loader: {
    marginTop: 24,
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 24,
    lineHeight: 24,
  },
  item: {
    backgroundColor: "#f1f1f1",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  itemCampo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  itemGalpao: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  itemLinha: {
    fontSize: 15,
    color: "#333",
    marginBottom: 4,
  },
  itemData: {
    fontSize: 13,
    color: "#777",
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
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    width: 260,
    maxWidth: "100%",
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
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
    color: "#333",
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
    color: "#777",
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
    backgroundColor: "#333",
  },
  diaTexto: {
    fontSize: 12,
    color: "#333",
  },
  diaTextoFora: {
    color: "#999",
  },
  diaTextoSelecionado: {
    color: "#f9ca0a",
    fontWeight: "700",
  },
  limparText: {
    color: "#333",
    textAlign: "center",
    fontSize: 13,
    marginTop: 8,
  },
  cancelText: {
    color: "#333",
    textAlign: "center",
    fontSize: 13,
    textDecorationLine: "underline",
    marginTop: 6,
  },
});
