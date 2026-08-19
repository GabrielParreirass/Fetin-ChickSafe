import { ehDono } from "@/lib/acesso";
import { LIMIAR_CORRENTE_MA, LIMIAR_TENSAO_V } from "@/lib/status";
import type { Galpao, GalpaoRow } from "@/lib/types";

export function numeroLimiar(
  valor: number | string | null | undefined,
  padrao: number
): number {
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : padrao;
}

export function mapearGalpao(
  row: GalpaoRow | Galpao | null | undefined,
  papel?: string
): Galpao | null {
  if (row == null) {
    return null;
  }

  return {
    id: row.id,
    nome: row.nome,
    codigo: row.codigo,
    limiarTensao: numeroLimiar(
      "limiar_tensao" in row ? row.limiar_tensao : row.limiarTensao,
      LIMIAR_TENSAO_V
    ),
    limiarCorrente: numeroLimiar(
      "limiar_corrente" in row ? row.limiar_corrente : row.limiarCorrente,
      LIMIAR_CORRENTE_MA
    ),
    papel: papel ?? row.papel ?? "operador",
  };
}

export function usuarioPodeGerenciar(galpao: Pick<Galpao, "papel">): boolean {
  return ehDono(galpao.papel);
}

export function parseLimiar(valor: string, rotulo: string): number {
  const n = Number(String(valor).trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Informe um valor válido de ${rotulo}.`);
  }
  return n;
}
