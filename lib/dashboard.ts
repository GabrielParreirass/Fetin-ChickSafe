import type { Leitura } from "@/lib/types";
import {
  correnteOk,
  rotuloEnergia,
  tensaoOk,
} from "@/lib/status";

export type PontoGrafico = {
  value: number;
  label: string;
};

export type ResumoDashboard = {
  total: number;
  mediaTensao: number;
  minTensao: number;
  maxTensao: number;
  mediaCorrente: number;
  minCorrente: number;
  maxCorrente: number;
  leiturasFonte: number;
  leiturasBateria: number;
  percentualBateria: number;
  leiturasAlerta: number;
  percentualAlerta: number;
};

const MAX_PONTOS = 40;

export function leiturasCronologicas(leituras: Leitura[]): Leitura[] {
  return [...leituras].sort((a, b) => a.criado_em.localeCompare(b.criado_em));
}

export function reduzirSerie<T>(itens: T[], max = MAX_PONTOS): T[] {
  if (itens.length <= max) {
    return itens;
  }
  const passo = (itens.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => itens[Math.round(i * passo)]);
}

export function formatarHoraLeitura(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) {
    return "";
  }
  return data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rotuloPonto(iso: string, indice: number, total: number): string {
  if (indice === 0 || indice === total - 1) {
    return formatarHoraLeitura(iso);
  }
  return "";
}

export function pontosTensao(leituras: Leitura[]): PontoGrafico[] {
  const serie = reduzirSerie(leiturasCronologicas(leituras));
  return serie.map((item, indice) => ({
    value: Number(item.tensao),
    label: rotuloPonto(item.criado_em, indice, serie.length),
  }));
}

export function pontosCorrente(leituras: Leitura[]): PontoGrafico[] {
  const serie = reduzirSerie(leiturasCronologicas(leituras));
  return serie.map((item, indice) => ({
    value: Number(item.corrente),
    label: rotuloPonto(item.criado_em, indice, serie.length),
  }));
}

export function resumoDashboard(
  leituras: Leitura[],
  limiarTensao: number,
  limiarCorrente: number
): ResumoDashboard | null {
  if (leituras.length === 0) {
    return null;
  }

  const tensoes = leituras.map((item) => Number(item.tensao));
  const correntes = leituras.map((item) => Number(item.corrente));
  const leiturasFonte = leituras.filter(
    (item) => rotuloEnergia(item.energia) === "Fonte"
  ).length;
  const leiturasBateria = leituras.length - leiturasFonte;
  const leiturasAlerta = leituras.filter((item) => {
    return (
      rotuloEnergia(item.energia) !== "Fonte" ||
      !tensaoOk(Number(item.tensao), limiarTensao) ||
      !correnteOk(Number(item.corrente), limiarCorrente)
    );
  }).length;

  const soma = (valores: number[]) =>
    valores.reduce((total, valor) => total + valor, 0);

  return {
    total: leituras.length,
    mediaTensao: soma(tensoes) / tensoes.length,
    minTensao: Math.min(...tensoes),
    maxTensao: Math.max(...tensoes),
    mediaCorrente: soma(correntes) / correntes.length,
    minCorrente: Math.min(...correntes),
    maxCorrente: Math.max(...correntes),
    leiturasFonte,
    leiturasBateria,
    percentualBateria: (leiturasBateria / leituras.length) * 100,
    leiturasAlerta,
    percentualAlerta: (leiturasAlerta / leituras.length) * 100,
  };
}

export function fatiasEnergia(resumo: ResumoDashboard): Array<{
  value: number;
  text: string;
  color: string;
}> {
  return [
    {
      value: resumo.leiturasFonte,
      text: "Fonte",
      color: "#4CAF50",
    },
    {
      value: resumo.leiturasBateria,
      text: "Bateria",
      color: "#F44336",
    },
  ].filter((fatia) => fatia.value > 0);
}
