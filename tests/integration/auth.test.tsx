jest.mock("expo-linking", () => ({
  createURL: jest.fn((path: string) => {
    const limpo = String(path).replace(/^\//, "");
    return limpo ? `appchicksafe://${limpo}` : "appchicksafe://";
  }),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateUser: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      exchangeCodeForSession: jest.fn(),
    },
  },
}));

jest.mock("@/lib/database", () => ({
  garantirPerfil: jest.fn(),
  entrarGalpaoPorCodigo: jest.fn(),
  atualizarPerfil: jest.fn(),
}));

import { useState } from "react";
import { Text, Pressable } from "react-native";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import type { Session, User } from "@supabase/supabase-js";
import { AuthProvider, useAuth } from "@/contexts/auth";
import { atualizarPerfil, entrarGalpaoPorCodigo, garantirPerfil } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import type { Usuario } from "@/lib/types";
import * as Linking from "expo-linking";

const PERFIL: Usuario = {
  id: "user-1",
  nome: "Maria Silva",
  cpf: "12345678900",
  email: "maria@chicksafe.app",
  telefone: "31999990000",
};

const USER = {
  id: "user-1",
  email: "maria@chicksafe.app",
} as User;

const SESSION = { user: USER } as Session;

function AuthStatus() {
  const {
    loading,
    usuario,
    user,
    signIn,
    signUp,
    signOut,
    recarregarUsuario,
    atualizarConta,
    recuperacaoPendente,
    solicitarRecuperacao,
    definirNovaSenha,
    cancelarRecuperacao,
  } = useAuth();
  const [erro, setErro] = useState("nenhum");
  const [cadastro, setCadastro] = useState("nenhum");

  return (
    <>
      <Text>{`loading:${loading ? "sim" : "nao"}`}</Text>
      <Text>{`usuario:${usuario?.nome ?? "nenhum"}`}</Text>
      <Text>{`email:${user?.email ?? "nenhum"}`}</Text>
      <Text>{`erro:${erro}`}</Text>
      <Text>{`cadastro:${cadastro}`}</Text>
      <Text>{`recuperacao:${recuperacaoPendente ? "sim" : "nao"}`}</Text>
      <Pressable
        onPress={() => {
          void signIn("  MARIA@ChickSafe.APP ", "senha123").catch((error) => {
            setErro(error instanceof Error ? error.message : "falha");
          });
        }}
      >
        <Text>entrar</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void signUp({
            nome: " Maria ",
            cpf: "12345678900",
            email: "  JOAO@ChickSafe.APP ",
            telefone: " 31999990000 ",
            senha: "senha123",
            codigoGalpao: " abc123 ",
          })
            .then((resultado) => {
              setCadastro(resultado.needsConfirmation ? "pendente" : "ok");
            })
            .catch((error) => {
              setErro(error instanceof Error ? error.message : "falha");
            });
        }}
      >
        <Text>cadastrar</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void signUp({
            nome: "Maria",
            cpf: "12345678900",
            email: "maria@chicksafe.app",
            telefone: "31999990000",
            senha: "senha123",
          }).then((resultado) => {
            setCadastro(resultado.needsConfirmation ? "pendente" : "ok");
          });
        }}
      >
        <Text>cadastrar-sem-codigo</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void signOut().catch((error) => {
            setErro(error instanceof Error ? error.message : "falha");
          });
        }}
      >
        <Text>sair</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void recarregarUsuario();
        }}
      >
        <Text>recarregar</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void atualizarConta({
            nome: " Maria Souza ",
            telefone: " 31888887777 ",
            senha: "nova123",
            senhaAtual: "atual123",
          }).catch((error) => {
            setErro(error instanceof Error ? error.message : "falha");
          });
        }}
      >
        <Text>atualizar-conta</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void atualizarConta({
            nome: "Maria",
            telefone: "31999990000",
          }).catch((error) => {
            setErro(error instanceof Error ? error.message : "falha");
          });
        }}
      >
        <Text>atualizar-sem-senha</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void solicitarRecuperacao("  MARIA@ChickSafe.APP ").catch((error) => {
            setErro(error instanceof Error ? error.message : "falha");
          });
        }}
      >
        <Text>recuperar</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void definirNovaSenha("nova123").catch((error) => {
            setErro(error instanceof Error ? error.message : "falha");
          });
        }}
      >
        <Text>definir-senha</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          void cancelarRecuperacao().catch((error) => {
            setErro(error instanceof Error ? error.message : "falha");
          });
        }}
      >
        <Text>cancelar-recuperacao</Text>
      </Pressable>
    </>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <AuthStatus />
    </AuthProvider>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
    (garantirPerfil as jest.Mock).mockResolvedValue(PERFIL);
    (entrarGalpaoPorCodigo as jest.Mock).mockResolvedValue("galpao-1");
    (atualizarPerfil as jest.Mock).mockResolvedValue({
      ...PERFIL,
      nome: "Maria Souza",
      telefone: "31888887777",
    });
    (supabase.auth.updateUser as jest.Mock).mockResolvedValue({ error: null });
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({
      error: null,
    });
    (supabase.auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({
      error: null,
    });
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(null);
    (Linking.addEventListener as jest.Mock).mockReturnValue({
      remove: jest.fn(),
    });
  });

  it("inicia sem sessão e encerra o loading", async () => {
    renderAuth();

    expect(await screen.findByText("loading:nao")).toBeOnTheScreen();
    expect(screen.getByText("usuario:nenhum")).toBeOnTheScreen();
  });

  it("carrega o perfil quando já existe sessão", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: SESSION },
    });
    renderAuth();

    expect(await screen.findByText("usuario:Maria Silva")).toBeOnTheScreen();
    expect(screen.getByText("email:maria@chicksafe.app")).toBeOnTheScreen();
    expect(garantirPerfil).toHaveBeenCalledWith(USER);
  });

  it("zera o perfil quando garantirPerfil falha", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: SESSION },
    });
    (garantirPerfil as jest.Mock).mockRejectedValue(new Error("cpf invalido"));
    renderAuth();

    expect(await screen.findByText("loading:nao")).toBeOnTheScreen();
    expect(screen.getByText("usuario:nenhum")).toBeOnTheScreen();
  });

  it("faz login com e-mail normalizado", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: null,
    });
    renderAuth();
    await screen.findByText("loading:nao");

    fireEvent.press(screen.getByText("entrar"));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "maria@chicksafe.app",
        password: "senha123",
      });
    });
  });

  it("propaga erro de login", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: new Error("Invalid login credentials"),
    });
    renderAuth();
    await screen.findByText("loading:nao");

    fireEvent.press(screen.getByText("entrar"));

    expect(await screen.findByText("erro:Invalid login credentials")).toBeOnTheScreen();
  });

  it("retorna needsConfirmation quando o cadastro não cria sessão", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });
    renderAuth();
    await screen.findByText("loading:nao");

    fireEvent.press(screen.getByText("cadastrar"));

    expect(await screen.findByText("cadastro:pendente")).toBeOnTheScreen();
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: "joao@chicksafe.app",
      password: "senha123",
        options: {
          emailRedirectTo: "appchicksafe://",
          data: {
            nome: "Maria",
            cpf: "12345678900",
            telefone: "31999990000",
          },
        },
    });
    expect(garantirPerfil).not.toHaveBeenCalled();
  });

  it("cria perfil e entra no galpão quando o cadastro já autentica", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { session: SESSION, user: USER },
      error: null,
    });
    renderAuth();
    await screen.findByText("loading:nao");

    fireEvent.press(screen.getByText("cadastrar"));

    expect(await screen.findByText("cadastro:ok")).toBeOnTheScreen();
    expect(garantirPerfil).toHaveBeenCalledWith(USER, {
      nome: " Maria ",
      cpf: "12345678900",
      telefone: " 31999990000 ",
    });
    expect(entrarGalpaoPorCodigo).toHaveBeenCalledWith("abc123");
  });

  it("não chama entrarGalpao quando o código vem vazio", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { session: SESSION, user: USER },
      error: null,
    });
    renderAuth();
    await screen.findByText("loading:nao");

    fireEvent.press(screen.getByText("cadastrar-sem-codigo"));

    expect(await screen.findByText("cadastro:ok")).toBeOnTheScreen();
    expect(entrarGalpaoPorCodigo).not.toHaveBeenCalled();
  });

  it("propaga erro de cadastro", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: { session: null, user: null },
      error: new Error("User already registered"),
    });
    renderAuth();
    await screen.findByText("loading:nao");

    fireEvent.press(screen.getByText("cadastrar"));

    expect(await screen.findByText("erro:User already registered")).toBeOnTheScreen();
  });

  it("trata identities vazio como e-mail já cadastrado", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValue({
      data: {
        session: null,
        user: { ...USER, identities: [] },
      },
      error: null,
    });
    renderAuth();
    await screen.findByText("loading:nao");

    fireEvent.press(screen.getByText("cadastrar"));

    expect(
      await screen.findByText("erro:Este e-mail já está cadastrado.")
    ).toBeOnTheScreen();
    expect(garantirPerfil).not.toHaveBeenCalled();
  });

  it("limpa o perfil no signOut", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: SESSION },
    });
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    renderAuth();
    await screen.findByText("usuario:Maria Silva");

    fireEvent.press(screen.getByText("sair"));

    expect(await screen.findByText("usuario:nenhum")).toBeOnTheScreen();
  });

  it("propaga erro de signOut", async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: new Error("network"),
    });
    renderAuth();
    await screen.findByText("loading:nao");

    fireEvent.press(screen.getByText("sair"));

    expect(await screen.findByText("erro:network")).toBeOnTheScreen();
  });

  it("recarrega o perfil sob demanda", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: SESSION },
    });
    renderAuth();
    await screen.findByText("usuario:Maria Silva");
    (garantirPerfil as jest.Mock).mockResolvedValue({
      ...PERFIL,
      nome: "Maria Atualizada",
    });

    fireEvent.press(screen.getByText("recarregar"));

    expect(await screen.findByText("usuario:Maria Atualizada")).toBeOnTheScreen();
  });

  it("atualiza perfil e senha depois de conferir a senha atual", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: SESSION },
    });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: null,
    });
    renderAuth();
    await screen.findByText("usuario:Maria Silva");

    fireEvent.press(screen.getByText("atualizar-conta"));

    await waitFor(() => {
      expect(atualizarPerfil).toHaveBeenCalledWith("user-1", {
        nome: " Maria Souza ",
        telefone: " 31888887777 ",
      });
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "maria@chicksafe.app",
        password: "atual123",
      });
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: "nova123",
      });
    });
    expect(await screen.findByText("usuario:Maria Souza")).toBeOnTheScreen();
  });

  it("não troca a senha quando a senha atual está errada", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: SESSION },
    });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: new Error("Invalid login credentials"),
    });
    renderAuth();
    await screen.findByText("usuario:Maria Silva");

    fireEvent.press(screen.getByText("atualizar-conta"));

    expect(await screen.findByText("erro:Senha atual incorreta.")).toBeOnTheScreen();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("não troca senha quando ela não vem", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: SESSION },
    });
    renderAuth();
    await screen.findByText("usuario:Maria Silva");

    fireEvent.press(screen.getByText("atualizar-sem-senha"));

    await waitFor(() => {
      expect(atualizarPerfil).toHaveBeenCalled();
    });
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("envia o e-mail de recuperação para o endereço normalizado", async () => {
    renderAuth();
    await screen.findByText("loading:nao");

    fireEvent.press(screen.getByText("recuperar"));

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        "maria@chicksafe.app",
        { redirectTo: "appchicksafe://redefinir/page" }
      );
    });
  });

  it("confirma o e-mail sem abrir a tela de senha nova", async () => {
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(
      "appchicksafe://?code=confirm"
    );
    (supabase.auth.exchangeCodeForSession as jest.Mock).mockResolvedValue({
      error: null,
    });
    renderAuth();

    await waitFor(() => {
      expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith(
        "confirm"
      );
    });
    expect(screen.getByText("recuperacao:nao")).toBeOnTheScreen();
  });

  it("troca o código do link por uma sessão de recuperação", async () => {
    (Linking.getInitialURL as jest.Mock).mockResolvedValue(
      "appchicksafe://redefinir/page?code=abc%201"
    );
    renderAuth();

    expect(await screen.findByText("recuperacao:sim")).toBeOnTheScreen();
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("abc 1");
  });

  it("marca recuperação quando o Supabase emite PASSWORD_RECOVERY", async () => {
    let callback: (event: string, nextSession: Session | null) => void = () => {};
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((fn) => {
      callback = fn;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    renderAuth();
    await screen.findByText("loading:nao");

    await act(async () => {
      callback("PASSWORD_RECOVERY", SESSION);
    });

    expect(await screen.findByText("recuperacao:sim")).toBeOnTheScreen();
  });

  it("salva a senha nova e encerra a recuperação", async () => {
    let callback: (event: string, nextSession: Session | null) => void = () => {};
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((fn) => {
      callback = fn;
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    });
    renderAuth();
    await screen.findByText("loading:nao");
    await act(async () => {
      callback("PASSWORD_RECOVERY", SESSION);
    });
    await screen.findByText("recuperacao:sim");

    fireEvent.press(screen.getByText("definir-senha"));

    await waitFor(() => {
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: "nova123",
      });
    });
    expect(await screen.findByText("recuperacao:nao")).toBeOnTheScreen();
  });

  it("cancela a recuperação saindo da sessão", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: SESSION },
    });
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    renderAuth();
    await screen.findByText("usuario:Maria Silva");

    fireEvent.press(screen.getByText("cancelar-recuperacao"));

    expect(await screen.findByText("usuario:nenhum")).toBeOnTheScreen();
    expect(screen.getByText("recuperacao:nao")).toBeOnTheScreen();
  });
});

describe("useAuth", () => {
  it("lança erro fora do AuthProvider", () => {
    function Fora() {
      useAuth();
      return null;
    }

    expect(() => render(<Fora />)).toThrow(
      "useAuth deve ser usado dentro de AuthProvider"
    );
  });
});
