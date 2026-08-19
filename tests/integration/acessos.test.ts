jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { listarAcessosDoGalpao } from "@/lib/database";
import {
  createMockQuery,
  resetSupabaseMocks,
  supabaseMocks,
} from "./helpers/supabaseMock";

const MEMBROS_RPC = [
  {
    usuario_id: "user-2",
    nome: "Bruno",
    email: "bruno@chicksafe.app",
    papel: "operador",
  },
  {
    usuario_id: "user-1",
    nome: "Maria Silva",
    email: "maria@chicksafe.app",
    papel: "dono",
  },
];

const MEMBROS_ORDENADOS = [
  {
    usuarioId: "user-1",
    nome: "Maria Silva",
    email: "maria@chicksafe.app",
    papel: "dono",
  },
  {
    usuarioId: "user-2",
    nome: "Bruno",
    email: "bruno@chicksafe.app",
    papel: "operador",
  },
];

describe("listarAcessosDoGalpao", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("usa a RPC, inclui todos os membros e ordena o dono primeiro", async () => {
    supabaseMocks().rpc.mockResolvedValue({
      data: MEMBROS_RPC,
      error: null,
    });

    await expect(listarAcessosDoGalpao("galpao-1")).resolves.toEqual(
      MEMBROS_ORDENADOS
    );
    expect(supabaseMocks().rpc).toHaveBeenCalledWith("listar_acessos_galpao", {
      p_galpao_id: "galpao-1",
    });
    expect(supabaseMocks().from).not.toHaveBeenCalled();
  });

  it("usa Usuário quando o nome da RPC vem vazio", async () => {
    supabaseMocks().rpc.mockResolvedValue({
      data: [
        {
          usuario_id: "user-1",
          nome: "  ",
          email: null,
          papel: "dono",
        },
      ],
      error: null,
    });

    await expect(listarAcessosDoGalpao("galpao-1")).resolves.toEqual([
      {
        usuarioId: "user-1",
        nome: "Usuário",
        email: "",
        papel: "dono",
      },
    ]);
  });

  it("cai no from quando a RPC falha e ainda ordena os membros", async () => {
    supabaseMocks().rpc.mockResolvedValue({
      data: null,
      error: { message: "function not found" },
    });
    const consulta = createMockQuery({
      data: [
        {
          papel: "operador",
          usuario_id: "user-2",
          usuarios: {
            id: "user-2",
            nome: "Bruno",
            email: "bruno@chicksafe.app",
          },
        },
        {
          papel: "dono",
          usuario_id: "user-1",
          usuarios: {
            id: "user-1",
            nome: "Maria Silva",
            email: "maria@chicksafe.app",
          },
        },
      ],
      error: null,
    });
    supabaseMocks().from.mockReturnValue(consulta);

    await expect(listarAcessosDoGalpao("galpao-1")).resolves.toEqual(
      MEMBROS_ORDENADOS
    );
    expect(supabaseMocks().from).toHaveBeenCalledWith("usuario_galpoes");
    expect(consulta.eq).toHaveBeenCalledWith("galpao_id", "galpao-1");
  });

  it("mantém o dono no fallback quando o perfil não veio no join", async () => {
    supabaseMocks().rpc.mockResolvedValue({
      data: null,
      error: { message: "function not found" },
    });
    supabaseMocks().from.mockReturnValue(
      createMockQuery({
        data: [
          {
            papel: "dono",
            usuario_id: "user-1",
            usuarios: null,
          },
        ],
        error: null,
      })
    );

    await expect(listarAcessosDoGalpao("galpao-1")).resolves.toEqual([
      {
        usuarioId: "user-1",
        nome: "Usuário",
        email: "",
        papel: "dono",
      },
    ]);
  });

  it("retorna lista vazia quando a RPC não acha vínculos", async () => {
    supabaseMocks().rpc.mockResolvedValue({ data: null, error: null });

    await expect(listarAcessosDoGalpao("galpao-1")).resolves.toEqual([]);
    expect(supabaseMocks().from).not.toHaveBeenCalled();
  });

  it("propaga o erro do from quando RPC e fallback falham", async () => {
    const erro = { message: "Sem acesso a este galpão" };
    supabaseMocks().rpc.mockResolvedValue({
      data: null,
      error: { message: "function not found" },
    });
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: erro })
    );

    await expect(listarAcessosDoGalpao("galpao-1")).rejects.toEqual(erro);
  });
});
