import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/auth";
import {
  criarGalpao,
  entrarGalpaoPorCodigo,
  listarGalpoesDoUsuario,
} from "@/lib/database";
import HomeLogadaScreen from "@/app/(private)/home/page";
import { galpaoNorte, userAuthPadrao, usuarioPadrao } from "./helpers/fakes";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    router: {
      navigate: jest.fn(),
      push: jest.fn(),
      back: jest.fn(),
      replace: jest.fn(),
    },
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, [callback]);
    },
  };
});

jest.mock("@/contexts/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/contexts/simulador", () => ({
  useSimulador: () => ({
    ativo: false,
    ultima: null,
    iniciar: jest.fn(),
    parar: jest.fn(),
  }),
}));

jest.mock("@/lib/database", () => ({
  listarGalpoesDoUsuario: jest.fn(),
  entrarGalpaoPorCodigo: jest.fn(),
  criarGalpao: jest.fn(),
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

const signOut = jest.fn();

describe("HomeLogadaScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (useAuth as jest.Mock).mockReturnValue({
      usuario: usuarioPadrao,
      user: userAuthPadrao,
      signOut,
    });
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("cumprimenta pelo primeiro nome", async () => {
    render(<HomeLogadaScreen />);

    expect(await screen.findByText("Olá, Maria!")).toBeOnTheScreen();
  });

  it("mostra estado vazio quando o usuário não tem galpão", async () => {
    render(<HomeLogadaScreen />);

    expect(
      await screen.findByText(
        "Você ainda não está em nenhum galpão. Entre com um código ou crie o primeiro."
      )
    ).toBeOnTheScreen();
  });

  it("lista galpões e abre o detalhe ao tocar", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
    render(<HomeLogadaScreen />);

    expect(await screen.findByText("Galpão Norte")).toBeOnTheScreen();
    expect(screen.getByText("ABC123")).toBeOnTheScreen();

    fireEvent.press(screen.getByText("Galpão Norte"));

    expect(router.push).toHaveBeenCalledWith("/(private)/galpao/galpao-1/page");
  });

  it("abre o histórico pelo botão do header", async () => {
    render(<HomeLogadaScreen />);
    await screen.findByText("Olá, Maria!");

    fireEvent.press(screen.getByLabelText("Abrir histórico"));

    expect(router.push).toHaveBeenCalledWith("/(private)/historico/page");
  });

  it("alerta se tentar entrar sem código", async () => {
    render(<HomeLogadaScreen />);
    await screen.findByText("Olá, Maria!");

    fireEvent.press(screen.getByText("Entrar com código"));
    expect(screen.getByText("Entrar em um galpão")).toBeOnTheScreen();

    fireEvent.press(screen.getByText("Confirmar"));

    expect(Alert.alert).toHaveBeenCalledWith("Galpão", "Informe o código.");
    expect(entrarGalpaoPorCodigo).not.toHaveBeenCalled();
  });

  it("entra em galpão pelo código e recarrega a lista", async () => {
    (entrarGalpaoPorCodigo as jest.Mock).mockResolvedValue("galpao-1");
    (listarGalpoesDoUsuario as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([galpaoNorte]);

    render(<HomeLogadaScreen />);
    await screen.findByText("Olá, Maria!");

    fireEvent.press(screen.getByText("Entrar com código"));
    fireEvent.changeText(screen.getByPlaceholderText("Código"), "abc123");
    fireEvent.press(screen.getByText("Confirmar"));

    await waitFor(() => {
      expect(entrarGalpaoPorCodigo).toHaveBeenCalledWith("abc123");
      expect(screen.getByText("Galpão Norte")).toBeOnTheScreen();
    });
  });

  it("cria galpão e mostra o código gerado", async () => {
    (criarGalpao as jest.Mock).mockResolvedValue(galpaoNorte);
    render(<HomeLogadaScreen />);
    await screen.findByText("Olá, Maria!");

    fireEvent.press(screen.getByText("Novo galpão"));
    fireEvent.changeText(
      screen.getByPlaceholderText("Nome do galpão"),
      "Galpão Norte"
    );
    fireEvent.press(screen.getByText("Confirmar"));

    await waitFor(() => {
      expect(criarGalpao).toHaveBeenCalledWith("Galpão Norte");
      expect(Alert.alert).toHaveBeenCalledWith(
        "Galpão criado",
        "Código para convidar outros usuários: ABC123"
      );
    });
  });

  it("chama signOut pelo botão Sair", async () => {
    signOut.mockResolvedValue(undefined);
    render(<HomeLogadaScreen />);
    await screen.findByText("Olá, Maria!");

    fireEvent.press(screen.getByLabelText("Sair"));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalled();
    });
  });

  it("alerta se o logout falhar", async () => {
    signOut.mockRejectedValue(new Error("sessão expirada"));
    render(<HomeLogadaScreen />);
    await screen.findByText("Olá, Maria!");

    fireEvent.press(screen.getByLabelText("Sair"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Sair", "sessão expirada");
    });
  });

  it("alerta quando a lista de galpões falha", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockRejectedValue(
      new Error("falha de rede")
    );
    render(<HomeLogadaScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Galpões", "falha de rede");
    });
  });

  it("alerta se tentar criar galpão sem nome", async () => {
    render(<HomeLogadaScreen />);
    await screen.findByText("Olá, Maria!");

    fireEvent.press(screen.getByText("Novo galpão"));
    fireEvent.press(screen.getByText("Confirmar"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Galpão",
      "Informe o nome do galpão."
    );
    expect(criarGalpao).not.toHaveBeenCalled();
  });

  it("fecha o modal ao cancelar", async () => {
    render(<HomeLogadaScreen />);
    await screen.findByText("Olá, Maria!");

    fireEvent.press(screen.getByText("Entrar com código"));
    expect(screen.getByText("Entrar em um galpão")).toBeOnTheScreen();

    fireEvent.press(screen.getByText("Cancelar"));

    await waitFor(() => {
      expect(screen.queryByText("Entrar em um galpão")).toBeNull();
    });
  });

  it("mostra erro ao entrar com código inválido", async () => {
    (entrarGalpaoPorCodigo as jest.Mock).mockRejectedValue(
      new Error("Código de galpão inválido")
    );
    render(<HomeLogadaScreen />);
    await screen.findByText("Olá, Maria!");

    fireEvent.press(screen.getByText("Entrar com código"));
    fireEvent.changeText(screen.getByPlaceholderText("Código"), "XXXXXX");
    fireEvent.press(screen.getByText("Confirmar"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Galpão",
        "Código de galpão inválido"
      );
    });
  });
});
