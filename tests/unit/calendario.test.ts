import {
  avancarMes,
  celulasDoMes,
  diasDaSemana,
  formatarDataAcessivel,
  formatarDataBr,
  inicioDoMes,
  mesmoDia,
  rotuloMesAno,
} from "@/lib/calendario";

describe("calendario", () => {
  it("monta a grade com 42 células começando na segunda", () => {
    const celulas = celulasDoMes(new Date(2026, 0, 1));

    expect(celulas).toHaveLength(42);
    expect(diasDaSemana()).toEqual([
      "Seg",
      "Ter",
      "Qua",
      "Qui",
      "Sex",
      "Sáb",
      "Dom",
    ]);
    expect(celulas[0].data.getDay()).toBe(1);
    expect(celulas.find((item) => item.dia === 1 && item.noMes)?.data.getDay()).toBe(
      4
    );
  });

  it("avança o mês e compara o mesmo dia", () => {
    const janeiro = inicioDoMes(new Date(2026, 0, 19));
    expect(avancarMes(janeiro, 1)).toEqual(new Date(2026, 1, 1));
    expect(mesmoDia(new Date(2026, 0, 19), new Date(2026, 0, 19, 23))).toBe(
      true
    );
    expect(mesmoDia(new Date(2026, 0, 19), new Date(2026, 0, 20))).toBe(false);
  });

  it("formata datas em pt-BR", () => {
    const data = new Date(2026, 0, 2);
    expect(formatarDataBr(data)).toBe("02/01/2026");
    expect(formatarDataAcessivel(data)).toMatch(/2 de janeiro de 2026/i);
    expect(rotuloMesAno(data).toLowerCase()).toContain("janeiro");
    expect(rotuloMesAno(data)).toContain("2026");
  });
});
