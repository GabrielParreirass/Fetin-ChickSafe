import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/auth";
import RedefinirSenhaScreen from "@/app/(auth)/redefinir/page";

jest.mock("expo-router", () => ({
  router: {
    navigate: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock("@/contexts/auth", () => ({
  useAuth: jest.fn(),
}));

const definirNovaSenha = jest.fn();
const cancelarRecuperacao = jest.fn();

function mockAuth(parcial: Record<string, unknown> = {}) {
  (useAuth as jest.Mock).mockReturnValue({
    session: { user: { id: "user-1" } },
    recuperacaoPendente: true,
    definirNovaSenha,
    cancelarRecuperacao,
    ...parcial,
  });
}

describe("RedefinirSenhaScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth();
  });

  it("pede outro link quando não há sessão de recuperação", () => {
    mockAuth({ session: null, recuperacaoPendente: false });
    render(<RedefinirSenhaScreen />);

    fireEvent.press(screen.getByText("Pedir um novo link"));

    expect(router.replace).toHaveBeenCalledWith("/(auth)/recuperar/page");
  });

  it("recusa senha curta e senhas diferentes", () => {
    render(<RedefinirSenhaScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Nova senha"), "123");
    fireEvent.press(screen.getByText("Salvar senha"));
    expect(
      screen.getByText("A senha deve ter pelo menos 6 caracteres.")
    ).toBeOnTheScreen();

    fireEvent.changeText(screen.getByPlaceholderText("Nova senha"), "senha123");
    fireEvent.changeText(screen.getByPlaceholderText("Confirmar senha"), "outra");
    fireEvent.press(screen.getByText("Salvar senha"));
    expect(screen.getByText("As senhas não coincidem.")).toBeOnTheScreen();
    expect(definirNovaSenha).not.toHaveBeenCalled();
  });

  it("salva a senha nova", async () => {
    definirNovaSenha.mockResolvedValue(undefined);
    render(<RedefinirSenhaScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Nova senha"), "senha123");
    fireEvent.changeText(screen.getByPlaceholderText("Confirmar senha"), "senha123");
    fireEvent.press(screen.getByText("Salvar senha"));

    await waitFor(() => {
      expect(definirNovaSenha).toHaveBeenCalledWith("senha123");
    });
  });

  it("cancela e volta ao login", async () => {
    cancelarRecuperacao.mockResolvedValue(undefined);
    render(<RedefinirSenhaScreen />);

    fireEvent.press(screen.getByText("Cancelar"));

    await waitFor(() => {
      expect(cancelarRecuperacao).toHaveBeenCalled();
    });
    expect(router.replace).toHaveBeenCalledWith("/(auth)/login/page");
  });
});
