import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { entrarGalpaoPorCodigo, garantirPerfil } from "@/lib/database";
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
  recarregarUsuario: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

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
      (_event, nextSession) => {
        setSession(nextSession);
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
    setUsuario(null);
  }, []);

  const recarregarUsuario = useCallback(async () => {
    await carregarPerfil(session?.user ?? null);
  }, [carregarPerfil, session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      usuario,
      loading,
      signIn,
      signUp,
      signOut,
      recarregarUsuario,
    }),
    [session, usuario, loading, signIn, signUp, signOut, recarregarUsuario]
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
