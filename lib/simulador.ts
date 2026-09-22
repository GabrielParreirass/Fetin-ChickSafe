import { supabase } from "@/lib/supabase";
import type { Energia, Galpao, Leitura } from "@/lib/types";

const NOMES_SIMULACAO = new Set(["teste1", "teste2"]);

export function galpoesParaSimular(galpoes: Galpao[]): Galpao[] {
  return galpoes.filter((galpao) =>
    NOMES_SIMULACAO.has(galpao.nome.trim().toLowerCase().replace(/\s+/g, ""))
  );
}

export function gerarLeituraEsp32(galpaoId: string): Omit<Leitura, "id" | "criado_em"> {
  const energia: Energia = Math.random() < 0.5 ? "Fonte" : "Bateria";
  const tensao = Number((Math.random() * 5).toFixed(2));
  const corrente = Math.round(Math.random() * 120);

  return {
    galpao_id: galpaoId,
    energia,
    tensao,
    corrente,
  };
}

export async function publicarLeituraEsp32(
  leitura: Omit<Leitura, "id" | "criado_em">
): Promise<Leitura> {
  const { data, error } = await supabase
    .from("leituras")
    .insert({
      galpao_id: leitura.galpao_id,
      energia: leitura.energia,
      tensao: leitura.tensao,
      corrente: leitura.corrente,
    })
    .select("id, galpao_id, energia, tensao, corrente, criado_em")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function simularTickEsp32(galpoes: Galpao[]): Promise<Leitura> {
  const alvos = galpoesParaSimular(galpoes);
  if (alvos.length === 0) {
    throw new Error(
      "Crie os galpões Teste1 e Teste2 para o simulador (nomes exatamente esses)."
    );
  }

  const escolhido = alvos[Math.floor(Math.random() * alvos.length)];
  return publicarLeituraEsp32(gerarLeituraEsp32(escolhido.id));
}

export function galpaoParaTesteAlerta(galpoes: Galpao[]): Galpao | null {
  return galpoes.find((galpao) => galpao.statusAcesso === "aprovado") ?? null;
}

export function leituraNormalDeTeste(
  galpao: Pick<Galpao, "id" | "limiarTensao" | "limiarCorrente">
): Omit<Leitura, "id" | "criado_em"> {
  return {
    galpao_id: galpao.id,
    energia: "Fonte",
    tensao: Number(galpao.limiarTensao) + 1,
    corrente: Number(galpao.limiarCorrente) + 10,
  };
}

export function leituraAlertaDeTeste(
  galpao: Pick<Galpao, "id" | "limiarTensao" | "limiarCorrente">
): Omit<Leitura, "id" | "criado_em"> {
  return {
    galpao_id: galpao.id,
    energia: "Bateria",
    tensao: 0,
    corrente: 0,
  };
}

export async function publicarEntradaEmAlerta(galpao: Galpao): Promise<Leitura> {
  await publicarLeituraEsp32(leituraNormalDeTeste(galpao));
  return publicarLeituraEsp32(leituraAlertaDeTeste(galpao));
}
