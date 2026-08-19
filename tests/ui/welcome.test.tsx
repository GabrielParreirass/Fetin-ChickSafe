import { render, screen, fireEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import WelcomeScreen from "@/app/index";

jest.mock("expo-router", () => ({
  router: {
    navigate: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

describe("WelcomeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("mostra a mensagem de boas-vindas e as ações principais", () => {
    render(<WelcomeScreen />);

    expect(screen.getByText("Bem-vindo ao ChickSafe!")).toBeOnTheScreen();
    expect(screen.getByText("Fazer Login")).toBeOnTheScreen();
    expect(screen.getByText("Criar Conta")).toBeOnTheScreen();
  });

  it("navega para o login", () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByText("Fazer Login"));

    expect(router.navigate).toHaveBeenCalledWith("/(auth)/login/page");
  });

  it("navega para o cadastro", () => {
    render(<WelcomeScreen />);

    fireEvent.press(screen.getByText("Criar Conta"));

    expect(router.navigate).toHaveBeenCalledWith("/(auth)/cadastro/page");
  });
});
