import { cores } from "@/constants/tema";
import {
  ocultarNotificacao,
  ocultarNotificacoes,
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
  Pressable,
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

  const cargaId = useRef(0);

  const carregar = useCallback(async () => {
    if (!usuarioId) {
      setItens([]);
      return;
    }
    const id = ++cargaId.current;
    try {
      setCarregando(true);
      const lista = await listarNotificacoes(usuarioId);
      if (id === cargaId.current) {
        setItens(lista);
      }
    } catch {
      if (id === cargaId.current) {
        setItens([]);
      }
    } finally {
      if (id === cargaId.current) {
        setCarregando(false);
      }
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

  const limparUma = async (item: Notificacao) => {
    const anterior = itens;
    cargaId.current += 1;
    setCarregando(false);
    setItens((atual) => atual.filter((notificacao) => notificacao.id !== item.id));
    try {
      await ocultarNotificacao(item.id);
    } catch {
      setItens(anterior);
    }
  };

  const limparTodas = async () => {
    if (!usuarioId || itens.length === 0) {
      return;
    }
    const anterior = itens;
    cargaId.current += 1;
    setCarregando(false);
    setItens([]);
    try {
      await ocultarNotificacoes(usuarioId);
    } catch {
      setItens(anterior);
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
        <MaterialIcons name="notifications" size={26} color={cores.tinta} />
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
        <Pressable
          style={styles.modalContainer}
          onPress={() => setAberta(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <View style={styles.cabecalho}>
              <Text style={styles.modalTitle}>Notificações</Text>
              {itens.length > 0 ? (
                <TouchableOpacity
                  style={styles.limparTodasButton}
                  onPress={() => void limparTodas()}
                  accessibilityLabel="Limpar todas as notificações"
                >
                  <Text style={styles.limparTodasText}>Limpar todas</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {carregando && itens.length === 0 ? (
              <ActivityIndicator color={cores.tinta} />
            ) : itens.length === 0 ? (
              <Text style={styles.vazia}>Nenhuma notificação ainda.</Text>
            ) : (
              <ScrollView
                style={styles.lista}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {itens.map((item) => (
                  <View
                    key={item.id}
                    style={[styles.item, !item.lida && styles.itemNaoLida]}
                  >
                    <TouchableOpacity
                      style={styles.itemCorpo}
                      onPress={() => void abrirItem(item)}
                      accessibilityLabel={item.titulo}
                    >
                      <Text style={styles.itemTitulo}>{item.titulo}</Text>
                      <Text style={styles.itemMensagem}>{item.mensagem}</Text>
                      <Text style={styles.itemQuando}>
                        {formatarQuandoNotificacao(item.criadoEm)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.limparUmaButton}
                      onPress={() => void limparUma(item)}
                      accessibilityLabel={`Limpar ${item.titulo}`}
                    >
                      <MaterialIcons name="close" size={16} color={cores.tintaSuave} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.fecharButton}
              onPress={() => setAberta(false)}
            >
              <Text style={styles.fecharButtonText}>Fechar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
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
    backgroundColor: cores.alerta,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: cores.branco,
    fontSize: 10,
    fontWeight: "700",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  modalContent: {
    backgroundColor: cores.branco,
    borderRadius: 20,
    padding: 18,
    width: 360,
    maxWidth: "100%",
    maxHeight: 480,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "bold",
    color: cores.tinta,
  },
  limparTodasButton: {
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.superficieSuave,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  limparTodasText: {
    color: cores.tinta,
    fontSize: 13,
    fontWeight: "600",
  },
  lista: {
    maxHeight: 340,
  },
  vazia: {
    fontSize: 15,
    color: cores.tintaSuave,
    textAlign: "center",
    lineHeight: 22,
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: cores.divisor,
    backgroundColor: cores.branco,
  },
  itemNaoLida: {
    backgroundColor: cores.naoLida,
    borderColor: cores.bordaSuave,
  },
  itemCorpo: {
    flex: 1,
  },
  itemTitulo: {
    fontSize: 16,
    fontWeight: "700",
    color: cores.tinta,
  },
  itemMensagem: {
    fontSize: 14,
    color: cores.tintaSuave,
    marginTop: 4,
    lineHeight: 20,
  },
  itemQuando: {
    fontSize: 12,
    color: cores.tintaFraca,
    marginTop: 6,
  },
  limparUmaButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.superficieSuave,
  },
  fecharButton: {
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.superficieSuave,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  fecharButtonText: {
    color: cores.tinta,
    fontSize: 16,
    fontWeight: "600",
  },
});
