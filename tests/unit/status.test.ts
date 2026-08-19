import {
  correnteOk,
  energiaEhFonte,
  formatarCorrente,
  formatarTensao,
  LIMIAR_CORRENTE_MA,
  LIMIAR_TENSAO_V,
  rotuloEnergia,
  rotuloSituacao,
  tensaoOk,
} from "@/lib/status";

describe("energiaEhFonte", () => {
  it("reconhece Fonte e USB como fonte", () => {
    expect(energiaEhFonte("Fonte")).toBe(true);
    expect(energiaEhFonte("USB")).toBe(true);
  });

  it("trata Bateria e valores desconhecidos como não-fonte", () => {
    expect(energiaEhFonte("Bateria")).toBe(false);
    expect(energiaEhFonte("")).toBe(false);
  });
});

describe("rotuloEnergia", () => {
  it("agrupa Fonte e USB como Fonte", () => {
    expect(rotuloEnergia("Fonte")).toBe("Fonte");
    expect(rotuloEnergia("USB")).toBe("Fonte");
  });

  it("rotula o restante como Bateria", () => {
    expect(rotuloEnergia("Bateria")).toBe("Bateria");
  });
});

describe("tensaoOk", () => {
  it("alerta no limiar e abaixo", () => {
    expect(tensaoOk(LIMIAR_TENSAO_V)).toBe(false);
    expect(tensaoOk(2.9)).toBe(false);
    expect(tensaoOk(0)).toBe(false);
  });

  it("considera normal acima de 3 V", () => {
    expect(tensaoOk(3.1)).toBe(true);
    expect(tensaoOk(5)).toBe(true);
  });
});

describe("correnteOk", () => {
  it("alerta no limiar e abaixo", () => {
    expect(correnteOk(LIMIAR_CORRENTE_MA)).toBe(false);
    expect(correnteOk(49)).toBe(false);
    expect(correnteOk(0)).toBe(false);
  });

  it("considera normal acima de 50 mA", () => {
    expect(correnteOk(51)).toBe(true);
    expect(correnteOk(120)).toBe(true);
  });
});

describe("rotuloSituacao", () => {
  it("traduz booleano para Normal ou Alerta", () => {
    expect(rotuloSituacao(true)).toBe("Normal");
    expect(rotuloSituacao(false)).toBe("Alerta");
  });
});

describe("formatadores", () => {
  it("formata tensão com uma casa decimal", () => {
    expect(formatarTensao(3)).toBe("3.0 V");
    expect(formatarTensao(3.14)).toBe("3.1 V");
  });

  it("arredonda corrente para inteiro", () => {
    expect(formatarCorrente(50.4)).toBe("50 mA");
    expect(formatarCorrente(50.6)).toBe("51 mA");
  });
});
