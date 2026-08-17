import React from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Href, router } from "expo-router";
import { GALPOES, Galpao } from "@/app/utils/galpoes";

export default function HomeLogadaScreen() {
  const abrirGalpao = (galpao: Galpao) => {
    router.push(`/(private)/galpao/${galpao.id}/page` as Href);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f9ca0a" barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.userName}>Olá, Gabriel!</Text>
        <TouchableOpacity
          onPress={() => router.push("/(private)/historico/page" as Href)}
          style={styles.historicoHeaderButton}
          accessibilityLabel="Abrir histórico"
        >
          <MaterialIcons name="history" size={26} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>Galpões disponíveis</Text>

        <View style={styles.galpaoRow}>
          {GALPOES.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.galpaoCard}
              onPress={() => abrirGalpao(item)}
            >
              <MaterialIcons name="home" size={28} color="#333" />
              <Text style={styles.galpaoNome}>{item.nome}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  historicoHeaderButton: {
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
  galpaoRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  galpaoCard: {
    backgroundColor: "#f1f1f1",
    borderRadius: 15,
    width: 130,
    height: 130,
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
});
