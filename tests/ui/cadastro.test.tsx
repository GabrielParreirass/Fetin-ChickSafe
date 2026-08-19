import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/auth";
import CadastroScreen from "@/app/(auth)/cadastro/page";

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
  soDigitos: (valor: string) => valor.replace(/\D/g, ""),
}));

const signUp = jest.fn();

function preencherCadastroValido() {
  fireEvent.changeText(screen.getByPlaceholderText("Nome completo"), "Maria Silva");
  fireEvent.changeText(screen.getByPlaceholderText("CPF"), "123.456.789-00");
  fireEvent.changeText(screen.getByPlaceholderText("E-mail"), "maria@chicksafe.app");
  fireEvent.changeText(screen.getByPlaceholderText("Telefone"), "31999990000");
  fireEvent.changeText(screen.getByPlaceholderText("Senha"), "senha123");
  fireEvent.changeText(screen.getByPlaceholderText("Confirmar senha"), "senha123");
}

function pressionarCriarConta() {
  const titulos = screen.getAllByText("Criar Conta");
  fireEvent.press(titulos[titulos.length - 1]);
}

describe("CadastroScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (useAuth as jest.Mock).mockReturnValue({ signUp });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("alerta quando faltam campos obrigatórios", () => {
    render(<CadastroScreen />);

    pressionarCriarConta();

    expect(Alert.alert).toHaveBeenCalledWith(
      "Cadastro",
      "Preencha nome, e-mail, telefone e senha."
    );
    expect(signUp).not.toHaveBeenCalled();
  });

  it("alerta quando o CPF não tem 11 dígitos", () => {
    render(<CadastroScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Nome completo"), "Maria");
    fireEvent.changeText(screen.getByPlaceholderText("CPF"), "1234567890");
    fireEvent.changeText(screen.getByPlaceholderText("E-mail"), "maria@chicksafe.app");
    fireEvent.changeText(screen.getByPlaceholderText("Telefone"), "31999990000");
    fireEvent.changeText(screen.getByPlaceholderText("Senha"), "senha123");
    pressionarCriarConta();

    expect(Alert.alert).toHaveBeenCalledWith(
      "Cadastro",
      "Informe um CPF com 11 dígitos."
    );
  });

  it("alerta quando a senha é curta", () => {
    render(<CadastroScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Nome completo"), "Maria");
    fireEvent.changeText(screen.getByPlaceholderText("CPF"), "12345678900");
    fireEvent.changeText(screen.getByPlaceholderText("E-mail"), "maria@chicksafe.app");
    fireEvent.changeText(screen.getByPlaceholderText("Telefone"), "31999990000");
    fireEvent.changeText(screen.getByPlaceholderText("Senha"), "123");
    fireEvent.changeText(screen.getByPlaceholderText("Confirmar senha"), "123");
    pressionarCriarConta();

    expect(Alert.alert).toHaveBeenCalledWith(
      "Cadastro",
      "A senha deve ter pelo menos 6 caracteres."
    );
  });

  it("alerta quando as senhas não coincidem", () => {
    render(<CadastroScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Nome completo"), "Maria");
    fireEvent.changeText(screen.getByPlaceholderText("CPF"), "12345678900");
    fireEvent.changeText(screen.getByPlaceholderText("E-mail"), "maria@chicksafe.app");
    fireEvent.changeText(screen.getByPlaceholderText("Telefone"), "31999990000");
    fireEvent.changeText(screen.getByPlaceholderText("Senha"), "senha123");
    fireEvent.changeText(screen.getByPlaceholderText("Confirmar senha"), "outra");
    pressionarCriarConta();

    expect(Alert.alert).toHaveBeenCalledWith("Cadastro", "As senhas não coincidem.");
  });

  it("envia o cadastro com CPF só com dígitos", async () => {
    signUp.mockResolvedValue({ needsConfirmation: false });
    render(<CadastroScreen />);
    preencherCadastroValido();
    fireEvent.changeText(
      screen.getByPlaceholderText("Código de Galpão (opcional)"),
      "abc123"
    );
    pressionarCriarConta();

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        nome: "Maria Silva",
        cpf: "12345678900",
        email: "maria@chicksafe.app",
        telefone: "31999990000",
        senha: "senha123",
        codigoGalpao: "abc123",
      });
    });
  });

  it("avisa para confirmar e-mail e volta ao login", async () => {
    signUp.mockResolvedValue({ needsConfirmation: true });
    render(<CadastroScreen />);
    preencherCadastroValido();
    pressionarCriarConta();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Confirme seu e-mail",
        "Sua conta foi criada. Confirme o e-mail e depois faça login."
      );
      expect(router.navigate).toHaveBeenCalledWith("/(auth)/login/page");
    });
  });

  it("navega para o login quando já tem conta", () => {
    render(<CadastroScreen />);

    fireEvent.press(screen.getByText("Já tenho uma conta"));

    expect(router.navigate).toHaveBeenCalledWith("/(auth)/login/page");
  });

  it("mostra o erro retornado pelo cadastro", async () => {
    signUp.mockRejectedValue(new Error("User already registered"));
    render(<CadastroScreen />);
    preencherCadastroValido();
    pressionarCriarConta();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Cadastro",
        "User already registered"
      );
    });
  });
});
