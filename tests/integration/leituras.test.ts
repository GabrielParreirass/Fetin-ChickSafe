jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import { buscarUltimaLeitura, listarLeituras } from "@/lib/database";
import type { Leitura } from "@/lib/types";
import {
  createMockQuery,
  resetSupabaseMocks,
  supabaseMocks,
} from "./helpers/supabaseMock";

const LEITURA: Leitura = {
  id: 10,
  galpao_id: "galpao-1",
  energia: "Fonte",
  tensao: 4.2,
  corrente: 80,
  criado_em: "2026-01-01T10:00:00.000Z",
};

describe("buscarUltimaLeitura", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("busca a leitura mais recente do galpão", async () => {
    const consulta = createMockQuery({ data: LEITURA, error: null });
    supabaseMocks().from.mockReturnValue(consulta);

    await expect(buscarUltimaLeitura("galpao-1")).resolves.toEqual(LEITURA);
    expect(supabaseMocks().from).toHaveBeenCalledWith("leituras");
    expect(consulta.eq).toHaveBeenCalledWith("galpao_id", "galpao-1");
    expect(consulta.order).toHaveBeenCalledWith("criado_em", {
      ascending: false,
    });
    expect(consulta.limit).toHaveBeenCalledWith(1);
  });

  it("retorna null quando o galpão ainda não tem leitura", async () => {
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: null })
    );

    await expect(buscarUltimaLeitura("galpao-1")).resolves.toBeNull();
  });

  it("propaga erro do Supabase", async () => {
    const erro = { message: "falha ao buscar leitura" };
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: erro })
    );

    await expect(buscarUltimaLeitura("galpao-1")).rejects.toEqual(erro);
  });
});

describe("listarLeituras", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("lista com limite padrão e sem filtro de galpão", async () => {
    const consulta = createMockQuery({ data: [LEITURA], error: null });
    supabaseMocks().from.mockReturnValue(consulta);

    await expect(listarLeituras()).resolves.toEqual([LEITURA]);
    expect(consulta.limit).toHaveBeenCalledWith(200);
    expect(consulta.eq).not.toHaveBeenCalled();
  });

  it("filtra por galpão e respeita o limite informado", async () => {
    const consulta = createMockQuery({ data: [LEITURA], error: null });
    supabaseMocks().from.mockReturnValue(consulta);

    await expect(listarLeituras("galpao-1", 50)).resolves.toEqual([LEITURA]);
    expect(consulta.eq).toHaveBeenCalledWith("galpao_id", "galpao-1");
    expect(consulta.limit).toHaveBeenCalledWith(50);
  });

  it("retorna lista vazia quando data vem nulo", async () => {
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: null })
    );

    await expect(listarLeituras("galpao-1")).resolves.toEqual([]);
  });

  it("propaga erro do Supabase", async () => {
    const erro = { message: "falha ao listar leituras" };
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: erro })
    );

    await expect(listarLeituras("galpao-1")).rejects.toEqual(erro);
  });
});
