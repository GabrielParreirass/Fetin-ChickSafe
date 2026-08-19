import { mensagemDeErro, traduzirErroAuth } from "@/lib/erros";

describe("traduzirErroAuth", () => {
  it("traduz credenciais inválidas", () => {
    expect(traduzirErroAuth("Invalid login credentials")).toBe(
      "E-mail ou senha incorretos."
    );
  });

  it("traduz e-mail já cadastrado", () => {
    expect(traduzirErroAuth("User already registered")).toBe(
      "Este e-mail já está cadastrado."
    );
  });

  it("mantém mensagem desconhecida", () => {
    expect(traduzirErroAuth("Falha interna")).toBe("Falha interna");
  });
});

describe("mensagemDeErro", () => {
  it("lê Error e traduz", () => {
    expect(
      mensagemDeErro(new Error("Invalid login credentials"), "fallback")
    ).toBe("E-mail ou senha incorretos.");
  });

  it("lê objeto com message", () => {
    expect(
      mensagemDeErro({ message: "User already registered" }, "fallback")
    ).toBe("Este e-mail já está cadastrado.");
  });

  it("usa fallback quando não há mensagem", () => {
    expect(mensagemDeErro(null, "Não foi possível entrar.")).toBe(
      "Não foi possível entrar."
    );
  });
});
