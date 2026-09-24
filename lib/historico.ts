import {
  entrouEmAlerta,
  voltouAoNormal,
  faixaCorrente,
  formatarCorrente,
  formatarTensao,
  LIMIAR_TENSAO_V,
  rotuloEnergia,
  rotuloFaixaCorrente,
  rotuloSituacao,
  tensaoOk,
} from "@/lib/status";
import type { Leitura } from "@/lib/types";

export const CAMPO_ENERGIA = "Energia";
export const CAMPO_TENSAO = "Tensão da Bateria";
export const CAMPO_CORRENTE = "Corrente do ventilador";

export type CampoMudanca =
  | typeof CAMPO_ENERGIA
  | typeof CAMPO_TENSAO
  | typeof CAMPO_CORRENTE;

export type FiltroCampoMudanca = "todos" | "energia" | "tensao" | "corrente";

export type LimiaresGalpao = {
  tensao: number;
  corrente: number;
};

export type CampoRegistro = {
  campo: CampoMudanca;
  anterior: string;
  novo: string;
  mudou: boolean;
};

export type MudancaLeitura = {
  id: string;
  galpaoId: string;
  galpaoNome: string;
  dataHora: Date;
  campos: CampoRegistro[];
  entrouEmAlerta: boolean;
  voltouAoNormal: boolean;
};

export type FiltroHistorico = {
  campo?: FiltroCampoMudanca;
  dataInicio?: Date | null;
  dataFim?: Date | null;
};

const LIMIARES_PADRAO: LimiaresGalpao = {
  tensao: LIMIAR_TENSAO_V,
  corrente: 0,
};

const CAMPO_POR_FILTRO: Record<Exclude<FiltroCampoMudanca, "todos">, CampoMudanca> =
  {
    energia: CAMPO_ENERGIA,
    tensao: CAMPO_TENSAO,
    corrente: CAMPO_CORRENTE,
  };

function estadoEnergia(leitura: Leitura): string {
  return rotuloEnergia(leitura.energia);
}

function estadoTensao(leitura: Leitura, limiar: number): string {
  const tensao = Number(leitura.tensao);
  return `${rotuloSituacao(tensaoOk(tensao, limiar))} (${formatarTensao(tensao)})`;
}

function estadoCorrente(leitura: Leitura): string {
  const corrente = Number(leitura.corrente);
  const rotulo = rotuloFaixaCorrente(faixaCorrente(corrente));
  return `${rotulo} (${formatarCorrente(corrente)})`;
}

export function parseDataBr(texto: string): Date | null {
  const trimmed = texto.trim();
  if (!trimmed) {
    return null;
  }

  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const ano = Number(match[3]);
  const data = new Date(ano, mes - 1, dia);

  if (
    data.getFullYear() !== ano ||
    data.getMonth() !== mes - 1 ||
    data.getDate() !== dia
  ) {
    return null;
  }

  return data;
}

export function inicioDoDia(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 0, 0, 0, 0);
}

export function fimDoDia(data: Date): Date {
  return new Date(
    data.getFullYear(),
    data.getMonth(),
    data.getDate(),
    23,
    59,
    59,
    999
  );
}

export function filtrarMudancas(
  mudancas: MudancaLeitura[],
  filtro: FiltroHistorico = {}
): MudancaLeitura[] {
  const campo =
    filtro.campo && filtro.campo !== "todos"
      ? CAMPO_POR_FILTRO[filtro.campo]
      : null;
  const de = filtro.dataInicio ? inicioDoDia(filtro.dataInicio) : null;
  const ate = filtro.dataFim ? fimDoDia(filtro.dataFim) : null;

  return mudancas.filter((item) => {
    if (campo && !item.campos.some((parte) => parte.campo === campo && parte.mudou)) {
      return false;
    }
    if (de && item.dataHora < de) {
      return false;
    }
    if (ate && item.dataHora > ate) {
      return false;
    }
    return true;
  });
}

export function extrairMudancas(
  leituras: Leitura[],
  nomesPorGalpao: Record<string, string>,
  limiaresPorGalpao: Record<string, LimiaresGalpao> = {}
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
    const limiares = limiaresPorGalpao[galpaoId] ?? LIMIARES_PADRAO;
    for (let i = 1; i < lista.length; i++) {
      const anterior = lista[i - 1];
      const atual = lista[i];
      const dataHora = new Date(atual.criado_em);

      const energiaAnterior = estadoEnergia(anterior);
      const energiaNova = estadoEnergia(atual);
      const tensaoAnterior = estadoTensao(anterior, limiares.tensao);
      const tensaoNova = estadoTensao(atual, limiares.tensao);
      const correnteAnterior = estadoCorrente(anterior);
      const correnteNova = estadoCorrente(atual);
      const campos: CampoRegistro[] = [
        {
          campo: CAMPO_ENERGIA,
          anterior: energiaAnterior,
          novo: energiaNova,
          mudou: energiaAnterior !== energiaNova,
        },
        {
          campo: CAMPO_TENSAO,
          anterior: tensaoAnterior,
          novo: tensaoNova,
          mudou: tensaoAnterior !== tensaoNova,
        },
        {
          campo: CAMPO_CORRENTE,
          anterior: correnteAnterior,
          novo: correnteNova,
          mudou: correnteAnterior !== correnteNova,
        },
      ];

      if (!campos.some((parte) => parte.mudou)) {
        continue;
      }

      mudancas.push({
        id: String(atual.id),
        galpaoId,
        galpaoNome,
        dataHora,
        campos,
        entrouEmAlerta: entrouEmAlerta(atual, anterior, limiares.tensao),
        voltouAoNormal: voltouAoNormal(atual, anterior, limiares.tensao),
      });
    }
  }

  mudancas.sort((a, b) => b.dataHora.getTime() - a.dataHora.getTime());
  return mudancas;
}
