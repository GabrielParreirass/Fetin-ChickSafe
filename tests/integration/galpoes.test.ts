jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import {
  apagarGalpao,
  aprovarAcessoDoGalpao,
  atualizarGalpao,
  criarGalpao,
  entrarGalpaoPorCodigo,
  listarGalpoesDoUsuario,
  recusarAcessoDoGalpao,
  removerAcessoDoGalpao,
  sairDoGalpao,
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
  limiarTensao: 3,
  limiarCorrente: 50,
  papel: "dono",
  statusAcesso: "aprovado",
};

const GALPAO_ROW = {
  id: "galpao-1",
  nome: "Galpão Norte",
  codigo: "ABC123",
  limiar_tensao: 3,
  limiar_corrente: 50,
};

describe("listarGalpoesDoUsuario", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("desembrulha galpão como objeto e ignora relações nulas", async () => {
    const consulta = createMockQuery({
      data: [
        { galpao_id: "galpao-1", papel: "dono", status: "aprovado", galpoes: GALPAO_ROW },
        { galpao_id: "galpao-2", papel: "operador", galpoes: null },
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
        data: [{ galpao_id: "galpao-1", papel: "dono", galpoes: [GALPAO_ROW] }],
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
    supabaseMocks().rpc.mockResolvedValue({ data: GALPAO_ROW, error: null });

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

describe("atualizarGalpao", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("envia nome e limiares para a RPC", async () => {
    supabaseMocks().rpc.mockResolvedValue({
      data: { ...GALPAO_ROW, nome: "Norte 2", limiar_tensao: 4, limiar_corrente: 80 },
      error: null,
    });

    await expect(
      atualizarGalpao({
        galpaoId: "galpao-1",
        nome: "  Norte 2  ",
        limiarTensao: 4,
        limiarCorrente: 80,
      })
    ).resolves.toEqual({
      ...GALPAO,
      nome: "Norte 2",
      limiarTensao: 4,
      limiarCorrente: 80,
    });
    expect(supabaseMocks().rpc).toHaveBeenCalledWith("atualizar_galpao", {
      p_galpao_id: "galpao-1",
      p_nome: "Norte 2",
      p_limiar_tensao: 4,
      p_limiar_corrente: 80,
    });
  });
});

describe("removerAcessoDoGalpao", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("chama a RPC com galpão e usuário", async () => {
    supabaseMocks().rpc.mockResolvedValue({ data: null, error: null });

    await expect(
      removerAcessoDoGalpao("galpao-1", "user-2")
    ).resolves.toBeUndefined();
    expect(supabaseMocks().rpc).toHaveBeenCalledWith("remover_acesso_galpao", {
      p_galpao_id: "galpao-1",
      p_usuario_id: "user-2",
    });
  });

  it("propaga erro do dono", async () => {
    const erro = { message: "Não é possível remover o dono do galpão" };
    supabaseMocks().rpc.mockResolvedValue({ data: null, error: erro });

    await expect(removerAcessoDoGalpao("galpao-1", "user-1")).rejects.toEqual(
      erro
    );
  });
});

describe("apagarGalpao", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("chama a RPC de exclusão", async () => {
    supabaseMocks().rpc.mockResolvedValue({ data: null, error: null });

    await expect(apagarGalpao("galpao-1")).resolves.toBeUndefined();
    expect(supabaseMocks().rpc).toHaveBeenCalledWith("apagar_galpao", {
      p_galpao_id: "galpao-1",
    });
  });
});

describe("aprovar e recusar acesso", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("aprova o pedido pendente", async () => {
    supabaseMocks().rpc.mockResolvedValue({ data: null, error: null });

    await expect(
      aprovarAcessoDoGalpao("galpao-1", "user-2")
    ).resolves.toBeUndefined();
    expect(supabaseMocks().rpc).toHaveBeenCalledWith("aprovar_acesso_galpao", {
      p_galpao_id: "galpao-1",
      p_usuario_id: "user-2",
    });
  });

  it("recusa o pedido pendente", async () => {
    supabaseMocks().rpc.mockResolvedValue({ data: null, error: null });

    await expect(
      recusarAcessoDoGalpao("galpao-1", "user-2")
    ).resolves.toBeUndefined();
    expect(supabaseMocks().rpc).toHaveBeenCalledWith("recusar_acesso_galpao", {
      p_galpao_id: "galpao-1",
      p_usuario_id: "user-2",
    });
  });
});

describe("sairDoGalpao", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("chama a RPC para o próprio usuário sair", async () => {
    supabaseMocks().rpc.mockResolvedValue({ data: null, error: null });

    await expect(sairDoGalpao("galpao-1")).resolves.toBeUndefined();
    expect(supabaseMocks().rpc).toHaveBeenCalledWith("sair_do_galpao", {
      p_galpao_id: "galpao-1",
    });
  });
});
