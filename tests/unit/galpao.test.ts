import {
  acessoAprovado,
  mapearGalpao,
  parseLimiar,
  usuarioPodeGerenciar,
} from "@/lib/galpao";

describe("mapearGalpao", () => {
  it("mapeia colunas do banco e o papel informado", () => {
    expect(
      mapearGalpao(
        {
          id: "galpao-1",
          nome: "Norte",
          codigo: "ABC123",
          limiar_tensao: "4.5",
          limiar_corrente: "80",
        },
        "dono"
      )
    ).toEqual({
      id: "galpao-1",
      nome: "Norte",
      codigo: "ABC123",
      limiarTensao: 4.5,
      limiarCorrente: 80,
      papel: "dono",
      statusAcesso: "aprovado",
    });
  });

  it("usa limiares padrão e papel operador quando faltam", () => {
    expect(
      mapearGalpao({
        id: "galpao-1",
        nome: "Norte",
        codigo: null,
      })
    ).toEqual({
      id: "galpao-1",
      nome: "Norte",
      codigo: null,
      limiarTensao: 3,
      limiarCorrente: 50,
      papel: "operador",
      statusAcesso: "aprovado",
    });
  });

  it("mapeia pedido pendente quando o status vem no vínculo", () => {
    expect(
      mapearGalpao(
        {
          id: "galpao-1",
          nome: "Norte",
          codigo: "ABC123",
        },
        "operador",
        "pendente"
      )
    ).toMatchObject({
      papel: "operador",
      statusAcesso: "pendente",
    });
  });

  it("devolve null quando não há linha", () => {
    expect(mapearGalpao(null)).toBeNull();
  });
});

describe("parseLimiar", () => {
  it("aceita número com vírgula", () => {
    expect(parseLimiar("3,5", "tensão")).toBe(3.5);
  });

  it("rejeita valor inválido", () => {
    expect(() => parseLimiar("abc", "tensão")).toThrow(
      "Informe um valor válido de tensão."
    );
    expect(() => parseLimiar("0", "corrente")).toThrow(
      "Informe um valor válido de corrente."
    );
  });
});

describe("usuarioPodeGerenciar", () => {
  it("só o dono gerencia", () => {
    expect(usuarioPodeGerenciar({ papel: "dono" })).toBe(true);
    expect(usuarioPodeGerenciar({ papel: "operador" })).toBe(false);
  });
});

describe("acessoAprovado", () => {
  it("bloqueia só o status pendente", () => {
    expect(acessoAprovado({ statusAcesso: "aprovado" })).toBe(true);
    expect(acessoAprovado({ statusAcesso: "pendente" })).toBe(false);
  });
});
