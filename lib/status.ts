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

export type StatusGeral = {
  ok: boolean;
  rotulo: "Normal" | "Alerta" | "Sem dados";
};

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

export function resumoLeitura(leitura: {
  energia: string;
  tensao: number | string;
  corrente: number | string;
}): string {
  return `${rotuloEnergia(leitura.energia)} · ${formatarTensao(Number(leitura.tensao))} · ${formatarCorrente(Number(leitura.corrente))}`;
}
