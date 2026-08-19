export function mensagemDeErro(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return traduzirErroAuth(error.message);
  }

  if (
    typeof error === "object" &&
    error != null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return traduzirErroAuth(error.message);
  }

  return fallback;
}

export function traduzirErroAuth(mensagem: string): string {
  const texto = mensagem.toLowerCase();

  if (texto.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (texto.includes("already registered") || texto.includes("user already")) {
    return "Este e-mail já está cadastrado.";
  }
  if (texto.includes("password should be") || texto.includes("at least 6")) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }
  if (texto.includes("unable to validate email") || texto.includes("invalid email")) {
    return "Informe um e-mail válido.";
  }

  return mensagem;
}
