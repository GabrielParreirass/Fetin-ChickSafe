import { useAuth } from "@/contexts/auth";
import { listarGalpoesDoUsuario } from "@/lib/database";
import {
  galpoesParaTesteAlerta,
  publicarEntradaEmAlertaNosGalpoes,
  simularTickEsp32,
} from "@/lib/simulador";
import type { Galpao, Leitura } from "@/lib/types";
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
import { Alert } from "react-native";

const INTERVALO_MS = 60_000;

type SimuladorContextValue = {
  ativo: boolean;
  ultima: Leitura | null;
  iniciar: () => Promise<void>;
  parar: () => void;
  testarAlerta: () => Promise<void>;
};

const SimuladorContext = createContext<SimuladorContextValue | undefined>(
  undefined
);

export function SimuladorProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ativo, setAtivo] = useState(false);
  const [ultima, setUltima] = useState<Leitura | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parar = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setAtivo(false);
  }, []);

  const enviarTick = useCallback(async () => {
    if (!user) {
      throw new Error("Faça login para simular o ESP32.");
    }
    const galpoes = await listarGalpoesDoUsuario(user.id);
    const leitura = await simularTickEsp32(galpoes);
    setUltima(leitura);
    return leitura;
  }, [user]);

  const dispararAlertaNosGalpoes = useCallback(async (alvos: Galpao[]) => {
    try {
      const leitura = await publicarEntradaEmAlertaNosGalpoes(alvos);
      if (leitura) {
        setUltima(leitura);
      }
      const nomes = alvos.map((galpao) => galpao.nome).join(" e ");
      const verbo = alvos.length === 1 ? "entrou" : "entraram";
      Alert.alert(
        "Alerta enviado",
        `${nomes} ${verbo} em alerta. Feche o app (não use Forçar parada) e espere o push.`
      );
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Não foi possível gerar o alerta.";
      Alert.alert("Alerta de teste", mensagem);
    }
  }, []);

  const testarAlerta = useCallback(async () => {
    if (!user) {
      Alert.alert("Alerta de teste", "Faça login para testar o push.");
      return;
    }
    try {
      const galpoes = await listarGalpoesDoUsuario(user.id);
      const alvos = galpoesParaTesteAlerta(galpoes);
      if (alvos.length === 0) {
        throw new Error("Entre em um galpão aprovado para testar o alerta.");
      }
      if (alvos.length === 1) {
        await dispararAlertaNosGalpoes(alvos);
        return;
      }

      Alert.alert("Testar alerta", "Qual galpão deve entrar em alerta?", [
        ...alvos.map((galpao) => ({
          text: galpao.nome,
          onPress: () => {
            void dispararAlertaNosGalpoes([galpao]);
          },
        })),
        {
          text: "Todos os galpões",
          onPress: () => {
            void dispararAlertaNosGalpoes(alvos);
          },
        },
        { text: "Cancelar", style: "cancel" as const },
      ]);
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Não foi possível gerar o alerta.";
      Alert.alert("Alerta de teste", mensagem);
    }
  }, [dispararAlertaNosGalpoes, user]);

  const iniciar = useCallback(async () => {
    try {
      await enviarTick();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timerRef.current = setInterval(() => {
        void enviarTick().catch((error) => {
          const mensagem =
            error instanceof Error ? error.message : "Falha no simulador.";
          Alert.alert("Simulador ESP32", mensagem);
          parar();
        });
      }, INTERVALO_MS);
      setAtivo(true);
    } catch (error) {
      const mensagem =
        error instanceof Error ? error.message : "Não foi possível iniciar.";
      Alert.alert("Simulador ESP32", mensagem);
      parar();
    }
  }, [enviarTick, parar]);

  useEffect(() => {
    if (!user) {
      parar();
    }
  }, [user, parar]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({ ativo, ultima, iniciar, parar, testarAlerta }),
    [ativo, ultima, iniciar, parar, testarAlerta]
  );

  return (
    <SimuladorContext.Provider value={value}>
      {children}
    </SimuladorContext.Provider>
  );
}

export function useSimulador(): SimuladorContextValue {
  const ctx = useContext(SimuladorContext);
  if (!ctx) {
    throw new Error("useSimulador deve ser usado dentro de SimuladorProvider");
  }
  return ctx;
}
