export const LIMIAR_TENSAO_V = 3;
export const LIMIAR_CORRENTE_MA = 50;

export function energiaEhFonte(energia: string): boolean {
  return energia === "Fonte" || energia === "USB";
}

export function rotuloEnergia(energia: string): "Fonte" | "Bateria" {
  return energiaEhFonte(energia) ? "Fonte" : "Bateria";
}

export function tensaoOk(tensaoV: number): boolean {
  return tensaoV > LIMIAR_TENSAO_V;
}

export function correnteOk(correnteMa: number): boolean {
  return correnteMa > LIMIAR_CORRENTE_MA;
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
