import {
  extrairMudancas,
  filtrarMudancas,
  parseDataBr,
} from "@/lib/historico";
import type { Leitura } from "@/lib/types";

function leitura(
  parcial: Partial<Leitura> & Pick<Leitura, "id" | "galpao_id">
): Leitura {
  return {
    energia: "Fonte",
    tensao: 4,
    corrente: 80,
    criado_em: "2026-01-01T00:00:00.000Z",
    ...parcial,
  };
}

const GALPAO = "galpao-1";
const NOMES = { [GALPAO]: "Galpão Norte" };

describe("extrairMudancas", () => {
  it("retorna vazio sem leituras ou com uma só leitura", () => {
    expect(extrairMudancas([], NOMES)).toEqual([]);
    expect(
      extrairMudancas([leitura({ id: 1, galpao_id: GALPAO })], NOMES)
    ).toEqual([]);
  });

  it("ignora leituras consecutivas iguais", () => {
    const leituras = [
      leitura({ id: 1, galpao_id: GALPAO, criado_em: "2026-01-01T10:00:00.000Z" }),
      leitura({ id: 2, galpao_id: GALPAO, criado_em: "2026-01-01T10:01:00.000Z" }),
    ];

    expect(extrairMudancas(leituras, NOMES)).toEqual([]);
  });

  it("detecta troca de energia", () => {
    const leituras = [
      leitura({
        id: 1,
        galpao_id: GALPAO,
        energia: "Fonte",
        criado_em: "2026-01-01T10:00:00.000Z",
      }),
      leitura({
        id: 2,
        galpao_id: GALPAO,
        energia: "Bateria",
        criado_em: "2026-01-01T10:01:00.000Z",
      }),
    ];

    const mudancas = extrairMudancas(leituras, NOMES);

    expect(mudancas).toHaveLength(1);
    expect(mudancas[0].galpaoNome).toBe("Galpão Norte");
    expect(mudancas[0].campos.find((parte) => parte.campo === "Energia")).toMatchObject({
      anterior: "Fonte",
      novo: "Bateria",
      mudou: true,
    });
  });

  it("detecta cruzamento do limiar de tensão", () => {
    const leituras = [
      leitura({
        id: 1,
        galpao_id: GALPAO,
        tensao: 2.9,
        criado_em: "2026-01-01T10:00:00.000Z",
      }),
      leitura({
        id: 2,
        galpao_id: GALPAO,
        tensao: 3.1,
        criado_em: "2026-01-01T10:01:00.000Z",
      }),
    ];

    const mudancas = extrairMudancas(leituras, NOMES);
    const tensao = mudancas[0]?.campos.find(
      (parte) => parte.campo === "Tensão da Bateria"
    );

    expect(mudancas).toHaveLength(1);
    expect(tensao?.anterior).toBe("Alerta (2.9 V)");
    expect(tensao?.novo).toBe("Normal (3.1 V)");
  });

  it("detecta cruzamento do limiar de corrente", () => {
    const leituras = [
      leitura({
        id: 1,
        galpao_id: GALPAO,
        corrente: 40,
        criado_em: "2026-01-01T10:00:00.000Z",
      }),
      leitura({
        id: 2,
        galpao_id: GALPAO,
        corrente: 80,
        criado_em: "2026-01-01T10:01:00.000Z",
      }),
    ];

    const mudancas = extrairMudancas(leituras, NOMES);
    const corrente = mudancas[0]?.campos.find(
      (parte) => parte.campo === "Corrente do ventilador"
    );

    expect(mudancas).toHaveLength(1);
    expect(corrente?.anterior).toBe("Crítico (40 mA)");
    expect(corrente?.novo).toBe("Crítico (80 mA)");
  });

  it("ordena pela leitura mais recente mesmo se a entrada vier fora de ordem", () => {
    const leituras = [
      leitura({
        id: 2,
        galpao_id: GALPAO,
        energia: "Bateria",
        criado_em: "2026-01-01T11:00:00.000Z",
      }),
      leitura({
        id: 1,
        galpao_id: GALPAO,
        energia: "Fonte",
        criado_em: "2026-01-01T10:00:00.000Z",
      }),
    ];

    const mudancas = extrairMudancas(leituras, NOMES);

    expect(mudancas[0].dataHora.toISOString()).toBe("2026-01-01T11:00:00.000Z");
    expect(mudancas[0].campos[0].anterior).toBe("Fonte");
    expect(mudancas[0].campos[0].novo).toBe("Bateria");
  });

  it("não mistura leituras de galpões diferentes", () => {
    const outro = "galpao-2";
    const leituras = [
      leitura({
        id: 1,
        galpao_id: GALPAO,
        energia: "Fonte",
        criado_em: "2026-01-01T10:00:00.000Z",
      }),
      leitura({
        id: 2,
        galpao_id: outro,
        energia: "Bateria",
        criado_em: "2026-01-01T10:01:00.000Z",
      }),
    ];

    expect(
      extrairMudancas(leituras, { [GALPAO]: "Norte", [outro]: "Sul" })
    ).toEqual([]);
  });

  it("usa nome vazio quando o galpão não está no mapa", () => {
    const leituras = [
      leitura({
        id: 1,
        galpao_id: GALPAO,
        energia: "Fonte",
        criado_em: "2026-01-01T10:00:00.000Z",
      }),
      leitura({
        id: 2,
        galpao_id: GALPAO,
        energia: "Bateria",
        criado_em: "2026-01-01T10:01:00.000Z",
      }),
    ];

    expect(extrairMudancas(leituras, {})[0].galpaoNome).toBe("");
  });

  it("usa limiares do galpão para classificar tensão e corrente", () => {
    const leituras = [
      leitura({
        id: 1,
        galpao_id: GALPAO,
        tensao: 3.5,
        corrente: 60,
        criado_em: "2026-01-01T10:00:00.000Z",
      }),
      leitura({
        id: 2,
        galpao_id: GALPAO,
        tensao: 4.5,
        corrente: 90,
        criado_em: "2026-01-01T10:01:00.000Z",
      }),
    ];

    const mudancas = extrairMudancas(leituras, NOMES, {
      [GALPAO]: { tensao: 4, corrente: 80 },
    });

    const registro = mudancas[0];
    expect(
      registro.campos.find((parte) => parte.campo === "Tensão da Bateria")
    ).toMatchObject({
      anterior: "Alerta (3.5 V)",
      novo: "Normal (4.5 V)",
    });
    expect(
      registro.campos.find((parte) => parte.campo === "Corrente do ventilador")
    ).toMatchObject({
      anterior: "Crítico (60 mA)",
      novo: "Crítico (90 mA)",
    });
  });
});

