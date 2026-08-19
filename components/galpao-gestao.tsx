import {
  ehAcessoPendente,
  ehDono,
  formatarLinhaAcesso,
  type AcessoGalpao,
} from "@/lib/acesso";
import {
  apagarGalpao,
  aprovarAcessoDoGalpao,
  atualizarGalpao,
  listarAcessosDoGalpao,
  recusarAcessoDoGalpao,
  removerAcessoDoGalpao,
  sairDoGalpao,
} from "@/lib/database";
import { mensagemDeErro } from "@/lib/erros";
import { parseLimiar, usuarioPodeGerenciar } from "@/lib/galpao";
import type { Galpao } from "@/lib/types";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ModalGestao = "acesso" | "config" | null;

export function useGalpaoGestao(opcoes: {
  usuarioId?: string;
  aoAtualizar?: (galpao?: Galpao) => Promise<void> | void;
  aoApagar?: () => void;
  aoSair?: () => void;
}) {
  const [modal, setModal] = useState<ModalGestao>(null);
  const [galpao, setGalpao] = useState<Galpao | null>(null);
  const [acessos, setAcessos] = useState<AcessoGalpao[]>([]);
  const [carregandoAcesso, setCarregandoAcesso] = useState(false);
  const [nomeEdicao, setNomeEdicao] = useState("");
  const [tensaoEdicao, setTensaoEdicao] = useState("");
  const [correnteEdicao, setCorrenteEdicao] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [pendenteAcao, setPendenteAcao] = useState<string | null>(null);

  const recarregarAcessos = async (galpaoId: string) => {
    setAcessos(await listarAcessosDoGalpao(galpaoId));
  };

  const fechar = () => {
    setModal(null);
    setGalpao(null);
    setAcessos([]);
    setNomeEdicao("");
    setTensaoEdicao("");
    setCorrenteEdicao("");
    setErro("");
    setAviso("");
    setConfirmandoApagar(false);
    setPendenteAcao(null);
  };

  const abrirAcessos = async (alvo: Galpao) => {
    setGalpao(alvo);
    setAcessos([]);
    setCarregandoAcesso(true);
    setErro("");
    setPendenteAcao(null);
    setModal("acesso");
    try {
      const lista = await listarAcessosDoGalpao(alvo.id);
      setAcessos(lista);
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : "Não foi possível carregar quem tem acesso.";
      Alert.alert("Acesso", mensagem);
      setModal(null);
      setGalpao(null);
    } finally {
      setCarregandoAcesso(false);
    }
  };

  const abrirConfig = (alvo: Galpao) => {
    setGalpao(alvo);
    setNomeEdicao(alvo.nome);
    setTensaoEdicao(String(alvo.limiarTensao));
    setCorrenteEdicao(String(alvo.limiarCorrente));
    setErro("");
    setAviso("");
    setConfirmandoApagar(false);
    setModal("config");
  };

  const salvar = async () => {
    if (!galpao) {
      return;
    }

    try {
      setErro("");
      if (!nomeEdicao.trim()) {
        setErro("Informe o nome do galpão.");
        return;
      }
      const limiarTensao = parseLimiar(tensaoEdicao, "tensão");
      const limiarCorrente = parseLimiar(correnteEdicao, "corrente");
      setSalvando(true);
      const atualizado = await atualizarGalpao({
        galpaoId: galpao.id,
        nome: nomeEdicao,
        limiarTensao,
        limiarCorrente,
      });
      setGalpao(atualizado);
      setAviso("Alterações salvas.");
      setConfirmandoApagar(false);
      await opcoes.aoAtualizar?.(atualizado);
    } catch (error) {
      setErro(mensagemDeErro(error, "Não foi possível salvar o galpão."));
    } finally {
      setSalvando(false);
    }
  };

  const confirmarAcao = async (
    chave: string,
    executar: () => Promise<void>,
    mensagemErro: string
  ) => {
    if (!galpao) {
      return;
    }
    if (pendenteAcao !== chave) {
      setPendenteAcao(chave);
      setConfirmandoApagar(false);
      return;
    }

    try {
      setErro("");
      setSalvando(true);
      await executar();
      setPendenteAcao(null);
      await recarregarAcessos(galpao.id);
    } catch (error) {
      setErro(mensagemDeErro(error, mensagemErro));
    } finally {
      setSalvando(false);
    }
  };

  const confirmarRemover = (usuarioId: string) =>
    confirmarAcao(
      `remover:${usuarioId}`,
      () => removerAcessoDoGalpao(galpao!.id, usuarioId),
      "Não foi possível remover o acesso."
    );

  const confirmarAprovar = (usuarioId: string) =>
    confirmarAcao(
      `aprovar:${usuarioId}`,
      () => aprovarAcessoDoGalpao(galpao!.id, usuarioId),
      "Não foi possível aprovar o acesso."
    );

  const confirmarRecusar = (usuarioId: string) =>
    confirmarAcao(
      `recusar:${usuarioId}`,
      () => recusarAcessoDoGalpao(galpao!.id, usuarioId),
      "Não foi possível recusar o acesso."
    );

  const confirmarSair = async () => {
    if (!galpao) {
      return;
    }
    if (pendenteAcao !== "sair") {
      setPendenteAcao("sair");
      setConfirmandoApagar(false);
      return;
    }

    try {
      setErro("");
      setSalvando(true);
      await sairDoGalpao(galpao.id);
      fechar();
      await opcoes.aoAtualizar?.();
      opcoes.aoSair?.();
    } catch (error) {
      setErro(mensagemDeErro(error, "Não foi possível sair do galpão."));
    } finally {
      setSalvando(false);
    }
  };

  const confirmarApagar = async () => {
    if (!galpao) {
      return;
    }
    if (!confirmandoApagar) {
      setConfirmandoApagar(true);
      setPendenteAcao(null);
      return;
    }

    try {
      setErro("");
      setSalvando(true);
      await apagarGalpao(galpao.id);
      fechar();
      await opcoes.aoAtualizar?.();
      opcoes.aoApagar?.();
    } catch (error) {
      setErro(mensagemDeErro(error, "Não foi possível apagar o galpão."));
    } finally {
      setSalvando(false);
    }
  };

  const podeGerenciar = galpao ? usuarioPodeGerenciar(galpao) : false;
  const podeSair = Boolean(
    galpao && opcoes.usuarioId && !ehDono(galpao.papel)
  );
  const pedidoPendente = galpao?.statusAcesso === "pendente";

  const modais = (
    <>
      <Modal visible={modal === "acesso"} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Acesso — {galpao?.nome ?? "galpão"}
            </Text>
            {carregandoAcesso ? (
              <ActivityIndicator color="#333" />
            ) : acessos.length === 0 ? (
              <Text style={styles.emptyAcessoText}>
                Ninguém com acesso neste galpão.
              </Text>
            ) : (
              acessos.map((acesso) => (
                <View key={acesso.usuarioId} style={styles.acessoItem}>
                  <View style={styles.acessoInfo}>
                    <Text style={styles.acessoNome}>
                      {formatarLinhaAcesso(acesso)}
                    </Text>
                    {acesso.email ? (
                      <Text style={styles.acessoEmail}>{acesso.email}</Text>
                    ) : null}
                  </View>
                  {podeGerenciar && ehAcessoPendente(acesso) ? (
                    <View style={styles.acessoAcoes}>
                      <TouchableOpacity
                        onPress={() => void confirmarAprovar(acesso.usuarioId)}
                        disabled={salvando}
                        accessibilityLabel={`Aprovar acesso de ${acesso.nome}`}
                      >
                        <Text style={styles.aprovarText}>
                          {pendenteAcao === `aprovar:${acesso.usuarioId}`
                            ? "Confirmar"
                            : "Aprovar"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => void confirmarRecusar(acesso.usuarioId)}
                        disabled={salvando}
                        accessibilityLabel={`Recusar acesso de ${acesso.nome}`}
                      >
                        <Text style={styles.removerText}>
                          {pendenteAcao === `recusar:${acesso.usuarioId}`
                            ? "Confirmar"
                            : "Recusar"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {podeGerenciar &&
                  acesso.papel !== "dono" &&
                  !ehAcessoPendente(acesso) ? (
                    <TouchableOpacity
                      onPress={() => void confirmarRemover(acesso.usuarioId)}
                      disabled={salvando}
                      accessibilityLabel={`Remover acesso de ${acesso.nome}`}
                    >
                      <Text style={styles.removerText}>
                        {pendenteAcao === `remover:${acesso.usuarioId}`
                          ? "Confirmar"
                          : "Remover"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))
            )}
            {podeSair ? (
              <TouchableOpacity
                onPress={() => void confirmarSair()}
                disabled={salvando}
                accessibilityLabel={
                  pedidoPendente ? "Cancelar pedido de acesso" : "Sair do galpão"
                }
              >
                <Text style={styles.sairText}>
                  {pendenteAcao === "sair"
                    ? "Confirmar saída"
                    : pedidoPendente
                      ? "Cancelar pedido"
                      : "Sair do galpão"}
                </Text>
              </TouchableOpacity>
            ) : null}
            {erro && modal === "acesso" ? (
              <Text style={styles.erro}>{erro}</Text>
            ) : null}
            <TouchableOpacity onPress={fechar}>
              <Text style={styles.cancelText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modal === "config"} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                Configurações — {galpao?.nome ?? "galpão"}
              </Text>
              {galpao ? (
                <>
                  <Text style={styles.campoLabel}>Nome</Text>
                  {podeGerenciar ? (
                    <TextInput
                      style={styles.input}
                      placeholder="Nome do galpão"
                      placeholderTextColor="#555"
                      value={nomeEdicao}
                      onChangeText={(valor) => {
                        setNomeEdicao(valor);
                        setAviso("");
                        setErro("");
                      }}
                    />
                  ) : (
                    <Text style={styles.campoValor}>{galpao.nome}</Text>
                  )}
                  <Text style={styles.campoLabel}>Código</Text>
                  <Text style={styles.campoValor}>{galpao.codigo ?? "—"}</Text>
                  <Text style={styles.campoAjuda}>
                    O código de convite não pode ser alterado.
                  </Text>
                  <Text style={styles.campoLabel}>Limiar de tensão (V)</Text>
                  {podeGerenciar ? (
                    <TextInput
                      style={styles.input}
                      placeholder="Ex.: 3"
                      placeholderTextColor="#555"
                      keyboardType="decimal-pad"
                      value={tensaoEdicao}
                      onChangeText={(valor) => {
                        setTensaoEdicao(valor);
                        setAviso("");
                        setErro("");
                      }}
                    />
                  ) : (
                    <Text style={styles.campoValor}>{galpao.limiarTensao} V</Text>
                  )}
                  <Text style={styles.campoLabel}>Limiar de corrente (mA)</Text>
                  {podeGerenciar ? (
                    <TextInput
                      style={styles.input}
                      placeholder="Ex.: 50"
                      placeholderTextColor="#555"
                      keyboardType="decimal-pad"
                      value={correnteEdicao}
                      onChangeText={(valor) => {
                        setCorrenteEdicao(valor);
                        setAviso("");
                        setErro("");
                      }}
                    />
                  ) : (
                    <Text style={styles.campoValor}>
                      {galpao.limiarCorrente} mA
                    </Text>
                  )}
                </>
              ) : null}
              {erro && modal === "config" ? (
                <Text style={styles.erro}>{erro}</Text>
              ) : null}
              {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
              {podeGerenciar ? (
                <>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => void salvar()}
                    disabled={salvando}
                  >
                    {salvando ? (
                      <ActivityIndicator color="#f9ca0a" />
                    ) : (
                      <Text style={styles.primaryButtonText}>
                        Salvar alterações
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dangerButton}
                    onPress={() => void confirmarApagar()}
                    disabled={salvando}
                  >
                    <Text style={styles.dangerButtonText}>
                      {confirmandoApagar
                        ? "Confirmar exclusão"
                        : "Apagar galpão"}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
              <TouchableOpacity onPress={fechar}>
                <Text style={styles.cancelText}>Fechar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );

  return { abrirAcessos, abrirConfig, modais };
}

const styles = StyleSheet.create({
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
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  input: {
    height: 55,
    backgroundColor: "#f1f1f1",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  cancelText: {
    color: "#333",
    textAlign: "center",
    fontSize: 16,
    textDecorationLine: "underline",
    marginTop: 8,
  },
  emptyAcessoText: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
  },
  acessoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  acessoInfo: {
    flex: 1,
  },
  acessoAcoes: {
    alignItems: "flex-end",
    gap: 6,
  },
  acessoNome: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  acessoEmail: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  campoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginTop: 8,
    marginBottom: 6,
  },
  campoValor: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
  },
  campoAjuda: {
    fontSize: 12,
    color: "#777",
    marginBottom: 12,
  },
  erro: {
    color: "#8B0000",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  aviso: {
    color: "#333",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  removerText: {
    color: "#8B0000",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  aprovarText: {
    color: "#2E7D32",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  sairText: {
    color: "#8B0000",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: "#333",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 14,
  },
  primaryButtonText: {
    color: "#f9ca0a",
    fontSize: 16,
    fontWeight: "600",
  },
  dangerButton: {
    borderWidth: 2,
    borderColor: "#8B0000",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  dangerButtonText: {
    color: "#8B0000",
    fontSize: 16,
    fontWeight: "600",
  },
});
