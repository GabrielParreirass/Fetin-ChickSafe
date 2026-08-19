import {
  correnteOk,
  formatarCorrente,
  formatarTensao,
  rotuloEnergia,
  rotuloSituacao,
  tensaoOk,
} from "@/lib/status";
import type { Leitura } from "@/lib/types";

export type MudancaLeitura = {
  id: string;
  galpaoId: string;
  galpaoNome: string;
  campo: string;
  estadoAnterior: string;
  novoEstado: string;
  dataHora: Date;
};

function estadoEnergia(leitura: Leitura): string {
  return rotuloEnergia(leitura.energia);
}

function estadoTensao(leitura: Leitura): string {
  const tensao = Number(leitura.tensao);
  return `${rotuloSituacao(tensaoOk(tensao))} (${formatarTensao(tensao)})`;
}

function estadoCorrente(leitura: Leitura): string {
  const corrente = Number(leitura.corrente);
  return `${rotuloSituacao(correnteOk(corrente))} (${formatarCorrente(corrente)})`;
}

export function extrairMudancas(
  leituras: Leitura[],
  nomesPorGalpao: Record<string, string>
): MudancaLeitura[] {
  const porGalpao = new Map<string, Leitura[]>();

  const ordenadas = [...leituras].sort(
    (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
  );

  for (const leitura of ordenadas) {
    const lista = porGalpao.get(leitura.galpao_id) ?? [];
    lista.push(leitura);
    porGalpao.set(leitura.galpao_id, lista);
  }

  const mudancas: MudancaLeitura[] = [];

  for (const [galpaoId, lista] of porGalpao) {
    const galpaoNome = nomesPorGalpao[galpaoId] ?? "";
    for (let i = 1; i < lista.length; i++) {
      const anterior = lista[i - 1];
      const atual = lista[i];
      const dataHora = new Date(atual.criado_em);

      const pares: Array<[string, string, string]> = [
        ["Energia", estadoEnergia(anterior), estadoEnergia(atual)],
        ["Tensão da Bateria", estadoTensao(anterior), estadoTensao(atual)],
        ["Corrente do ventilador", estadoCorrente(anterior), estadoCorrente(atual)],
      ];

      for (const [campo, estadoAnterior, novoEstado] of pares) {
        if (estadoAnterior === novoEstado) {
          continue;
        }
        mudancas.push({
          id: `${atual.id}-${campo}`,
          galpaoId,
          galpaoNome,
          campo,
          estadoAnterior,
          novoEstado,
          dataHora,
        });
      }
    }
  }

  mudancas.sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime());
  return mudancas;
}
