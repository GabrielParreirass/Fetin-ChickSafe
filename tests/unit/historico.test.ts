import { extrairMudancas } from "@/lib/historico";
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
    expect(mudancas[0]).toMatchObject({
      campo: "Energia",
      estadoAnterior: "Fonte",
      novoEstado: "Bateria",
      galpaoNome: "Galpão Norte",
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

    const mudancas = extrairMudancas(leituras, NOMES).filter(
      (item) => item.campo === "Tensão da Bateria"
    );

    expect(mudancas).toHaveLength(1);
    expect(mudancas[0].estadoAnterior).toBe("Alerta (2.9 V)");
    expect(mudancas[0].novoEstado).toBe("Normal (3.1 V)");
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

    const mudancas = extrairMudancas(leituras, NOMES).filter(
      (item) => item.campo === "Corrente do ventilador"
    );

    expect(mudancas).toHaveLength(1);
    expect(mudancas[0].estadoAnterior).toBe("Alerta (40 mA)");
    expect(mudancas[0].novoEstado).toBe("Normal (80 mA)");
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
    expect(mudancas[0].estadoAnterior).toBe("Fonte");
    expect(mudancas[0].novoEstado).toBe("Bateria");
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
});
