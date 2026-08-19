import {
  ehDono,
  formatarLinhaAcesso,
  mapearAcessoRow,
  ordenarAcessos,
  rotuloPapel,
  statusAcessoDe,
} from "@/lib/acesso";
import type { AcessoGalpao } from "@/lib/acesso";

const dono: AcessoGalpao = {
  usuarioId: "user-1",
  nome: "Maria Silva",
  email: "maria@chicksafe.app",
  papel: "dono",
  status: "aprovado",
};

const operadorB: AcessoGalpao = {
  usuarioId: "user-2",
  nome: "Bruno",
  email: "bruno@chicksafe.app",
  papel: "operador",
  status: "aprovado",
};

const operadorA: AcessoGalpao = {
  usuarioId: "user-3",
  nome: "Ana",
  email: "ana@chicksafe.app",
  papel: "operador",
  status: "aprovado",
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
  it("marca pedido pendente na linha", () => {
    expect(
      formatarLinhaAcesso({ ...operadorB, status: "pendente" })
    ).toBe("Bruno — Funcionário (pendente)");
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
      status: "aprovado",
    });
  });
});

describe("statusAcessoDe", () => {
  it("só trata pendente como pendente", () => {
    expect(statusAcessoDe("pendente")).toBe("pendente");
    expect(statusAcessoDe("aprovado")).toBe("aprovado");
    expect(statusAcessoDe(undefined)).toBe("aprovado");
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

  it("coloca pendentes depois do dono", () => {
    const pendente = { ...operadorB, status: "pendente" as const };
    expect(ordenarAcessos([operadorA, pendente, dono])).toEqual([
      dono,
      pendente,
      operadorA,
    ]);
  });

  it("não altera o array original", () => {
    const original = [operadorB, dono];
    ordenarAcessos(original);
    expect(original).toEqual([operadorB, dono]);
  });
});
