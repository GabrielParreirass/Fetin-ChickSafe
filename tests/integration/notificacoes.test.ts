jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { listarNotificacoes, marcarNotificacaoLida } from "@/lib/database";
import {
  createMockQuery,
  resetSupabaseMocks,
  supabaseMocks,
} from "./helpers/supabaseMock";

const ROW = {
  id: "n-1",
  usuario_id: "user-1",
  tipo: "pedido_acesso",
  titulo: "Pedido de acesso",
  mensagem: "Bruno pediu acesso ao galpão Norte.",
  lida: false,
  galpao_id: "galpao-1",
  dados: { solicitante_id: "user-2" },
  criado_em: "2026-01-01T10:00:00.000Z",
};

describe("listarNotificacoes", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("lista as notificações do usuário da mais nova para a mais antiga", async () => {
    const consulta = createMockQuery({ data: [ROW], error: null });
    supabaseMocks().from.mockReturnValue(consulta);

    await expect(listarNotificacoes("user-1")).resolves.toEqual([
      {
        id: "n-1",
        usuarioId: "user-1",
        tipo: "pedido_acesso",
        titulo: "Pedido de acesso",
        mensagem: "Bruno pediu acesso ao galpão Norte.",
        lida: false,
        galpaoId: "galpao-1",
        dados: { solicitante_id: "user-2" },
        criadoEm: "2026-01-01T10:00:00.000Z",
      },
    ]);
    expect(supabaseMocks().from).toHaveBeenCalledWith("notificacoes");
    expect(consulta.eq).toHaveBeenCalledWith("usuario_id", "user-1");
    expect(consulta.order).toHaveBeenCalledWith("criado_em", {
      ascending: false,
    });
    expect(consulta.limit).toHaveBeenCalledWith(50);
  });

  it("retorna lista vazia quando data vem nulo", async () => {
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: null })
    );

    await expect(listarNotificacoes("user-1")).resolves.toEqual([]);
  });
});

describe("marcarNotificacaoLida", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("marca a notificação como lida", async () => {
    const consulta = createMockQuery({ data: null, error: null });
    supabaseMocks().from.mockReturnValue(consulta);

    await expect(marcarNotificacaoLida("n-1")).resolves.toBeUndefined();
    expect(consulta.update).toHaveBeenCalledWith({ lida: true });
    expect(consulta.eq).toHaveBeenCalledWith("id", "n-1");
  });

  it("propaga erro do Supabase", async () => {
    const erro = { message: "falha ao marcar" };
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: erro })
    );

    await expect(marcarNotificacaoLida("n-1")).rejects.toEqual(erro);
  });
});
