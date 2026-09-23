# Gera a chave do ESP, grava em .env.esp.local (gitignored) e mostra o SQL para o painel.
# Uso:  powershell -File scripts/cadastrar-esp.ps1

$ErrorActionPreference = "Stop"
$raiz = Split-Path -Parent $PSScriptRoot
$saida = Join-Path $raiz ".env.esp.local"

$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
$rng.Dispose()
$chave = [BitConverter]::ToString($bytes).Replace("-", "").ToLower()
$galpaoId = "09d787be-c402-4c2a-b363-b483d64511e2"
$projetoUrl = "https://gjzagwbzmulhwlrqhmpl.supabase.co"

@"
# Gerado por scripts/cadastrar-esp.ps1 — NÃO commitar (já coberto por .env*.local)
INGEST_URL=$projetoUrl/functions/v1/ingest-leitura
ESP_GALPAO_ID=$galpaoId
ESP_DEVICE_KEY=$chave
"@ | Set-Content -Path $saida -Encoding utf8

Write-Host ""
Write-Host "Chave salva em .env.esp.local"
Write-Host "Cole isto no SQL Editor do Supabase:"
Write-Host ""
Write-Host "insert into public.dispositivos (galpao_id, nome, chave_hash)"
Write-Host "values ("
Write-Host "  '$galpaoId',"
Write-Host "  'ESP32',"
Write-Host "  encode(digest('$chave', 'sha256'), 'hex')"
Write-Host ");"
Write-Host ""
