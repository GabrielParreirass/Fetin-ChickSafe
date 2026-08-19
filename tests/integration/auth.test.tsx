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
    },
  },
}));

jest.mock("@/lib/database", () => ({
  garantirPerfil: jest.fn(),
  entrarGalpaoPorCodigo: jest.fn(),
}));

import { useState } from "react";
import { Text, Pressable } from "react-native";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import type { Session, User } from "@supabase/supabase-js";
import { AuthProvider, useAuth } from "@/contexts/auth";
import { entrarGalpaoPorCodigo, garantirPerfil } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import type { Usuario } from "@/lib/types";

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
  const { loading, usuario, user, signIn, signUp, signOut, recarregarUsuario } =
    useAuth();
  const [erro, setErro] = useState("nenhum");
  const [cadastro, setCadastro] = useState("nenhum");

  return (
    <>
      <Text>{`loading:${loading ? "sim" : "nao"}`}</Text>
      <Text>{`usuario:${usuario?.nome ?? "nenhum"}`}</Text>
      <Text>{`email:${user?.email ?? "nenhum"}`}</Text>
      <Text>{`erro:${erro}`}</Text>
      <Text>{`cadastro:${cadastro}`}</Text>
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
