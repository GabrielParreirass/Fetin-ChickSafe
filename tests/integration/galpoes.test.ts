jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import {
  criarGalpao,
  entrarGalpaoPorCodigo,
  listarGalpoesDoUsuario,
} from "@/lib/database";
import type { Galpao } from "@/lib/types";
import {
  createMockQuery,
  resetSupabaseMocks,
  supabaseMocks,
} from "./helpers/supabaseMock";

const GALPAO: Galpao = {
  id: "galpao-1",
  nome: "Galpão Norte",
  codigo: "ABC123",
};

describe("listarGalpoesDoUsuario", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("desembrulha galpão como objeto e ignora relações nulas", async () => {
    const consulta = createMockQuery({
      data: [
        { galpao_id: "galpao-1", galpoes: GALPAO },
        { galpao_id: "galpao-2", galpoes: null },
      ],
      error: null,
    });
    supabaseMocks().from.mockReturnValue(consulta);

    await expect(listarGalpoesDoUsuario("user-1")).resolves.toEqual([GALPAO]);
    expect(supabaseMocks().from).toHaveBeenCalledWith("usuario_galpoes");
    expect(consulta.eq).toHaveBeenCalledWith("usuario_id", "user-1");
  });

  it("usa o primeiro item quando o join vem como array", async () => {
    supabaseMocks().from.mockReturnValue(
      createMockQuery({
        data: [{ galpao_id: "galpao-1", galpoes: [GALPAO] }],
        error: null,
      })
    );

    await expect(listarGalpoesDoUsuario("user-1")).resolves.toEqual([GALPAO]);
  });

  it("retorna lista vazia quando não há vínculos", async () => {
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: null })
    );

    await expect(listarGalpoesDoUsuario("user-1")).resolves.toEqual([]);
  });

  it("propaga erro do Supabase", async () => {
    const erro = { message: "falha ao listar galpões" };
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: erro })
    );

    await expect(listarGalpoesDoUsuario("user-1")).rejects.toEqual(erro);
  });
});

describe("entrarGalpaoPorCodigo", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("normaliza o código e devolve o id do galpão", async () => {
    supabaseMocks().rpc.mockResolvedValue({
      data: "galpao-1",
      error: null,
    });

    await expect(entrarGalpaoPorCodigo("  abc123  ")).resolves.toBe("galpao-1");
    expect(supabaseMocks().rpc).toHaveBeenCalledWith("entrar_galpao", {
      p_codigo: "ABC123",
    });
  });

  it("propaga erro de código inválido", async () => {
    const erro = { message: "Código de galpão inválido" };
    supabaseMocks().rpc.mockResolvedValue({ data: null, error: erro });

    await expect(entrarGalpaoPorCodigo("XXXXXX")).rejects.toEqual(erro);
  });
});

describe("criarGalpao", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("envia o nome sem espaços extras", async () => {
    supabaseMocks().rpc.mockResolvedValue({ data: GALPAO, error: null });

    await expect(criarGalpao("  Galpão Norte  ")).resolves.toEqual(GALPAO);
    expect(supabaseMocks().rpc).toHaveBeenCalledWith("criar_galpao", {
      p_nome: "Galpão Norte",
    });
  });

  it("propaga erro do RPC", async () => {
    const erro = { message: "Nome obrigatório" };
    supabaseMocks().rpc.mockResolvedValue({ data: null, error: erro });

    await expect(criarGalpao("Norte")).rejects.toEqual(erro);
  });
});
