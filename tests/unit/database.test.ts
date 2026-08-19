jest.mock("@/lib/supabase", () => ({
  supabase: {},
}));

import { formatarCpf, soDigitos } from "@/lib/database";

describe("soDigitos", () => {
  it("devolve string vazia quando não há dígitos", () => {
    expect(soDigitos("")).toBe("");
    expect(soDigitos("abc")).toBe("");
  });

  it("mantém valor que já é só dígitos", () => {
    expect(soDigitos("12345678900")).toBe("12345678900");
  });

  it("remove máscara de CPF", () => {
    expect(soDigitos("123.456.789-00")).toBe("12345678900");
  });

  it("remove espaços e outros caracteres", () => {
    expect(soDigitos("(31) 99999-0000")).toBe("31999990000");
  });
});

describe("formatarCpf", () => {
  it("aplica máscara em CPF com 11 dígitos", () => {
    expect(formatarCpf("12345678900")).toBe("123.456.789-00");
  });

  it("mantém o valor quando não tem 11 dígitos", () => {
    expect(formatarCpf("123")).toBe("123");
  });
});
