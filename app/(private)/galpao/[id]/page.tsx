import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  Modal,
  FlatList,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Href, router, useLocalSearchParams } from "expo-router";
import { GALPOES, Galpao, getGalpaoById } from "@/app/utils/galpoes";
import { registrarHistorico } from "@/app/utils/historico";
// MQTT desabilitado temporariamente para testar o app fora da rede do broker
// import mqtt, { MqttClient } from "mqtt";
// import { useRef, useEffect } from "react";
// import apiUrl from "@/app/utils/Api_url.json";
// import { createMqttOptions } from "@/app/utils/MqttOptions";

type StatusCard = {
  campo: "energia" | "tensao" | "corrente";
  titulo: string;
  valor: string;
  ok: boolean;
};

function criarCards(galpao: Galpao): StatusCard[] {
  return [
    {
      campo: "energia",
      titulo: "Energia",
      valor: galpao.energia,
      ok: galpao.energia === "USB",
    },
    {
      campo: "tensao",
      titulo: "Tensão da Bateria",
      valor: `${galpao.tensaoBateria.toFixed(1)} V`,
      ok: galpao.tensaoBateria >= 12,
    },
    {
      campo: "corrente",
      titulo: "Corrente do ventilador",
      valor: `${galpao.correnteVentilador.toFixed(1)} A`,
      ok: galpao.correnteVentilador > 0.5,
    },
  ];
}

function rotuloEstado(card: StatusCard): string {
  if (card.campo === "energia") {
    return card.valor;
  }

  const situacao = card.ok ? "Normal" : "Alerta";
  return `${situacao} (${card.valor})`;
}

export default function GalpaoDetalheScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const galpaoInicial = getGalpaoById(Number(id)) ?? GALPOES[0];

  // MQTT desabilitado temporariamente para testar o app fora da rede do broker
  // const client = useRef<MqttClient | null>(null);
  // const API_URL = apiUrl.apiUrl;
  // const options = createMqttOptions();
  const [ambienteSelecionado, setAmbienteSelecionado] =
    useState<Galpao>(galpaoInicial);
  const [cards, setCards] = useState<StatusCard[]>(() =>
    criarCards(galpaoInicial)
  );
  const [modalVisible, setModalVisible] = useState(false);
  // const [vbat, setVbat] = useState(null);

  const getIndicadorCor = () => {
    const energia = cards.find((card) => card.campo === "energia");
    return energia?.ok ? "green" : "#F44336";
  };

  const selecionarAmbiente = (ambiente: Galpao) => {
    setAmbienteSelecionado(ambiente);
    setCards(criarCards(ambiente));
    setModalVisible(false);
  };

  const aoClicarCard = (index: number) => {
    const card = cards[index];
    const estadoAnterior = rotuloEstado(card);
    const proximoOk = !card.ok;
    const proximoValor =
      card.campo === "energia"
        ? card.valor === "USB"
          ? "Bateria"
          : "USB"
        : card.valor;
    const cardAtualizado: StatusCard = {
      ...card,
      ok: proximoOk,
      valor: proximoValor,
    };
    const novoEstado = rotuloEstado(cardAtualizado);

    registrarHistorico(
      card.titulo,
      estadoAnterior,
      novoEstado,
      new Date(),
      { id: ambienteSelecionado.id, nome: ambienteSelecionado.nome }
    );

    setCards((atual) =>
      atual.map((item, i) => (i === index ? cardAtualizado : item))
    );
  };

  const abrirHistorico = () => {
    router.push(
      `/(private)/historico/page?galpaoId=${ambienteSelecionado.id}` as Href
    );
  };

  // MQTT desabilitado temporariamente para testar o app fora da rede do broker
  // useEffect(() => {
  //   client.current = mqtt.connect(API_URL, options);
  //   client.current.on("connect", () => {
  //     console.log("✅ Conectado ao broker MQTT");
  //
  //     client.current?.subscribe("Chicksafe", (err) => {
  //       if (!err) {
  //         console.log("📡 Inscrito no tópico: Chicksafe");
  //       }
  //     });
  //   });
  //
  //   client.current.on("message", (topic, message) => {
  //     console.log(`📨 Mensagem no tópico ${topic}: ${message.toString()}`);
  //
  //     if (topic === "Chicksafe") {
  //       try {
  //         const obj = JSON.parse(message.toString());
  //
  //         const fonteDeEnergia = obj.fonte;
  //         const voltagemBateria = obj.vbat_mv;
  //
  //         setVbat(voltagemBateria);
  //         setAmbienteSelecionado((prev) => ({
  //           ...prev,
  //           energia: fonteDeEnergia === "USB" ? "USB" : "Bateria",
  //         }));
  //       } catch (error) {
  //         console.error("Erro ao fazer parse do JSON recebido:", error);
  //       }
  //     }
  //   });
  // }, []);

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
        <Text style={styles.userName}>Olá, Gabriel!</Text>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: getIndicadorCor() },
          ]}
        />
      </View>

      <View style={styles.body}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.dropdown}
        >
          <View style={styles.dropdownText}>
            <Text style={styles.dropdownText}>{ambienteSelecionado.nome}</Text>
            <Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="black" />
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.historicoButton} onPress={abrirHistorico}>
          <MaterialIcons name="history" size={22} color="#f9ca0a" />
          <Text style={styles.historicoButtonText}>Histórico</Text>
        </TouchableOpacity>

        <Modal visible={modalVisible} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalContainer}
            onPress={() => setModalVisible(false)}
            activeOpacity={1}
          >
            <View style={styles.modalContent}>
              <FlatList
                data={GALPOES}
                keyExtractor={(item) => item.id.toString()}
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

        {cards.map((card, index) => (
          <TouchableOpacity
            key={card.campo}
            style={[
              styles.card,
              { backgroundColor: card.ok ? "#4CAF50" : "#F44336" },
            ]}
            onPress={() => aoClicarCard(index)}
          >
            <Text style={styles.cardTitle}>{card.titulo}</Text>
            <Text style={styles.cardStatus}>{card.valor}</Text>
          </TouchableOpacity>
        ))}
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
  dropdown: {
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownText: {
    fontSize: 18,
    color: "#333",
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  historicoButton: {
    backgroundColor: "#333",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  historicoButtonText: {
    color: "#f9ca0a",
    fontSize: 16,
    fontWeight: "600",
  },
  card: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
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
