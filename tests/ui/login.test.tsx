import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/auth";
import LoginScreen from "@/app/(auth)/login/page";

jest.mock("expo-router", () => ({
  router: {
    navigate: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock("@/contexts/auth", () => ({
  useAuth: jest.fn(),
}));

const signIn = jest.fn();

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (useAuth as jest.Mock).mockReturnValue({ signIn });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renderiza os campos de e-mail, senha e o botão Entrar", () => {
    render(<LoginScreen />);

    expect(screen.getByText("Login")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("E-mail")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Senha")).toBeOnTheScreen();
    expect(screen.getByText("Entrar")).toBeOnTheScreen();
  });

  it("mostra erro na tela quando e-mail ou senha estão vazios", () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText("Entrar"));

    expect(screen.getByText("Preencha e-mail e senha.")).toBeOnTheScreen();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("chama signIn com os dados preenchidos", async () => {
    signIn.mockResolvedValue(undefined);
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("E-mail"), "maria@chicksafe.app");
    fireEvent.changeText(screen.getByPlaceholderText("Senha"), "senha123");
    fireEvent.press(screen.getByText("Entrar"));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("maria@chicksafe.app", "senha123");
    });
  });

  it("mostra erro na tela quando o login falha", async () => {
    signIn.mockRejectedValue(new Error("Invalid login credentials"));
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("E-mail"), "maria@chicksafe.app");
    fireEvent.changeText(screen.getByPlaceholderText("Senha"), "errada");
    fireEvent.press(screen.getByText("Entrar"));

    expect(
      await screen.findByText("E-mail ou senha incorretos.")
    ).toBeOnTheScreen();
  });

  it("navega para o cadastro", () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText("Criar uma conta"));

    expect(router.navigate).toHaveBeenCalledWith("/(auth)/cadastro/page");
  });

  it("explica que recuperar senha ainda não está disponível", () => {
    render(<LoginScreen />);

    fireEvent.press(screen.getByText("Esqueci minha senha"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Recuperar senha",
      "Ainda não está disponível. Peça a um colega com acesso ao painel do Supabase."
    );
  });
});
