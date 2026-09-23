import {
  buscarUltimaLeitura,
  listarGalpoesDoUsuario,
  notificarSensorOffline,
} from "@/lib/database";
import { acessoAprovado } from "@/lib/galpao";
import { statusGalpao } from "@/lib/status";
import { supabase } from "@/lib/supabase";
import type { Galpao, Leitura } from "@/lib/types";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

export function useGalpao(galpaoId: string | undefined, userId: string | undefined) {
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [ambienteSelecionado, setAmbienteSelecionado] = useState<Galpao | null>(
    null
  );
  const [leitura, setLeitura] = useState<Leitura | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [agora, setAgora] = useState(() => new Date());

  const carregarLeitura = useCallback(async (galpao: Galpao) => {
    const atual = await buscarUltimaLeitura(galpao.id);
    setLeitura(atual);
    const instante = new Date();
    setAgora(instante);
    if (
      statusGalpao(
        atual,
        galpao.limiarTensao,
        galpao.limiarCorrente,
        instante
      ).rotulo === "Offline"
    ) {
      void notificarSensorOffline(galpao.id).catch(() => undefined);
    }
  }, []);

  const recarregarGalpoes = useCallback(
    async (atualizado?: Galpao) => {
      if (!userId) {
        return;
      }
      const lista = await listarGalpoesDoUsuario(userId);
      setGalpoes(lista);
      if (atualizado) {
        setAmbienteSelecionado(atualizado);
        return;
      }
      setAmbienteSelecionado((atual) => {
        const visiveis = lista.filter(acessoAprovado);
        if (!atual) {
          return visiveis[0] ?? lista[0] ?? null;
        }
        return (
          lista.find((item) => item.id === atual.id) ?? visiveis[0] ?? null
        );
      });
    },
    [userId]
  );

  useEffect(() => {
    if (!userId) {
      return;
    }

    let ativo = true;

    (async () => {
      try {
        setCarregando(true);
        const lista = await listarGalpoesDoUsuario(userId);
        if (!ativo) {
          return;
        }
        setGalpoes(lista);
        const atual =
          lista.find((item) => item.id === galpaoId) ??
          lista.find(acessoAprovado) ??
          null;
        setAmbienteSelecionado(atual);
        if (atual && acessoAprovado(atual)) {
          await carregarLeitura(atual);
        }
      } catch (error) {
        const mensagem =
          error instanceof Error ? error.message : "Falha ao carregar o galpão.";
        Alert.alert("Galpão", mensagem);
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [userId, galpaoId, carregarLeitura]);

  useEffect(() => {
    const idSelecionado = ambienteSelecionado?.id;
    if (!idSelecionado || !acessoAprovado(ambienteSelecionado)) {
      return;
    }

    const channel = supabase.channel(`leituras-${idSelecionado}-${Date.now()}`);
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "leituras",
        filter: `galpao_id=eq.${idSelecionado}`,
      },
      (payload) => {
        setLeitura(payload.new as Leitura);
        setAgora(new Date());
      }
    );
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ambienteSelecionado]);

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const selecionarAmbiente = async (ambiente: Galpao) => {
    setAmbienteSelecionado(ambiente);
    if (!acessoAprovado(ambiente)) {
      setLeitura(null);
      return;
    }
    try {
      await carregarLeitura(ambiente);
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Falha ao atualizar leituras.";
      Alert.alert("Galpão", mensagem);
    }
  };

  return {
    galpoes,
    ambienteSelecionado,
    leitura,
    carregando,
    agora,
    recarregarGalpoes,
    selecionarAmbiente,
  };
}
