jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

import type { User } from "@supabase/supabase-js";
import {
  buscarUsuario,
  garantirPerfil,
  atualizarPerfil,
} from "@/lib/database";
import type { Usuario } from "@/lib/types";
import {
  createMockQuery,
  resetSupabaseMocks,
  supabaseMocks,
} from "./helpers/supabaseMock";

const PERFIL: Usuario = {
  id: "user-1",
  nome: "Maria Silva",
  cpf: "12345678900",
  email: "maria@chicksafe.app",
  telefone: "31999990000",
};

function usuarioAuth(parcial: Partial<User> = {}): User {
  return {
    id: "user-1",
    email: "maria@chicksafe.app",
    user_metadata: {},
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
    ...parcial,
  } as User;
}

describe("buscarUsuario", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("retorna o perfil quando o Supabase encontra o usuário", async () => {
    const consulta = createMockQuery({ data: PERFIL, error: null });
    supabaseMocks().from.mockReturnValue(consulta);

    await expect(buscarUsuario("user-1")).resolves.toEqual(PERFIL);
    expect(supabaseMocks().from).toHaveBeenCalledWith("usuarios");
    expect(consulta.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("retorna null quando não há perfil", async () => {
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: null })
    );

    await expect(buscarUsuario("user-1")).resolves.toBeNull();
  });

  it("propaga erro do Supabase", async () => {
    const erro = { message: "falha ao buscar usuário" };
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: erro })
    );

    await expect(buscarUsuario("user-1")).rejects.toEqual(erro);
  });
});

describe("garantirPerfil", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("devolve o perfil existente e não faz insert", async () => {
    const busca = createMockQuery({ data: PERFIL, error: null });
    const insert = createMockQuery({ data: PERFIL, error: null });
    supabaseMocks().from.mockReturnValueOnce(busca).mockReturnValueOnce(insert);

    await expect(garantirPerfil(usuarioAuth())).resolves.toEqual(PERFIL);
    expect(insert.insert).not.toHaveBeenCalled();
  });

  it("cria perfil com CPF formatado e extras válidos", async () => {
    const busca = createMockQuery({ data: null, error: null });
    const insert = createMockQuery({ data: PERFIL, error: null });
    supabaseMocks().from.mockReturnValueOnce(busca).mockReturnValueOnce(insert);

    await expect(
      garantirPerfil(usuarioAuth(), {
        nome: "  Maria Silva  ",
        cpf: "123.456.789-00",
        telefone: " 31999990000 ",
      })
    ).resolves.toEqual(PERFIL);

    expect(insert.insert).toHaveBeenCalledWith({
      id: "user-1",
      nome: "Maria Silva",
      cpf: "12345678900",
      email: "maria@chicksafe.app",
      telefone: "31999990000",
    });
  });

  it("usa nome, CPF e telefone do metadata quando extras não vêm", async () => {
    const criado: Usuario = {
      ...PERFIL,
      nome: "João",
      email: "joao@chicksafe.app",
    };
    const busca = createMockQuery({ data: null, error: null });
    const insert = createMockQuery({ data: criado, error: null });
    supabaseMocks().from.mockReturnValueOnce(busca).mockReturnValueOnce(insert);

    await garantirPerfil(
      usuarioAuth({
        email: "joao@chicksafe.app",
        user_metadata: {
          nome: "João",
          cpf: "987.654.321-00",
          telefone: "31888887777",
        },
      })
    );

    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "João",
        cpf: "98765432100",
        telefone: "31888887777",
        email: "joao@chicksafe.app",
      })
    );
  });

  it("usa o e-mail como nome quando não há nome nos extras nem no metadata", async () => {
    const busca = createMockQuery({ data: null, error: null });
    const insert = createMockQuery({ data: PERFIL, error: null });
    supabaseMocks().from.mockReturnValueOnce(busca).mockReturnValueOnce(insert);

    await garantirPerfil(usuarioAuth({ user_metadata: {} }), {
      cpf: "12345678900",
      telefone: "31999990000",
    });

    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "maria@chicksafe.app" })
    );
  });

  it("usa 'Usuário' quando não há nome nem e-mail", async () => {
    const busca = createMockQuery({ data: null, error: null });
    const insert = createMockQuery({ data: PERFIL, error: null });
    supabaseMocks().from.mockReturnValueOnce(busca).mockReturnValueOnce(insert);

    await garantirPerfil(usuarioAuth({ email: undefined, user_metadata: {} }), {
      cpf: "12345678900",
      telefone: "31999990000",
    });

    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "Usuário", email: "" })
    );
  });

  it("rejeita CPF vazio", async () => {
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: null })
    );

    await expect(
      garantirPerfil(usuarioAuth({ user_metadata: {} }), {
        telefone: "31999990000",
      })
    ).rejects.toThrow("CPF é obrigatório e deve ter 11 dígitos.");
    expect(supabaseMocks().from).toHaveBeenCalledTimes(1);
  });

  it("rejeita CPF com 10 dígitos", async () => {
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: null })
    );

    await expect(
      garantirPerfil(usuarioAuth({ user_metadata: {} }), {
        cpf: "1234567890",
        telefone: "31999990000",
      })
    ).rejects.toThrow("CPF é obrigatório e deve ter 11 dígitos.");
  });

  it("rejeita telefone vazio", async () => {
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: null })
    );

    await expect(
      garantirPerfil(usuarioAuth({ user_metadata: {} }), {
        cpf: "12345678900",
      })
    ).rejects.toThrow("Telefone é obrigatório.");
  });

  it("propaga erro do insert", async () => {
    const erro = { message: "cpf duplicado" };
    const busca = createMockQuery({ data: null, error: null });
    const insert = createMockQuery({ data: null, error: erro });
    supabaseMocks().from.mockReturnValueOnce(busca).mockReturnValueOnce(insert);

    await expect(
      garantirPerfil(usuarioAuth(), {
        cpf: "12345678900",
        telefone: "31999990000",
      })
    ).rejects.toEqual(erro);
  });
});

describe("atualizarPerfil", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  it("atualiza só nome e telefone", async () => {
    const atualizado = { ...PERFIL, nome: "Maria Souza", telefone: "31888887777" };
    const consulta = createMockQuery({ data: atualizado, error: null });
    supabaseMocks().from.mockReturnValue(consulta);

    await expect(
      atualizarPerfil("user-1", {
        nome: "  Maria Souza  ",
        telefone: " 31888887777 ",
      })
    ).resolves.toEqual(atualizado);

    expect(consulta.update).toHaveBeenCalledWith({
      nome: "Maria Souza",
      telefone: "31888887777",
    });
    expect(consulta.eq).toHaveBeenCalledWith("id", "user-1");
  });

  it("rejeita nome vazio", async () => {
    await expect(
      atualizarPerfil("user-1", { nome: "  ", telefone: "31999990000" })
    ).rejects.toThrow("Informe o nome.");
    expect(supabaseMocks().from).not.toHaveBeenCalled();
  });

  it("rejeita telefone vazio", async () => {
    await expect(
      atualizarPerfil("user-1", { nome: "Maria", telefone: "" })
    ).rejects.toThrow("Informe o telefone.");
  });

  it("propaga erro do Supabase", async () => {
    const erro = { message: "E-mail e CPF não podem ser alterados" };
    supabaseMocks().from.mockReturnValue(
      createMockQuery({ data: null, error: erro })
    );

    await expect(
      atualizarPerfil("user-1", { nome: "Maria", telefone: "31999990000" })
    ).rejects.toEqual(erro);
  });
});
