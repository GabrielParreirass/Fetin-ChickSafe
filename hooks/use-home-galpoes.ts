import {
  buscarLeiturasAprovadas,
  listarGalpoesDoUsuario,
  notificarSensorOffline,
} from "@/lib/database";
import { acessoAprovado } from "@/lib/galpao";
import { statusGalpao } from "@/lib/status";
import { supabase } from "@/lib/supabase";
import type { Galpao, Leitura } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

export function useHomeGalpoes(userId: string | undefined) {
  const [galpoes, setGalpoes] = useState<Galpao[]>([]);
  const [leituras, setLeituras] = useState<Record<string, Leitura | null>>({});
  const [carregando, setCarregando] = useState(true);
  const [agora, setAgora] = useState(() => new Date());
  const galpoesRef = useRef<Galpao[]>([]);

  useEffect(() => {
    galpoesRef.current = galpoes;
  }, [galpoes]);

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const carregar = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      setCarregando(true);
      const lista = await listarGalpoesDoUsuario(userId);
      const atuais = await buscarLeiturasAprovadas(lista);
      setGalpoes(lista);
      galpoesRef.current = lista;
      setLeituras(atuais);
      setAgora(new Date());
      const instante = new Date();
      await Promise.all(
        lista
          .filter(acessoAprovado)
          .filter((item) => {
            const leitura = atuais[item.id] ?? null;
            return (
              statusGalpao(
                leitura,
                item.limiarTensao,
                item.limiarCorrente,
                instante
              ).rotulo === "Offline"
            );
          })
          .map((item) =>
            notificarSensorOffline(item.id).catch(() => undefined)
          )
      );
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Falha ao carregar galpões.";
      Alert.alert("Galpões", mensagem);
    } finally {
      setCarregando(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase.channel(`home-leituras-${userId}`);
    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "leituras",
      },
      (payload) => {
        const nova = payload.new as Leitura;
        const galpao = galpoesRef.current.find(
          (item) => item.id === nova.galpao_id && acessoAprovado(item)
        );
        if (!galpao) {
          return;
        }
        setLeituras((atual) => ({ ...atual, [nova.galpao_id]: nova }));
        setAgora(new Date());
      }
    );
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return { galpoes, leituras, carregando, agora, carregar };
}
