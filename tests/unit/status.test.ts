import {
  correnteOk,
  energiaEhFonte,
  entrouEmAlerta,
  voltouAoNormal,
  formatarCorrente,
  formatarTensao,
  LIMIAR_TENSAO_V,
  rotuloEnergia,
  rotuloSituacao,
  statusGeralLeitura,
  resumoLeitura,
  tensaoOk,
  sensorOffline,
  statusGalpao,
  formatarTempoSemSinal,
  corRotuloStatus,
  MINUTOS_SEM_SINAL,
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

  it("usa o limiar informado quando ele é passado", () => {
    expect(tensaoOk(3.5, 4)).toBe(false);
    expect(tensaoOk(4.1, 4)).toBe(true);
  });
});

describe("correnteOk", () => {
  it("é crítica abaixo de 100 e alerta até 200", () => {
    expect(correnteOk(99)).toBe(false);
    expect(correnteOk(100)).toBe(false);
    expect(correnteOk(200)).toBe(false);
  });

  it("é normal só acima de 200 mA", () => {
    expect(correnteOk(201)).toBe(true);
    expect(correnteOk(250)).toBe(true);
  });
});

describe("rotuloSituacao", () => {
  it("traduz booleano para Normal ou Alerta", () => {
    expect(rotuloSituacao(true)).toBe("Normal");
    expect(rotuloSituacao(false)).toBe("Alerta");
  });
});

describe("statusGeralLeitura", () => {
  it("marca Sem dados quando não há leitura", () => {
    expect(statusGeralLeitura(null)).toEqual({
      ok: false,
      rotulo: "Sem dados",
    });
  });

  it("marca Normal quando energia, tensão e corrente estão ok", () => {
    expect(
      statusGeralLeitura({ energia: "Fonte", tensao: 4.2, corrente: 250 })
    ).toEqual({ ok: true, rotulo: "Normal" });
  });

  it("marca Alerta se qualquer campo falha", () => {
    expect(
      statusGeralLeitura({ energia: "Bateria", tensao: 4.2, corrente: 250 })
    ).toEqual({ ok: false, rotulo: "Alerta" });
    expect(
      statusGeralLeitura({ energia: "Fonte", tensao: 4.2, corrente: 50 })
    ).toEqual({ ok: false, rotulo: "Crítico" });
    expect(
      statusGeralLeitura({ energia: "Fonte", tensao: 2.5, corrente: 250 })
    ).toEqual({ ok: false, rotulo: "Alerta" });
  });
});

describe("entrouEmAlerta", () => {
  const normal = { energia: "Fonte", tensao: 4.2, corrente: 250 };
  const alerta = { energia: "Bateria", tensao: 2.1, corrente: 150 };

  it("dispara na primeira leitura em alerta", () => {
    expect(entrouEmAlerta(alerta, null)).toBe(true);
  });

  it("dispara quando sai do normal para alerta", () => {
    expect(entrouEmAlerta(alerta, normal)).toBe(true);
  });

  it("não dispara enquanto o galpão continua em alerta", () => {
    expect(entrouEmAlerta(alerta, alerta)).toBe(false);
  });

  it("não dispara em leitura normal", () => {
    expect(entrouEmAlerta(normal, alerta)).toBe(false);
    expect(entrouEmAlerta(normal, null)).toBe(false);
  });
});

describe("voltouAoNormal", () => {
  const normal = { energia: "Fonte", tensao: 4.2, corrente: 250 };
  const alerta = { energia: "Bateria", tensao: 2.1, corrente: 150 };

  it("dispara só na saída do alerta ou crítico", () => {
    expect(voltouAoNormal(normal, alerta)).toBe(true);
    expect(voltouAoNormal(alerta, normal)).toBe(false);
    expect(voltouAoNormal(normal, normal)).toBe(false);
    expect(voltouAoNormal(normal, null)).toBe(false);
  });
});

describe("resumoLeitura", () => {
  it("junta energia, tensão e corrente", () => {
    expect(
      resumoLeitura({ energia: "USB", tensao: 4.2, corrente: 250 })
    ).toBe("Fonte · 4.2 V · 250 mA");
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

describe("sensorOffline", () => {
  const agora = new Date("2026-08-28T12:00:00.000Z");

  it("não marca offline sem timestamp", () => {
    expect(sensorOffline(null, agora)).toBe(false);
    expect(sensorOffline("data-invalida", agora)).toBe(false);
  });

  it("marca offline no limiar de 1 hora", () => {
    expect(
      sensorOffline("2026-08-28T11:00:00.000Z", agora, MINUTOS_SEM_SINAL)
    ).toBe(true);
    expect(sensorOffline("2026-08-28T11:00:01.000Z", agora)).toBe(false);
  });
});

describe("statusGalpao", () => {
  const agora = new Date("2026-08-28T12:00:00.000Z");
  const recente = {
    energia: "Fonte",
    tensao: 4.2,
    corrente: 250,
    criado_em: "2026-08-28T11:58:00.000Z",
  };

  it("mantém Sem dados sem leitura", () => {
    expect(statusGalpao(null, 3, 50, agora)).toEqual({
      ok: false,
      rotulo: "Sem dados",
    });
  });

  it("marca Offline quando a leitura está velha", () => {
    expect(
      statusGalpao(
        { ...recente, criado_em: "2026-08-28T10:00:00.000Z" },
        3,
        50,
        agora
      )
    ).toEqual({ ok: false, rotulo: "Offline" });
  });

  it("usa Normal/Alerta quando a leitura é recente", () => {
    expect(statusGalpao(recente, 3, 50, agora)).toEqual({
      ok: true,
      rotulo: "Normal",
    });
  });
});

describe("formatarTempoSemSinal", () => {
  const agora = new Date("2026-08-28T12:00:00.000Z");

  it("formata minutos, horas e dias", () => {
    expect(formatarTempoSemSinal("2026-08-28T11:48:00.000Z", agora)).toBe(
      "há 12 min"
    );
    expect(formatarTempoSemSinal("2026-08-28T09:00:00.000Z", agora)).toBe(
      "há 3 h"
    );
    expect(formatarTempoSemSinal("2026-08-26T12:00:00.000Z", agora)).toBe(
      "há 2 d"
    );
  });
});

describe("corRotuloStatus", () => {
  it("usa uma cor por rótulo", () => {
    expect(corRotuloStatus("Normal")).toBe("#4CAF50");
    expect(corRotuloStatus("Alerta")).toBe("#F9A825");
    expect(corRotuloStatus("Crítico")).toBe("#F44336");
    expect(corRotuloStatus("Offline")).toBe("#FF9800");
    expect(corRotuloStatus("Sem dados")).toBe("#9E9E9E");
  });
});
