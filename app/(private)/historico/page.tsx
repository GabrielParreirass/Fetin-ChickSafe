import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  FlatList,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  formatarDataHora,
  getHistorico,
  HistoricoItem,
} from "@/app/utils/historico";

export default function HistoricoScreen() {
  const { galpaoId } = useLocalSearchParams<{ galpaoId?: string }>();
  const [itens, setItens] = useState<HistoricoItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      const id = galpaoId ? Number(galpaoId) : undefined;
      setItens(getHistorico(Number.isNaN(id) ? undefined : id));
    }, [galpaoId])
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
        {itens.length === 0 ? (
          <Text style={styles.emptyText}>
            Nenhuma alteração registrada ainda. Toque nos cards de status para
            gerar um histórico.
          </Text>
        ) : (
          <FlatList
            data={itens}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Text style={styles.itemCampo}>{item.campo}</Text>
                <Text style={styles.itemGalpao}>{item.galpaoNome}</Text>
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
