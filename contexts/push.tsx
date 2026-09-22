import { useAuth } from "@/contexts/auth";
import { salvarPushToken } from "@/lib/database";
import { registrarPush } from "@/lib/push";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PushContextValue = {
  token: string | null;
  erro: string | null;
};

const PushContext = createContext<PushContextValue>({
  token: null,
  erro: null,
});

export function PushProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setToken(null);
      setErro(null);
      return;
    }

    let ativo = true;
    void registrarPush()
      .then((valor) => {
        if (!ativo) {
          return;
        }
        setToken(valor);
        if (valor) {
          console.log("Expo push token:", valor);
          void salvarPushToken(user.id, valor).catch((falha: unknown) => {
            const detalhe =
              falha instanceof Error ? falha.message : "Falha ao salvar token.";
            console.warn("Push token no perfil:", detalhe);
          });
        }
      })
      .catch((error: unknown) => {
        if (!ativo) {
          return;
        }
        const mensagem =
          error instanceof Error ? error.message : "Falha ao registrar push.";
        setErro(mensagem);
        console.warn("Push:", mensagem);
      });

    return () => {
      ativo = false;
    };
  }, [user]);

  const value = useMemo(() => ({ token, erro }), [token, erro]);

  return <PushContext.Provider value={value}>{children}</PushContext.Provider>;
}

export function usePush(): PushContextValue {
  return useContext(PushContext);
}
