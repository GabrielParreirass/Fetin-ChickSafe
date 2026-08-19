export type PapelGalpao = "dono" | "operador";

export type AcessoGalpao = {
  usuarioId: string;
  nome: string;
  email: string;
  papel: string;
};

export type UsuarioGalpaoAcessoRow = {
  papel: string;
  usuario_id: string;
  usuarios:
    | { id: string; nome: string; email: string }
    | { id: string; nome: string; email: string }[]
    | null;
};

export function ehDono(papel?: string): boolean {
  return papel === "dono";
}

export function rotuloPapel(papel: string): string {
  return ehDono(papel) ? "Dono" : "Funcionário";
}

export function formatarLinhaAcesso(acesso: AcessoGalpao): string {
  return `${acesso.nome} — ${rotuloPapel(acesso.papel)}`;
}

export function mapearAcessoRow(row: UsuarioGalpaoAcessoRow): AcessoGalpao {
  const usuario = Array.isArray(row.usuarios) ? row.usuarios[0] : row.usuarios;
  const nome = usuario?.nome?.trim();

  return {
    usuarioId: row.usuario_id,
    nome: nome && nome.length > 0 ? nome : "Usuário",
    email: usuario?.email ?? "",
    papel: row.papel,
  };
}

export function ordenarAcessos(acessos: AcessoGalpao[]): AcessoGalpao[] {
  return [...acessos].sort((a, b) => {
    if (a.papel === "dono" && b.papel !== "dono") {
      return -1;
    }
    if (b.papel === "dono" && a.papel !== "dono") {
      return 1;
    }
    return a.nome.localeCompare(b.nome, "pt-BR");
  });
}
