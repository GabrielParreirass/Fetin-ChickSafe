import {
  ehDono,
  formatarLinhaAcesso,
  mapearAcessoRow,
  ordenarAcessos,
  rotuloPapel,
} from "@/lib/acesso";
import type { AcessoGalpao } from "@/lib/acesso";

const dono: AcessoGalpao = {
  usuarioId: "user-1",
  nome: "Maria Silva",
  email: "maria@chicksafe.app",
  papel: "dono",
};

const operadorB: AcessoGalpao = {
  usuarioId: "user-2",
  nome: "Bruno",
  email: "bruno@chicksafe.app",
  papel: "operador",
};

const operadorA: AcessoGalpao = {
  usuarioId: "user-3",
  nome: "Ana",
  email: "ana@chicksafe.app",
  papel: "operador",
};

describe("rotuloPapel", () => {
  it("mostra Dono para quem criou o galpão", () => {
    expect(rotuloPapel("dono")).toBe("Dono");
  });

  it("mostra Funcionário para quem entrou com código", () => {
    expect(rotuloPapel("operador")).toBe("Funcionário");
  });

  it("trata papel desconhecido como Funcionário", () => {
    expect(rotuloPapel("outro")).toBe("Funcionário");
  });
});

describe("ehDono", () => {
  it("reconhece só o papel dono", () => {
    expect(ehDono("dono")).toBe(true);
    expect(ehDono("operador")).toBe(false);
    expect(ehDono(undefined)).toBe(false);
  });
});

describe("formatarLinhaAcesso", () => {
  it("junta nome e função na mesma linha", () => {
    expect(formatarLinhaAcesso(dono)).toBe("Maria Silva — Dono");
    expect(formatarLinhaAcesso(operadorB)).toBe("Bruno — Funcionário");
  });
});

describe("mapearAcessoRow", () => {
  it("desembrulha o usuário como objeto e mantém o dono", () => {
    expect(
      mapearAcessoRow({
        papel: "dono",
        usuario_id: "user-1",
        usuarios: {
          id: "user-1",
          nome: "Maria Silva",
          email: "maria@chicksafe.app",
        },
      })
    ).toEqual(dono);
  });

  it("usa o primeiro item quando o join vem como array", () => {
    expect(
      mapearAcessoRow({
        papel: "operador",
        usuario_id: "user-2",
        usuarios: [
          { id: "user-2", nome: "Bruno", email: "bruno@chicksafe.app" },
        ],
      })
    ).toEqual(operadorB);
  });

  it("mantém o vínculo mesmo sem perfil, com nome fallback", () => {
    expect(
      mapearAcessoRow({
        papel: "dono",
        usuario_id: "user-9",
        usuarios: null,
      })
    ).toEqual({
      usuarioId: "user-9",
      nome: "Usuário",
      email: "",
      papel: "dono",
    });
  });
});

describe("ordenarAcessos", () => {
  it("coloca o dono primeiro e depois ordena por nome", () => {
    expect(ordenarAcessos([operadorB, dono, operadorA])).toEqual([
      dono,
      operadorA,
      operadorB,
    ]);
  });

  it("não altera o array original", () => {
    const original = [operadorB, dono];
    ordenarAcessos(original);
    expect(original).toEqual([operadorB, dono]);
  });
});
