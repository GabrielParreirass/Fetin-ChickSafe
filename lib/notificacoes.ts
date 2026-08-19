export type TipoNotificacao = "pedido_acesso";

export type NotificacaoRow = {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  galpao_id?: string | null;
  dados?: Record<string, unknown> | null;
  criado_em: string;
};

export type Notificacao = {
  id: string;
  usuarioId: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  galpaoId: string | null;
  dados: Record<string, unknown>;
  criadoEm: string;
};

export type DestinoNotificacao =
  | { tipo: "acesso"; galpaoId: string }
  | { tipo: "nenhum" };

export function mapearNotificacao(row: NotificacaoRow): Notificacao {
  return {
    id: row.id,
    usuarioId: row.usuario_id,
    tipo: row.tipo,
    titulo: row.titulo,
    mensagem: row.mensagem,
    lida: Boolean(row.lida),
    galpaoId: row.galpao_id ?? null,
    dados: row.dados ?? {},
    criadoEm: row.criado_em,
  };
}

export function destinoNotificacao(
  notificacao: Pick<Notificacao, "tipo" | "galpaoId">
): DestinoNotificacao {
  if (notificacao.tipo === "pedido_acesso" && notificacao.galpaoId) {
    return { tipo: "acesso", galpaoId: notificacao.galpaoId };
  }
  return { tipo: "nenhum" };
}

export function rotaDestinoNotificacao(
  destino: DestinoNotificacao
): string | null {
  if (destino.tipo === "acesso") {
    return `/(private)/galpao/${destino.galpaoId}/page?acesso=1`;
  }
  return null;
}

export function contarNaoLidas(notificacoes: Pick<Notificacao, "lida">[]): number {
  return notificacoes.filter((item) => !item.lida).length;
}

export function rotuloContagemNaoLidas(quantidade: number): string {
  if (quantidade <= 0) {
    return "";
  }
  return quantidade > 9 ? "9+" : String(quantidade);
}

export function formatarQuandoNotificacao(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) {
    return "";
  }
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
