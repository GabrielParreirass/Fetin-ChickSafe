export const LIMIAR_TENSAO_V = 3;
export const LIMIAR_CORRENTE_MA = 50;

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

export function correnteOk(
  correnteMa: number,
  limiar: number = LIMIAR_CORRENTE_MA
): boolean {
  return correnteMa > limiar;
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

export const MINUTOS_SEM_SINAL = 5;

export type RotuloStatus = "Normal" | "Alerta" | "Sem dados" | "Offline";

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
    return "#4CAF50";
  }
  if (rotulo === "Alerta") {
    return "#F44336";
  }
  if (rotulo === "Offline") {
    return "#FF9800";
  }
  return "#9E9E9E";
}

export function statusGeralLeitura(
  leitura: {
    energia: string;
    tensao: number | string;
    corrente: number | string;
  } | null,
  limiarTensao: number = LIMIAR_TENSAO_V,
  limiarCorrente: number = LIMIAR_CORRENTE_MA
): StatusGeral {
  if (!leitura) {
    return { ok: false, rotulo: "Sem dados" };
  }

  const ok =
    rotuloEnergia(leitura.energia) === "Fonte" &&
    tensaoOk(Number(leitura.tensao), limiarTensao) &&
    correnteOk(Number(leitura.corrente), limiarCorrente);

  return { ok, rotulo: ok ? "Normal" : "Alerta" };
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
  if (statusGeralLeitura(atual, limiarTensao, limiarCorrente).rotulo !== "Alerta") {
    return false;
  }
  return (
    statusGeralLeitura(anterior, limiarTensao, limiarCorrente).rotulo !== "Alerta"
  );
}

export function resumoLeitura(leitura: {
  energia: string;
  tensao: number | string;
  corrente: number | string;
}): string {
  return `${rotuloEnergia(leitura.energia)} · ${formatarTensao(Number(leitura.tensao))} · ${formatarCorrente(Number(leitura.corrente))}`;
}
