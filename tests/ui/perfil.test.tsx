import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/auth";
import PerfilScreen from "@/app/(private)/perfil/page";
import { usuarioPadrao } from "./helpers/fakes";

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

jest.mock("@/lib/database", () => ({
  formatarCpf: (cpf: string) =>
    cpf === "12345678900" ? "123.456.789-00" : cpf,
}));

jest.mock("@expo/vector-icons/MaterialIcons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ name }: { name: string }) =>
      React.createElement(Text, null, name),
  };
});

const atualizarConta = jest.fn();

describe("PerfilScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      usuario: usuarioPadrao,
      atualizarConta,
    });
  });

  it("mostra os dados atuais e bloqueia e-mail e CPF", () => {
    render(<PerfilScreen />);

    expect(screen.getByDisplayValue("Maria Silva")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("31999990000")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("maria@chicksafe.app")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("123.456.789-00")).toBeOnTheScreen();
    expect(screen.getByText("O e-mail não pode ser alterado.")).toBeOnTheScreen();
    expect(screen.getByText("O CPF não pode ser alterado.")).toBeOnTheScreen();
    expect(screen.getByDisplayValue("maria@chicksafe.app").props.editable).toBe(
      false
    );
    expect(screen.getByDisplayValue("123.456.789-00").props.editable).toBe(false);
  });

  it("mostra erro quando nome ou telefone estão vazios", () => {
    render(<PerfilScreen />);

    fireEvent.changeText(screen.getByDisplayValue("Maria Silva"), " ");
    fireEvent.press(screen.getByText("Salvar"));

    expect(screen.getByText("Preencha nome e telefone.")).toBeOnTheScreen();
    expect(atualizarConta).not.toHaveBeenCalled();
  });

  it("valida senha curta e confirmação", async () => {
    render(<PerfilScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Nova senha"), "123");
    fireEvent.changeText(
      screen.getByPlaceholderText("Confirmar nova senha"),
      "123"
    );
    fireEvent.press(screen.getByText("Salvar"));

    expect(
      screen.getByText("A senha deve ter pelo menos 6 caracteres.")
    ).toBeOnTheScreen();

    fireEvent.changeText(screen.getByPlaceholderText("Nova senha"), "senha123");
    fireEvent.changeText(
      screen.getByPlaceholderText("Confirmar nova senha"),
      "outra"
    );
    fireEvent.press(screen.getByText("Salvar"));

    expect(screen.getByText("As senhas não coincidem.")).toBeOnTheScreen();
    expect(atualizarConta).not.toHaveBeenCalled();
  });

  it("salva nome, telefone e senha", async () => {
    atualizarConta.mockResolvedValue(undefined);
    render(<PerfilScreen />);

    fireEvent.changeText(screen.getByDisplayValue("Maria Silva"), "Maria Souza");
    fireEvent.changeText(screen.getByDisplayValue("31999990000"), "31888887777");
    fireEvent.changeText(screen.getByPlaceholderText("Nova senha"), "senha123");
    fireEvent.changeText(
      screen.getByPlaceholderText("Confirmar nova senha"),
      "senha123"
    );
    fireEvent.press(screen.getByText("Salvar"));

    await waitFor(() => {
      expect(atualizarConta).toHaveBeenCalledWith({
        nome: "Maria Souza",
        telefone: "31888887777",
        senha: "senha123",
      });
    });
    expect(await screen.findByText("Dados atualizados.")).toBeOnTheScreen();
  });

  it("mostra o erro retornado ao salvar", async () => {
    atualizarConta.mockRejectedValue(new Error("falha de rede"));
    render(<PerfilScreen />);

    fireEvent.press(screen.getByText("Salvar"));

    expect(await screen.findByText("falha de rede")).toBeOnTheScreen();
  });

  it("volta pela seta do header", () => {
    render(<PerfilScreen />);

    fireEvent.press(screen.getByLabelText("Voltar"));

    expect(router.back).toHaveBeenCalled();
  });
});
