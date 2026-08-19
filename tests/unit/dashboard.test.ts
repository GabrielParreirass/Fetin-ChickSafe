import {
  fatiasEnergia,
  leiturasCronologicas,
  pontosTensao,
  reduzirSerie,
  resumoDashboard,
} from "@/lib/dashboard";
import type { Leitura } from "@/lib/types";

const fonte: Leitura = {
  id: 1,
  galpao_id: "galpao-1",
  energia: "Fonte",
  tensao: 4.2,
  corrente: 80,
  criado_em: "2026-01-01T10:05:00.000Z",
};

const bateria: Leitura = {
  id: 2,
  galpao_id: "galpao-1",
  energia: "Bateria",
  tensao: 2.5,
  corrente: 20,
  criado_em: "2026-01-01T10:00:00.000Z",
};

describe("leiturasCronologicas", () => {
  it("ordena da mais antiga para a mais nova", () => {
    expect(leiturasCronologicas([fonte, bateria]).map((item) => item.id)).toEqual(
      [2, 1]
    );
  });
});

describe("reduzirSerie", () => {
  it("mantém a série quando cabe no limite", () => {
    expect(reduzirSerie([1, 2, 3], 5)).toEqual([1, 2, 3]);
  });

  it("preserva o primeiro e o último ponto", () => {
    const reduzida = reduzirSerie([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
    expect(reduzida[0]).toBe(0);
    expect(reduzida[reduzida.length - 1]).toBe(9);
    expect(reduzida).toHaveLength(3);
  });
});

describe("pontosTensao", () => {
  it("usa a ordem cronológica e o valor de tensão", () => {
    expect(pontosTensao([fonte, bateria]).map((ponto) => ponto.value)).toEqual([
      2.5, 4.2,
    ]);
  });
});

describe("resumoDashboard", () => {
  it("devolve null sem leituras", () => {
    expect(resumoDashboard([], 3, 50)).toBeNull();
  });

  it("calcula médias, bateria e alertas", () => {
    const resumo = resumoDashboard([fonte, bateria], 3, 50);
    expect(resumo).toMatchObject({
      total: 2,
      mediaTensao: 3.35,
      minTensao: 2.5,
      maxTensao: 4.2,
      mediaCorrente: 50,
      minCorrente: 20,
      maxCorrente: 80,
      leiturasFonte: 1,
      leiturasBateria: 1,
      percentualBateria: 50,
      leiturasAlerta: 1,
      percentualAlerta: 50,
    });
  });
});

describe("fatiasEnergia", () => {
  it("omite fatia zerada", () => {
    const resumo = resumoDashboard([fonte], 3, 50);
    expect(resumo).not.toBeNull();
    expect(fatiasEnergia(resumo!)).toEqual([
      { value: 1, text: "Fonte", color: "#4CAF50" },
    ]);
  });
});
