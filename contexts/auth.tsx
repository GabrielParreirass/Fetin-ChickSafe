import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import {
  extrairCodigoRecuperacao,
  linkEhRecuperacaoSenha,
  urlRedirecionamentoConfirmacao,
  urlRedirecionamentoSenha,
} from "@/lib/recuperar-senha";
import {
  atualizarPerfil,
  entrarGalpaoPorCodigo,
  garantirPerfil,
} from "@/lib/database";
import type { Usuario } from "@/lib/types";

type SignUpInput = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  senha: string;
  codigoGalpao?: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  usuario: Usuario | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  recuperacaoPendente: boolean;
  solicitarRecuperacao: (email: string) => Promise<void>;
  definirNovaSenha: (senha: string) => Promise<void>;
  cancelarRecuperacao: () => Promise<void>;
  recarregarUsuario: () => Promise<void>;
  atualizarConta: (input: {
    nome: string;
    telefone: string;
    senha?: string;
    senhaAtual?: string;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [recuperacaoPendente, setRecuperacaoPendente] = useState(false);
  const codigosUsados = useRef(new Set<string>());

  const carregarPerfil = useCallback(async (user: User | null) => {
    if (!user) {
      setUsuario(null);
      return;
    }

    try {
      const perfil = await garantirPerfil(user);
      setUsuario(perfil);
    } catch {
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) {
        return;
      }
      setSession(data.session);
      carregarPerfil(data.session?.user ?? null).finally(() => {
        if (ativo) {
          setLoading(false);
        }
      });
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        setSession(nextSession);
        if (event === "PASSWORD_RECOVERY") {
          setRecuperacaoPendente(true);
        }
        setTimeout(() => {
          void carregarPerfil(nextSession?.user ?? null);
        }, 0);
      }
    );

    return () => {
      ativo = false;
      listener.subscription.unsubscribe();
    };
  }, [carregarPerfil]);

  const aplicarLinkRecuperacao = useCallback(async (url: string | null) => {
    const codigo = extrairCodigoRecuperacao(url);
    if (!codigo || codigosUsados.current.has(codigo)) {
      return;
    }

    codigosUsados.current.add(codigo);
    const recuperacao = linkEhRecuperacaoSenha(url ?? "");
    if (recuperacao) {
      setRecuperacaoPendente(true);
    }
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    if (error) {
      codigosUsados.current.delete(codigo);
      if (recuperacao) {
        setRecuperacaoPendente(false);
      }
    }
  }, []);

  useEffect(() => {
    let ativo = true;

    const tratar = (url: string | null) => {
      if (!ativo) {
        return;
      }
      void aplicarLinkRecuperacao(url);
    };

    Linking.getInitialURL()
      .then(tratar)
      .catch(() => undefined);

    const assinatura = Linking.addEventListener("url", ({ url }) => tratar(url));

    return () => {
      ativo = false;
      assinatura.remove();
    };
  }, [aplicarLinkRecuperacao]);

  const signIn = useCallback(async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });

    if (error) {
      throw error;
    }
  }, []);

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const email = input.email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.senha,
        options: {
          emailRedirectTo: urlRedirecionamentoConfirmacao(),
          data: {
            nome: input.nome.trim(),
            cpf: input.cpf,
            telefone: input.telefone.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      if (
        data.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        throw new Error("Este e-mail já está cadastrado.");
      }

      if (!data.session || !data.user) {
        return { needsConfirmation: true };
      }

      await garantirPerfil(data.user, {
        nome: input.nome,
        cpf: input.cpf,
        telefone: input.telefone,
      });

      const codigo = input.codigoGalpao?.trim();
      if (codigo) {
        await entrarGalpaoPorCodigo(codigo);
      }

      return { needsConfirmation: false };
    },
    []
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setRecuperacaoPendente(false);
    setUsuario(null);
  }, []);

  const solicitarRecuperacao = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: urlRedirecionamentoSenha() }
    );

    if (error) {
      throw error;
    }
  }, []);

  const definirNovaSenha = useCallback(async (senha: string) => {
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      throw error;
    }
    setRecuperacaoPendente(false);
  }, []);

  const cancelarRecuperacao = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setRecuperacaoPendente(false);
    setUsuario(null);
  }, []);

  const recarregarUsuario = useCallback(async () => {
    await carregarPerfil(session?.user ?? null);
  }, [carregarPerfil, session?.user]);

  const atualizarConta = useCallback(
    async (input: {
      nome: string;
      telefone: string;
      senha?: string;
      senhaAtual?: string;
    }) => {
      const userId = session?.user?.id;
      const email = session?.user?.email;
      if (!userId || !email) {
        throw new Error("Não autenticado.");
      }

      const senha = input.senha?.trim();
      if (senha) {
        const senhaAtual = input.senhaAtual?.trim();
        if (!senhaAtual) {
          throw new Error("Informe a senha atual.");
        }

        const { error: erroAtual } = await supabase.auth.signInWithPassword({
          email,
          password: senhaAtual,
        });
        if (erroAtual) {
          throw new Error("Senha atual incorreta.");
        }
      }

      const perfil = await atualizarPerfil(userId, {
        nome: input.nome,
        telefone: input.telefone,
      });
      setUsuario(perfil);

      if (!senha) {
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) {
        throw error;
      }
    },
    [session?.user?.email, session?.user?.id]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      usuario,
      loading,
      signIn,
      signUp,
      signOut,
      recuperacaoPendente,
      solicitarRecuperacao,
      definirNovaSenha,
      cancelarRecuperacao,
      recarregarUsuario,
      atualizarConta,
    }),
    [
      session,
      usuario,
      loading,
      signIn,
      signUp,
      signOut,
      recuperacaoPendente,
      solicitarRecuperacao,
      definirNovaSenha,
      cancelarRecuperacao,
      recarregarUsuario,
      atualizarConta,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
