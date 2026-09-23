import { listarGalpoesDoUsuario, listarLeituras } from "@/lib/database";
import { extrairMudancas, type MudancaLeitura } from "@/lib/historico";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "expo-router";

export function useHistorico(
  userId: string | undefined,
  galpaoId: string | undefined
) {
  const [itens, setItens] = useState<MudancaLeitura[]>([]);
  const [carregando, setCarregando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      (async () => {
        if (!userId) {
          return;
        }

        try {
          setCarregando(true);
          const galpoes = await listarGalpoesDoUsuario(userId);
          const nomesPorGalpao = Object.fromEntries(
            galpoes.map((item) => [item.id, item.nome])
          );
          const limiaresPorGalpao = Object.fromEntries(
            galpoes.map((item) => [
              item.id,
              { tensao: item.limiarTensao, corrente: item.limiarCorrente },
            ])
          );

          const ids = galpaoId ? [galpaoId] : galpoes.map((item) => item.id);

          const leituras = (
            await Promise.all(ids.map((id) => listarLeituras(id)))
          ).flat();

          if (ativo) {
            setItens(
              extrairMudancas(leituras, nomesPorGalpao, limiaresPorGalpao)
            );
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
    }, [galpaoId, userId])
  );

  return { itens, carregando };
}
