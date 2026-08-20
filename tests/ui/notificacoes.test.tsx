import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { SinoNotificacoes } from "@/components/notificacoes";
import {
  listarNotificacoes,
  marcarNotificacaoLida,
} from "@/lib/database";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    router: {
      push: jest.fn(),
    },
    useFocusEffect: (callback: () => void | (() => void)) => {
      React.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === "function" ? cleanup : undefined;
      }, [callback]);
    },
  };
});

jest.mock("@/lib/database", () => ({
  listarNotificacoes: jest.fn(),
  marcarNotificacaoLida: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
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

const pedido = {
  id: "n-1",
  usuarioId: "user-1",
  tipo: "pedido_acesso",
  titulo: "Pedido de acesso",
  mensagem: "Bruno pediu acesso ao galpão Norte.",
  lida: false,
  galpaoId: "galpao-1",
  dados: {},
  criadoEm: "2026-01-01T10:00:00.000Z",
};

describe("SinoNotificacoes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (listarNotificacoes as jest.Mock).mockResolvedValue([]);
    (marcarNotificacaoLida as jest.Mock).mockResolvedValue(undefined);
  });

  it("mostra o sino sem badge quando não há pendências", async () => {
    render(<SinoNotificacoes usuarioId="user-1" />);

    expect(
      await screen.findByLabelText("Abrir notificações")
    ).toBeOnTheScreen();
  });

  it("mostra a quantidade de não lidas no sino", async () => {
    (listarNotificacoes as jest.Mock).mockResolvedValue([pedido]);
    render(<SinoNotificacoes usuarioId="user-1" />);

    expect(
      await screen.findByLabelText("Abrir notificações, 1 não lidas")
    ).toBeOnTheScreen();
  });

  it("abre a lista e leva o pedido de acesso ao galpão", async () => {
    (listarNotificacoes as jest.Mock).mockResolvedValue([pedido]);
    render(<SinoNotificacoes usuarioId="user-1" />);
    fireEvent.press(
      await screen.findByLabelText("Abrir notificações, 1 não lidas")
    );

    expect(await screen.findByText("Notificações")).toBeOnTheScreen();
    expect(
      screen.getByText("Bruno pediu acesso ao galpão Norte.")
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText("Pedido de acesso"));

    await waitFor(() => {
      expect(marcarNotificacaoLida).toHaveBeenCalledWith("n-1");
      expect(router.push).toHaveBeenCalledWith(
        "/(private)/galpao/galpao-1/page?acesso=1"
      );
    });
  });

  it("leva o alerta para a página do galpão", async () => {
    (listarNotificacoes as jest.Mock).mockResolvedValue([
      {
        ...pedido,
        tipo: "alerta_galpao",
        titulo: "Alerta no galpão",
        mensagem: "O galpão Norte entrou em alerta.",
      },
    ]);
    render(<SinoNotificacoes usuarioId="user-1" />);
    fireEvent.press(
      await screen.findByLabelText("Abrir notificações, 1 não lidas")
    );
    fireEvent.press(screen.getByLabelText("Alerta no galpão"));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith(
        "/(private)/galpao/galpao-1/page"
      );
    });
  });

  it("leva a aprovação para a página do galpão", async () => {
    (listarNotificacoes as jest.Mock).mockResolvedValue([
      {
        ...pedido,
        tipo: "acesso_aprovado",
        titulo: "Acesso aprovado",
        mensagem: "Seu acesso ao galpão Norte foi aprovado.",
      },
    ]);
    render(<SinoNotificacoes usuarioId="user-1" />);
    fireEvent.press(
      await screen.findByLabelText("Abrir notificações, 1 não lidas")
    );
    fireEvent.press(screen.getByLabelText("Acesso aprovado"));

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith(
        "/(private)/galpao/galpao-1/page"
      );
    });
  });

  it("mostra estado vazio", async () => {
    render(<SinoNotificacoes usuarioId="user-1" />);
    fireEvent.press(await screen.findByLabelText("Abrir notificações"));

    expect(
      await screen.findByText("Nenhuma notificação ainda.")
    ).toBeOnTheScreen();
  });
});
