import {
  contarNaoLidas,
  destinoNotificacao,
  mapearNotificacao,
  rotaDestinoNotificacao,
  rotuloContagemNaoLidas,
} from "@/lib/notificacoes";

const pedido = {
  id: "n-1",
  usuarioId: "user-1",
  tipo: "pedido_acesso",
  titulo: "Pedido de acesso",
  mensagem: "Bruno pediu acesso ao galpão Norte.",
  lida: false,
  galpaoId: "galpao-1",
  dados: { solicitante_id: "user-2" },
  criadoEm: "2026-01-01T10:00:00.000Z",
};

describe("mapearNotificacao", () => {
  it("mapeia a linha do banco", () => {
    expect(
      mapearNotificacao({
        id: "n-1",
        usuario_id: "user-1",
        tipo: "pedido_acesso",
        titulo: "Pedido de acesso",
        mensagem: "Bruno pediu acesso ao galpão Norte.",
        lida: false,
        galpao_id: "galpao-1",
        dados: { solicitante_id: "user-2" },
        criado_em: "2026-01-01T10:00:00.000Z",
      })
    ).toEqual(pedido);
  });

  it("usa fallback quando galpão e dados faltam", () => {
    expect(
      mapearNotificacao({
        id: "n-2",
        usuario_id: "user-1",
        tipo: "outro",
        titulo: "Aviso",
        mensagem: "Texto",
        lida: true,
        criado_em: "2026-01-01T10:00:00.000Z",
      })
    ).toMatchObject({
      galpaoId: null,
      dados: {},
      lida: true,
    });
  });
});

describe("destinoNotificacao", () => {
  it("leva pedido de acesso para o galpão", () => {
    expect(destinoNotificacao(pedido)).toEqual({
      tipo: "acesso",
      galpaoId: "galpao-1",
    });
  });

  it("leva alerta e aprovação para a página do galpão", () => {
    expect(
      destinoNotificacao({ tipo: "alerta_galpao", galpaoId: "galpao-1" })
    ).toEqual({ tipo: "galpao", galpaoId: "galpao-1" });
    expect(
      destinoNotificacao({ tipo: "acesso_aprovado", galpaoId: "galpao-1" })
    ).toEqual({ tipo: "galpao", galpaoId: "galpao-1" });
  });

  it("não navega quando o tipo ainda não tem destino", () => {
    expect(
      destinoNotificacao({ tipo: "alerta_energia", galpaoId: "galpao-1" })
    ).toEqual({ tipo: "nenhum" });
  });
});

describe("rotaDestinoNotificacao", () => {
  it("abre o galpão com o modal de acesso", () => {
    expect(
      rotaDestinoNotificacao({ tipo: "acesso", galpaoId: "galpao-1" })
    ).toBe("/(private)/galpao/galpao-1/page?acesso=1");
  });

  it("abre a página do galpão sem o modal", () => {
    expect(
      rotaDestinoNotificacao({ tipo: "galpao", galpaoId: "galpao-1" })
    ).toBe("/(private)/galpao/galpao-1/page");
  });

  it("não gera rota sem destino", () => {
    expect(rotaDestinoNotificacao({ tipo: "nenhum" })).toBeNull();
  });
});

describe("contarNaoLidas", () => {
  it("conta só as não lidas e limita o badge", () => {
    expect(contarNaoLidas([pedido, { ...pedido, id: "n-2", lida: true }])).toBe(
      1
    );
    expect(rotuloContagemNaoLidas(0)).toBe("");
    expect(rotuloContagemNaoLidas(3)).toBe("3");
    expect(rotuloContagemNaoLidas(12)).toBe("9+");
  });
});
