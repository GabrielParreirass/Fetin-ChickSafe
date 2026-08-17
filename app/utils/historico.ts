export type HistoricoItem = {
  id: string;
  campo: string;
  estadoAnterior: string;
  novoEstado: string;
  dataHora: Date;
  galpaoId: number;
  galpaoNome: string;
};

const historico: HistoricoItem[] = [];

export function registrarHistorico(
  campo: string,
  estadoAnterior: string,
  novoEstado: string,
  dataHora: Date = new Date(),
  galpao?: { id: number; nome: string }
): HistoricoItem {
  const item: HistoricoItem = {
    id: `${dataHora.getTime()}-${Math.random().toString(16).slice(2, 8)}`,
    campo,
    estadoAnterior,
    novoEstado,
    dataHora,
    galpaoId: galpao?.id ?? 0,
    galpaoNome: galpao?.nome ?? "",
  };

  historico.unshift(item);
  return item;
}

export function getHistorico(galpaoId?: number): HistoricoItem[] {
  if (galpaoId == null) {
    return [...historico];
  }

  return historico.filter((item) => item.galpaoId === galpaoId);
}

export function formatarDataHora(dataHora: Date): string {
  return dataHora.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
