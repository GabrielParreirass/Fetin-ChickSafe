import { mapearAcessoRow, ordenarAcessos, type AcessoGalpao } from "@/lib/acesso";
import { mapearGalpao } from "@/lib/galpao";
import { supabase } from "@/lib/supabase";
import type { Galpao, GalpaoRow, Leitura, Usuario, UsuarioGalpaoRow } from "@/lib/types";
import type { User } from "@supabase/supabase-js";

function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function formatarCpf(cpf: string): string {
  const digitos = soDigitos(cpf);
  if (digitos.length !== 11) {
    return cpf;
  }
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function unwrapGalpao(row: UsuarioGalpaoRow): Galpao | null {
  const galpao = Array.isArray(row.galpoes) ? row.galpoes[0] : row.galpoes;
  return mapearGalpao(galpao, row.papel);
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

export async function atualizarPerfil(
  userId: string,
  input: { nome: string; telefone: string }
): Promise<Usuario> {
  const nome = input.nome.trim();
  const telefone = input.telefone.trim();

  if (!nome) {
    throw new Error("Informe o nome.");
  }

  if (!telefone) {
    throw new Error("Informe o telefone.");
  }

  const { data, error } = await supabase
    .from("usuarios")
    .update({ nome, telefone })
    .eq("id", userId)
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
    .select(
      "papel, galpao_id, galpoes:galpao_id (id, nome, codigo, limiar_tensao, limiar_corrente)"
    )
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

  const mapped = mapearGalpao(data as GalpaoRow, "dono");
  if (!mapped) {
    throw new Error("Não foi possível criar o galpão.");
  }
  return mapped;
}

export async function atualizarGalpao(input: {
  galpaoId: string;
  nome: string;
  limiarTensao: number;
  limiarCorrente: number;
}): Promise<Galpao> {
  const { data, error } = await supabase.rpc("atualizar_galpao", {
    p_galpao_id: input.galpaoId,
    p_nome: input.nome.trim(),
    p_limiar_tensao: input.limiarTensao,
    p_limiar_corrente: input.limiarCorrente,
  });

  if (error) {
    throw error;
  }

  const mapped = mapearGalpao(data as GalpaoRow, "dono");
  if (!mapped) {
    throw new Error("Não foi possível atualizar o galpão.");
  }
  return mapped;
}

export async function removerAcessoDoGalpao(
  galpaoId: string,
  usuarioId: string
): Promise<void> {
  const { error } = await supabase.rpc("remover_acesso_galpao", {
    p_galpao_id: galpaoId,
    p_usuario_id: usuarioId,
  });

  if (error) {
    throw error;
  }
}

export async function apagarGalpao(galpaoId: string): Promise<void> {
  const { error } = await supabase.rpc("apagar_galpao", {
    p_galpao_id: galpaoId,
  });

  if (error) {
    throw error;
  }
}

export async function listarAcessosDoGalpao(
  galpaoId: string
): Promise<AcessoGalpao[]> {
  const { data, error } = await supabase.rpc("listar_acessos_galpao", {
    p_galpao_id: galpaoId,
  });

  if (!error) {
    return ordenarAcessos(
      (data ?? []).map(
        (row: {
          usuario_id: string;
          nome: string | null;
          email: string | null;
          papel: string;
        }) => ({
          usuarioId: row.usuario_id,
          nome: row.nome?.trim() || "Usuário",
          email: row.email ?? "",
          papel: row.papel,
        })
      )
    );
  }

  const fallback = await supabase
    .from("usuario_galpoes")
    .select("papel, usuario_id, usuarios:usuario_id (id, nome, email)")
    .eq("galpao_id", galpaoId);

  if (fallback.error) {
    throw fallback.error;
  }

  return ordenarAcessos((fallback.data ?? []).map(mapearAcessoRow));
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
  limite = 200
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
