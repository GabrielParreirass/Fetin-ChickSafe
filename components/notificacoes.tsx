import {
  listarNotificacoes,
  marcarNotificacaoLida,
} from "@/lib/database";
import {
  contarNaoLidas,
  destinoNotificacao,
  formatarQuandoNotificacao,
  rotaDestinoNotificacao,
  rotuloContagemNaoLidas,
  type Notificacao,
} from "@/lib/notificacoes";
import { supabase } from "@/lib/supabase";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Href, router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export function SinoNotificacoes({ usuarioId }: { usuarioId?: string }) {
  const [aberta, setAberta] = useState(false);
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    if (!usuarioId) {
      setItens([]);
      return;
    }
    try {
      setCarregando(true);
      setItens(await listarNotificacoes(usuarioId));
    } catch {
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }, [usuarioId]);

  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar])
  );

  useEffect(() => {
    if (!usuarioId) {
      return;
    }

    const topic = `notificacoes-${usuarioId}-${Date.now()}`;
    const channel = supabase.channel(topic);
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notificacoes",
        filter: `usuario_id=eq.${usuarioId}`,
      },
      () => {
        void carregarRef.current();
      }
    );
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [usuarioId]);

  if (!usuarioId) {
    return null;
  }

  const naoLidas = contarNaoLidas(itens);
  const badge = rotuloContagemNaoLidas(naoLidas);

  const abrirItem = async (item: Notificacao) => {
    if (!item.lida) {
      try {
        await marcarNotificacaoLida(item.id);
        setItens((atual) =>
          atual.map((notificacao) =>
            notificacao.id === item.id
              ? { ...notificacao, lida: true }
              : notificacao
          )
        );
      } catch {
        // A navegação ainda vale mesmo se a marcação falhar.
      }
    }

    setAberta(false);
    const rota = rotaDestinoNotificacao(destinoNotificacao(item));
    if (rota) {
      router.push(rota as Href);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => {
          setAberta(true);
          void carregar();
        }}
        style={styles.sinoBotao}
        accessibilityLabel={
          naoLidas > 0
            ? `Abrir notificações, ${naoLidas} não lidas`
            : "Abrir notificações"
        }
      >
        <MaterialIcons name="notifications" size={26} color="#333" />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Modal
        visible={aberta}
        transparent
        animationType="fade"
        onRequestClose={() => setAberta(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Notificações</Text>
            {carregando && itens.length === 0 ? (
              <ActivityIndicator color="#333" />
            ) : itens.length === 0 ? (
              <Text style={styles.vazia}>Nenhuma notificação ainda.</Text>
            ) : (
              <ScrollView style={styles.lista}>
                {itens.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.item, !item.lida && styles.itemNaoLida]}
                    onPress={() => void abrirItem(item)}
                    accessibilityLabel={item.titulo}
                  >
                    <Text style={styles.itemTitulo}>{item.titulo}</Text>
                    <Text style={styles.itemMensagem}>{item.mensagem}</Text>
                    <Text style={styles.itemQuando}>
                      {formatarQuandoNotificacao(item.criadoEm)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity onPress={() => setAberta(false)}>
              <Text style={styles.fechar}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sinoBotao: {
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F44336",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
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
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  lista: {
    maxHeight: 360,
  },
  vazia: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginVertical: 12,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemNaoLida: {
    backgroundColor: "#fff8e1",
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  itemTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  itemMensagem: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
    lineHeight: 20,
  },
  itemQuando: {
    fontSize: 12,
    color: "#777",
    marginTop: 6,
  },
  fechar: {
    color: "#333",
    textAlign: "center",
    fontSize: 16,
    textDecorationLine: "underline",
    marginTop: 12,
  },
});
