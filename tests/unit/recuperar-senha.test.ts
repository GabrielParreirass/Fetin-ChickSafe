jest.mock("expo-linking", () => ({
  createURL: jest.fn((path: string) => `appchicksafe://${path.replace(/^\//, "")}`),
}));

import * as Linking from "expo-linking";
import {
  emailRecuperacaoValido,
  extrairCodigoRecuperacao,
  linkEhRecuperacaoSenha,
  urlRedirecionamentoConfirmacao,
  urlRedirecionamentoSenha,
} from "@/lib/recuperar-senha";

describe("emailRecuperacaoValido", () => {
  it("aceita um e-mail simples", () => {
    expect(emailRecuperacaoValido("  maria@chicksafe.app ")).toBe(true);
  });

  it("recusa texto sem domínio", () => {
    expect(emailRecuperacaoValido("maria")).toBe(false);
    expect(emailRecuperacaoValido("")).toBe(false);
  });
});

describe("extrairCodigoRecuperacao", () => {
  it("lê o código da query do link", () => {
    expect(
      extrairCodigoRecuperacao("appchicksafe://redefinir/page?code=abc%201")
    ).toBe("abc 1");
  });

  it("ignora link sem código", () => {
    expect(extrairCodigoRecuperacao(null)).toBeNull();
    expect(extrairCodigoRecuperacao("appchicksafe://redefinir/page")).toBeNull();
  });
});

describe("urlRedirecionamentoSenha", () => {
  it("aponta para a tela de nova senha", () => {
    expect(urlRedirecionamentoSenha()).toBe("appchicksafe://redefinir/page");
    expect(Linking.createURL).toHaveBeenCalledWith("/redefinir/page");
  });

  it("aponta a confirmação de e-mail para a raiz do app", () => {
    expect(urlRedirecionamentoConfirmacao()).toBe("appchicksafe://");
    expect(linkEhRecuperacaoSenha("appchicksafe://redefinir/page?code=1")).toBe(
      true
    );
    expect(linkEhRecuperacaoSenha("appchicksafe://?code=1")).toBe(false);
  });
});
