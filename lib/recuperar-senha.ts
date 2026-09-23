import * as Linking from "expo-linking";

export function emailRecuperacaoValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function urlRedirecionamentoSenha(): string {
  return Linking.createURL("/redefinir/page");
}

export function urlRedirecionamentoConfirmacao(): string {
  return Linking.createURL("/");
}

export function linkEhRecuperacaoSenha(url: string): boolean {
  return url.includes("redefinir/page");
}

export function extrairCodigoRecuperacao(url: string | null): string | null {
  if (!url) {
    return null;
  }

  const match = url.match(/[?&#]code=([^&#]+)/);
  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
