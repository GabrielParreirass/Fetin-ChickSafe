import { supabase } from "@/lib/supabase";
import type { Galpao, Leitura, Usuario, UsuarioGalpaoRow } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function unwrapGalpao(row: UsuarioGalpaoRow): Galpao | null {
  const galpao = Array.isArray(row.galpoes) ? row.galpoes[0] : row.galpoes;
  return galpao ?? null;
}

export async function buscarUsuario(userId: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome, cpf, email, telefone")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function garantirPerfil(
  user: User,
  extras?: { nome?: string; cpf?: string; telefone?: string }
): Promise<Usuario> {
  const existente = await buscarUsuario(user.id);
  if (existente) {
    return existente;
  }

  const nome =
    extras?.nome?.trim() ||
    (typeof user.user_metadata?.nome === "string" ? user.user_metadata.nome : "") ||
    user.email ||
    "Usuário";
  const cpf =
    soDigitos(extras?.cpf ?? "") ||
    soDigitos(
      typeof user.user_metadata?.cpf === "string" ? user.user_metadata.cpf : ""
    );
  const telefone =
    extras?.telefone?.trim() ||
    (typeof user.user_metadata?.telefone === "string"
      ? user.user_metadata.telefone
      : "") ||
    "";
  const email = user.email ?? "";

  if (!cpf || cpf.length !== 11) {
    throw new Error("CPF é obrigatório e deve ter 11 dígitos.");
  }

  if (!telefone) {
    throw new Error("Telefone é obrigatório.");
  }

  const { data, error } = await supabase
    .from("usuarios")
    .insert({
      id: user.id,
      nome,
      cpf,
      email,
      telefone,
    })
    .select("id, nome, cpf, email, telefone")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listarGalpoesDoUsuario(userId: string): Promise<Galpao[]> {
  const { data, error } = await supabase
    .from("usuario_galpoes")
    .select("galpao_id, galpoes:galpao_id (id, nome, codigo)")
    .eq("usuario_id", userId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as UsuarioGalpaoRow[])
    .map(unwrapGalpao)
    .filter((item): item is Galpao => item != null);
}

export async function entrarGalpaoPorCodigo(codigo: string): Promise<string> {
  const { data, error } = await supabase.rpc("entrar_galpao", {
    p_codigo: codigo.trim().toUpperCase(),
  });

  if (error) {
    throw error;
  }

  return data as string;
}

export async function criarGalpao(nome: string): Promise<Galpao> {
  const { data, error } = await supabase.rpc("criar_galpao", {
    p_nome: nome.trim(),
  });

  if (error) {
    throw error;
  }

  return data as Galpao;
}

export async function buscarUltimaLeitura(
  galpaoId: string
): Promise<Leitura | null> {
  const { data, error } = await supabase
    .from("leituras")
    .select("id, galpao_id, energia, tensao, corrente, criado_em")
    .eq("galpao_id", galpaoId)
    .order("criado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listarLeituras(
  galpaoId?: string,
  limite = 50
): Promise<Leitura[]> {
  let query = supabase
    .from("leituras")
    .select("id, galpao_id, energia, tensao, corrente, criado_em")
    .order("criado_em", { ascending: false })
    .limit(limite);

  if (galpaoId) {
    query = query.eq("galpao_id", galpaoId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export { soDigitos };
