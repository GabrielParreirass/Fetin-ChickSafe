import { useAuth } from "@/contexts/auth";
import { formatarDataHora } from "@/app/utils/historico";
import { listarGalpoesDoUsuario, listarLeituras } from "@/lib/database";
import { extrairMudancas, type MudancaLeitura } from "@/lib/historico";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HistoricoScreen() {
  const { galpaoId } = useLocalSearchParams<{ galpaoId?: string }>();
  const { user } = useAuth();
  const [itens, setItens] = useState<MudancaLeitura[]>([]);
  const [carregando, setCarregando] = useState(true);

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

          const ids = galpaoId
            ? [galpaoId]
            : galpoes.map((item) => item.id);

          const leituras = (
            await Promise.all(ids.map((id) => listarLeituras(id)))
          ).flat();

          if (ativo) {
            setItens(extrairMudancas(leituras, nomesPorGalpao));
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
        {carregando ? (
          <ActivityIndicator color="#333" style={styles.loader} />
        ) : itens.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhuma mudança registrada ainda. Ligue o simulador ou aguarde o
            ESP32 publicar leituras diferentes.
          </Text>
        ) : (
          <FlatList
            data={itens}
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
});
