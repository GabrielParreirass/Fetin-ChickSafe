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
import mqtt, { MqttClient } from "mqtt";
import { useRef, useEffect } from "react";
import apiUrl from "@/app/utils/Api_url.json";
import { createMqttOptions } from "@/app/utils/MqttOptions";

export default function HomeLogadaScreen() {
  const ambientes = [
    {
      id: 1,
      nome: "Galpão Santa Rita",
      energia: "USB", 
      alarme: "Ativado",
    },
    {
      id: 2,
      nome: "Galpão Inatel",
      energia: "Bateria", 
      alarme: "Desativado",
    },
  ];

  const client = useRef<MqttClient | null>(null);
  const API_URL = apiUrl.apiUrl;
  const options = createMqttOptions();
  const [ambienteSelecionado, setAmbienteSelecionado] = useState(ambientes[0]);
  const [modalVisible, setModalVisible] = useState(false);
  const [vbat, setVbat] = useState(null);

  const alternarEnergia = () => {
    const novoStatus =
      ambienteSelecionado.energia === "USB"
        ? "Bateria"
        : "USB";
    setAmbienteSelecionado({ ...ambienteSelecionado, energia: novoStatus });
  };

  const alternarAlarme = () => {
    const novoStatus =
      ambienteSelecionado.alarme === "Ativado" ? "Desativado" : "Ativado";
    setAmbienteSelecionado({ ...ambienteSelecionado, alarme: novoStatus });
  };

  const getIndicadorCor = () => {
    if (
      ambienteSelecionado.energia === "USB" &&
      ambienteSelecionado.alarme === "Ativado"
    ) {
      return "green";
    } else {
      return "#F44336"; 
    }
  };

  const selecionarAmbiente = (ambiente: any) => {
    setAmbienteSelecionado(ambiente);
    setModalVisible(false);
  };

  useEffect(() => {
    client.current = mqtt.connect(API_URL, options);
    client.current.on("connect", () => {
      console.log("✅ Conectado ao broker MQTT");

      client.current?.subscribe("Chicksafe", (err) => {
        if (!err) {
          console.log("📡 Inscrito no tópico: Chicksafe");
        }
      });
    });

    client.current.on("message", (topic, message) => {
      console.log(`📨 Mensagem no tópico ${topic}: ${message.toString()}`);

      if (topic === "Chicksafe") {
        try {
          const obj = JSON.parse(message.toString());
          
          const fonteDeEnergia = obj.fonte; 
          const voltagemBateria = obj.vbat_mv;

          setVbat(voltagemBateria);
          setAmbienteSelecionado((prev) => ({
            ...prev,
            energia: fonteDeEnergia === "USB" ? "USB" : "Bateria",
          }));
        } catch (error) {
          console.error("Erro ao fazer parse do JSON recebido:", error);
        }
      }
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#f9ca0a" barStyle="dark-content" />

      <View style={styles.header}>
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

        <Modal visible={modalVisible} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalContainer}
            onPress={() => setModalVisible(false)}
            activeOpacity={1}
          >
            <View style={styles.modalContent}>
              <FlatList
                data={ambientes}
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

        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor:
                ambienteSelecionado.energia === "USB"
                  ? "#4CAF50"
                  : "#F44336",
            },
          ]}
          onPress={alternarEnergia}
        >
          <Text style={styles.cardTitle}>Energia</Text>
          <Text style={styles.cardStatus}>{ambienteSelecionado.energia}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor:
                ambienteSelecionado.alarme === "Ativado"
                  ? "#4CAF50"
                  : "#F44336",
            },
          ]}
          onPress={alternarAlarme}
        >
          <Text style={styles.cardTitle}>Alarme</Text>
          <Text style={styles.cardStatus}>{ambienteSelecionado.alarme}</Text>
        </TouchableOpacity>
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
    marginBottom: 20,
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