describe("parseDataBr", () => {
  it("aceita data válida e rejeita inválida", () => {
    expect(parseDataBr("01/01/2026")?.getFullYear()).toBe(2026);
    expect(parseDataBr("31/02/2026")).toBeNull();
    expect(parseDataBr("2026-01-01")).toBeNull();
    expect(parseDataBr("")).toBeNull();
  });
});

describe("filtrarMudancas", () => {
  const base = extrairMudancas(
    [
      leitura({
        id: 1,
        galpao_id: GALPAO,
        energia: "Fonte",
        tensao: 4,
        corrente: 80,
        criado_em: "2026-01-01T10:00:00.000Z",
      }),
      leitura({
        id: 2,
        galpao_id: GALPAO,
        energia: "Bateria",
        tensao: 2.5,
        corrente: 20,
        criado_em: "2026-01-01T10:05:00.000Z",
      }),
    ],
    NOMES
  );

  it("filtra pelo campo que mudou", () => {
    expect(filtrarMudancas(base, { campo: "energia" })).toHaveLength(1);
    expect(filtrarMudancas(base, { campo: "tensao" })).toHaveLength(1);
    expect(filtrarMudancas(base, { campo: "corrente" })).toHaveLength(1);
  });

  it("filtra pelo intervalo de datas", () => {
    expect(
      filtrarMudancas(base, { dataInicio: parseDataBr("02/01/2026") })
    ).toEqual([]);
    expect(
      filtrarMudancas(base, {
        dataInicio: parseDataBr("01/01/2026"),
        dataFim: parseDataBr("01/01/2026"),
      })
    ).toHaveLength(1);
  });
});

