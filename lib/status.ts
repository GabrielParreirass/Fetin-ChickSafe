import { cores } from "@/constants/tema";

export const LIMIAR_TENSAO_V = 3;
export const LIMIAR_CORRENTE_MA = 50;
export const CORRENTE_CRITICA_MA = 100;
export const CORRENTE_ALERTA_MAX_MA = 200;

export type FaixaCorrente = "normal" | "alerta" | "critico";

export function faixaCorrente(correnteMa: number): FaixaCorrente {
  if (correnteMa < CORRENTE_CRITICA_MA) {
    return "critico";
  }
  if (correnteMa <= CORRENTE_ALERTA_MAX_MA) {
    return "alerta";
  }
  return "normal";
}

export function rotuloFaixaCorrente(
  faixa: FaixaCorrente
): "Normal" | "Alerta" | "Crítico" {
  if (faixa === "critico") {
    return "Crítico";
  }
  if (faixa === "alerta") {
    return "Alerta";
  }
  return "Normal";
}

export function corFaixaCorrente(faixa: FaixaCorrente): string {
  if (faixa === "critico") {
    return cores.critico;
  }
  if (faixa === "alerta") {
    return cores.alerta;
  }
  return cores.normal;
}

export function energiaEhFonte(energia: string): boolean {
  return energia === "Fonte" || energia === "USB";
}

export function rotuloEnergia(energia: string): "Fonte" | "Bateria" {
  return energiaEhFonte(energia) ? "Fonte" : "Bateria";
}

export function tensaoOk(
  tensaoV: number,
  limiar: number = LIMIAR_TENSAO_V
): boolean {
  return tensaoV > limiar;
}

export function correnteOk(correnteMa: number): boolean {
  return faixaCorrente(correnteMa) === "normal";
}

export function rotuloSituacao(ok: boolean): string {
  return ok ? "Normal" : "Alerta";
}

export function formatarTensao(tensaoV: number): string {
  return `${tensaoV.toFixed(1)} V`;
}

export function formatarCorrente(correnteMa: number): string {
  return `${Math.round(correnteMa)} mA`;
}

export const MINUTOS_SEM_SINAL = 60;

export type RotuloStatus =
  | "Normal"
  | "Alerta"
  | "Crítico"
  | "Sem dados"
  | "Offline";

export type StatusGeral = {
  ok: boolean;
  rotulo: RotuloStatus;
};

export function sensorOffline(
  criadoEm: string | null | undefined,
  agora: Date = new Date(),
  minutos: number = MINUTOS_SEM_SINAL
): boolean {
  if (!criadoEm) {
    return false;
  }
  const data = new Date(criadoEm);
  if (Number.isNaN(data.getTime())) {
    return false;
  }
  return agora.getTime() - data.getTime() >= minutos * 60 * 1000;
}

export function minutosSemSinal(
  criadoEm: string,
  agora: Date = new Date()
): number {
  const data = new Date(criadoEm);
  if (Number.isNaN(data.getTime())) {
    return 0;
  }
  return Math.max(0, Math.floor((agora.getTime() - data.getTime()) / 60_000));
}

export function formatarTempoSemSinal(
  criadoEm: string,
  agora: Date = new Date()
): string {
  const minutos = minutosSemSinal(criadoEm, agora);
  if (minutos < 60) {
    return `há ${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  if (horas < 24) {
    return `há ${horas} h`;
  }
  return `há ${Math.floor(horas / 24)} d`;
}

export function corRotuloStatus(rotulo: RotuloStatus): string {
  if (rotulo === "Normal") {
    return cores.normal;
  }
  if (rotulo === "Alerta") {
    return cores.alerta;
  }
  if (rotulo === "Crítico") {
    return cores.critico;
  }
  if (rotulo === "Offline") {
    return cores.offline;
  }
  return cores.semDados;
}

export function statusGeralLeitura(
  leitura: {
    energia: string;
    tensao: number | string;
    corrente: number | string;
  } | null,
  limiarTensao: number = LIMIAR_TENSAO_V,
  _limiarCorrente: number = LIMIAR_CORRENTE_MA
): StatusGeral {
  if (!leitura) {
    return { ok: false, rotulo: "Sem dados" };
  }

  const faixa = faixaCorrente(Number(leitura.corrente));
  const energiaOuTensaoRuim =
    rotuloEnergia(leitura.energia) !== "Fonte" ||
    !tensaoOk(Number(leitura.tensao), limiarTensao);

  if (faixa === "critico") {
    return { ok: false, rotulo: "Crítico" };
  }
  if (faixa === "alerta" || energiaOuTensaoRuim) {
    return { ok: false, rotulo: "Alerta" };
  }
  return { ok: true, rotulo: "Normal" };
}

export function statusGalpao(
  leitura: {
    energia: string;
    tensao: number | string;
    corrente: number | string;
    criado_em?: string;
  } | null,
  limiarTensao: number = LIMIAR_TENSAO_V,
  limiarCorrente: number = LIMIAR_CORRENTE_MA,
  agora: Date = new Date()
): StatusGeral {
  if (!leitura) {
    return { ok: false, rotulo: "Sem dados" };
  }
  if (sensorOffline(leitura.criado_em, agora)) {
    return { ok: false, rotulo: "Offline" };
  }
  return statusGeralLeitura(leitura, limiarTensao, limiarCorrente);
}

export function entrouEmAlerta(
  atual: {
    energia: string;
    tensao: number | string;
    corrente: number | string;
  } | null,
  anterior: {
    energia: string;
    tensao: number | string;
    corrente: number | string;
  } | null,
  limiarTensao: number = LIMIAR_TENSAO_V,
  limiarCorrente: number = LIMIAR_CORRENTE_MA
): boolean {
  const rotuloAtual = statusGeralLeitura(
    atual,
    limiarTensao,
    limiarCorrente
  ).rotulo;
  if (rotuloAtual !== "Alerta" && rotuloAtual !== "Crítico") {
    return false;
  }
  const rotuloAnterior = statusGeralLeitura(
    anterior,
    limiarTensao,
    limiarCorrente
  ).rotulo;
  return rotuloAnterior !== "Alerta" && rotuloAnterior !== "Crítico";
}

export function voltouAoNormal(
  atual: {
    energia: string;
    tensao: number | string;
    corrente: number | string;
  } | null,
  anterior: {
    energia: string;
    tensao: number | string;
    corrente: number | string;
  } | null,
  limiarTensao: number = LIMIAR_TENSAO_V,
  limiarCorrente: number = LIMIAR_CORRENTE_MA
): boolean {
  if (statusGeralLeitura(atual, limiarTensao, limiarCorrente).rotulo !== "Normal") {
    return false;
  }
  const rotuloAnterior = statusGeralLeitura(
    anterior,
    limiarTensao,
    limiarCorrente
  ).rotulo;
  return rotuloAnterior === "Alerta" || rotuloAnterior === "Crítico";
}

export function resumoLeitura(leitura: {
  energia: string;
  tensao: number | string;
  corrente: number | string;
}): string {
  return `${rotuloEnergia(leitura.energia)} · ${formatarTensao(Number(leitura.tensao))} · ${formatarCorrente(Number(leitura.corrente))}`;
}
