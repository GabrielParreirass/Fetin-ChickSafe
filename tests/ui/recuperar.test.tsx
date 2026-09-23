import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/contexts/auth";
import RecuperarSenhaScreen from "@/app/(auth)/recuperar/page";

jest.mock("expo-router", () => ({
  router: {
    navigate: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock("@/contexts/auth", () => ({
  useAuth: jest.fn(),
}));

const solicitarRecuperacao = jest.fn();

describe("RecuperarSenhaScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    (useAuth as jest.Mock).mockReturnValue({ solicitarRecuperacao });
  });

  it("recusa e-mail inválido", () => {
    render(<RecuperarSenhaScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("E-mail"), "maria");
    fireEvent.press(screen.getByText("Enviar link"));

    expect(screen.getByText("Informe um e-mail válido.")).toBeOnTheScreen();
    expect(solicitarRecuperacao).not.toHaveBeenCalled();
  });

  it("envia o link e confirma na tela", async () => {
    solicitarRecuperacao.mockResolvedValue(undefined);
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      email: "maria@chicksafe.app",
    });
    render(<RecuperarSenhaScreen />);

    fireEvent.press(screen.getByText("Enviar link"));

    await waitFor(() => {
      expect(solicitarRecuperacao).toHaveBeenCalledWith("maria@chicksafe.app");
    });
    expect(
      screen.getByText(
        "Se esse e-mail estiver cadastrado, o link já foi enviado. Confira também a caixa de spam."
      )
    ).toBeOnTheScreen();
  });

  it("mostra o erro quando o envio falha", async () => {
    solicitarRecuperacao.mockRejectedValue(
      new Error("For security purposes, you can only request this after 60 seconds.")
    );
    render(<RecuperarSenhaScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("E-mail"), "maria@chicksafe.app");
    fireEvent.press(screen.getByText("Enviar link"));

    expect(
      await screen.findByText("Aguarde um pouco antes de pedir outro e-mail.")
    ).toBeOnTheScreen();
  });

  it("volta ao login", () => {
    render(<RecuperarSenhaScreen />);

    fireEvent.press(screen.getByText("Voltar ao login"));

    expect(router.navigate).toHaveBeenCalledWith("/(auth)/login/page");
  });
});
