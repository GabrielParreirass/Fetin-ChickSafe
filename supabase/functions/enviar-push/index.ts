import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type NotificacaoRecord = {
  usuario_id?: unknown;
  tipo?: unknown;
  titulo?: unknown;
  mensagem?: unknown;
};

type WebhookBody = {
  type?: unknown;
  table?: unknown;
  record?: NotificacaoRecord;
  usuario_id?: unknown;
  tipo?: unknown;
  titulo?: unknown;
  mensagem?: unknown;
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function recordDaNotificacao(body: WebhookBody): NotificacaoRecord | null {
  if (body.record && typeof body.record === "object") {
    return body.record;
  }
  if (body.usuario_id) {
    return {
      usuario_id: body.usuario_id,
      tipo: body.tipo,
      titulo: body.titulo,
      mensagem: body.mensagem,
    };
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Use POST" });
  }

  let body: WebhookBody;
  try {
    body = (await req.json()) as WebhookBody;
  } catch {
    return json(400, { error: "JSON inválido" });
  }

  if (texto(body.table) && texto(body.table) !== "notificacoes") {
    return json(200, { ok: true, skipped: "tabela" });
  }
  if (texto(body.type) && texto(body.type) !== "INSERT") {
    return json(200, { ok: true, skipped: "evento" });
  }

  const record = recordDaNotificacao(body);
  if (!record) {
    return json(400, { error: "Payload sem notificacao" });
  }

  const tipo = texto(record.tipo);
  if (
    tipo !== "alerta_galpao" &&
    tipo !== "retorno_normal" &&
    tipo !== "sensor_offline"
  ) {
    return json(200, { ok: true, skipped: "tipo" });
  }

  const usuarioId = texto(record.usuario_id);
  if (!usuarioId) {
    return json(400, { error: "usuario_id ausente" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY");

  if (!url || !serviceKey) {
    return json(500, { error: "Function sem credencial de serviço" });
  }

  const supabase = createClient(url, serviceKey);
  const { data: linhas, error } = await supabase
    .from("push_tokens")
    .select("token")
    .eq("usuario_id", usuarioId);

  if (error) {
    return json(500, { error: "Falha ao buscar token" });
  }

  const tokens = (linhas ?? [])
    .map((linha) => texto(linha.token))
    .filter((token) => token.length > 0);
  if (tokens.length === 0) {
    return json(200, { ok: true, skipped: "sem_token" });
  }

  const titulo = texto(record.titulo) || "ChickSafe";
  const mensagem = texto(record.mensagem) || "Seu galpão entrou em alerta.";

  const expoResp = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: tokens,
      sound: "default",
      title: titulo,
      body: mensagem,
      channelId: "default",
    }),
  });

  const expoJson = await expoResp.json().catch(() => null);
  if (!expoResp.ok) {
    return json(502, { error: "Falha no Expo Push", expo: expoJson });
  }

  return json(200, { ok: true, expo: expoJson });
});
