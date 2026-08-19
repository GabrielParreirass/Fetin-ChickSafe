import { Text } from "react-native";
import { render, screen, waitFor } from "@testing-library/react-native";
import { useRouter, useSegments } from "expo-router";
import { useAuth } from "@/contexts/auth";
import { AuthGate } from "@/contexts/auth-gate";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useSegments: jest.fn(),
}));

jest.mock("@/contexts/auth", () => ({
  useAuth: jest.fn(),
}));

const replace = jest.fn();

describe("AuthGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ replace });
  });

  it("mostra splash enquanto carrega e não redireciona", () => {
    (useAuth as jest.Mock).mockReturnValue({ session: null, loading: true });
    (useSegments as jest.Mock).mockReturnValue(["(auth)", "login", "page"]);

    render(
      <AuthGate>
        <Text>conteudo</Text>
      </AuthGate>
    );

    expect(screen.getByTestId("auth-splash")).toBeOnTheScreen();
    expect(replace).not.toHaveBeenCalled();
  });

  it("manda para a welcome quem tenta rota privada sem sessão", async () => {
    (useAuth as jest.Mock).mockReturnValue({ session: null, loading: false });
    (useSegments as jest.Mock).mockReturnValue(["(private)", "home", "page"]);

    render(
      <AuthGate>
        <Text>conteudo</Text>
      </AuthGate>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/");
    });
    expect(screen.getByTestId("auth-splash")).toBeOnTheScreen();
  });

  it("manda usuário autenticado da área pública para a home", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      session: { user: { id: "user-1" } },
      loading: false,
    });
    (useSegments as jest.Mock).mockReturnValue(["(auth)", "login", "page"]);

    render(
      <AuthGate>
        <Text>conteudo</Text>
      </AuthGate>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/(private)/home/page");
    });
  });

  it("não redireciona sessão autenticada já na área privada", () => {
    (useAuth as jest.Mock).mockReturnValue({
      session: { user: { id: "user-1" } },
      loading: false,
    });
    (useSegments as jest.Mock).mockReturnValue(["(private)", "home", "page"]);

    render(
      <AuthGate>
        <Text>conteudo</Text>
      </AuthGate>
    );

    expect(screen.queryByTestId("auth-splash")).toBeNull();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("conteudo")).toBeOnTheScreen();
  });

  it("não redireciona visitante na tela de login", () => {
    (useAuth as jest.Mock).mockReturnValue({ session: null, loading: false });
    (useSegments as jest.Mock).mockReturnValue(["(auth)", "login", "page"]);

    render(
      <AuthGate>
        <Text>conteudo</Text>
      </AuthGate>
    );

    expect(screen.queryByTestId("auth-splash")).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });
});
