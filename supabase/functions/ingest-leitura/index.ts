import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-device-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function sha256Hex(texto: string) {
  const bytes = new TextEncoder().encode(texto);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Use POST" });
  }

  const deviceKey = req.headers.get("x-device-key")?.trim() ?? "";
  if (!deviceKey) {
    return json(401, { error: "Header X-Device-Key ausente" });
  }

  let payload: { energia?: unknown; tensao?: unknown; corrente?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "JSON inválido" });
  }

  const energia = payload.energia;
  const tensao = Number(payload.tensao);
  const corrente = Number(payload.corrente);

  if (energia !== "Fonte" && energia !== "Bateria" && energia !== "USB") {
    return json(400, { error: "energia deve ser Fonte, Bateria ou USB" });
  }
  if (!Number.isFinite(tensao) || tensao < 0 || tensao > 30) {
    return json(400, { error: "tensao inválida (volts, 0–30)" });
  }
  if (!Number.isFinite(corrente) || corrente < 0 || corrente > 2000) {
    return json(400, { error: "corrente inválida (mA, 0–2000)" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY");

  if (!url || !serviceKey) {
    return json(500, { error: "Function sem credencial de serviço" });
  }

  const supabase = createClient(url, serviceKey);
  const chaveHash = await sha256Hex(deviceKey);

  const { data: dispositivo, error: erroDisp } = await supabase
    .from("dispositivos")
    .select("id, galpao_id, ativo")
    .eq("chave_hash", chaveHash)
    .maybeSingle();

  if (erroDisp) {
    return json(500, { error: "Falha ao buscar dispositivo" });
  }
  if (!dispositivo || dispositivo.ativo !== true) {
    return json(401, { error: "Dispositivo inválido ou inativo" });
  }

  const { data: leitura, error: erroInsert } = await supabase
    .from("leituras")
    .insert({
      galpao_id: dispositivo.galpao_id,
      energia,
      tensao,
      corrente,
    })
    .select("id, galpao_id, energia, tensao, corrente, criado_em")
    .single();

  if (erroInsert || !leitura) {
    return json(500, { error: "Falha ao gravar leitura" });
  }

  await supabase
    .from("dispositivos")
    .update({ ultimo_visto_em: new Date().toISOString() })
    .eq("id", dispositivo.id);

  return json(201, { ok: true, leitura });
});
