import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/contexts/auth";
import { buscarUltimaLeitura, listarAcessosDoGalpao, listarGalpoesDoUsuario } from "@/lib/database";
import { supabase } from "@/lib/supabase";
import GalpaoDetalheScreen from "@/app/(private)/galpao/[id]/page";
import {
  galpaoNorte,
  galpaoSul,
  leituraAlerta,
  leituraNormal,
  userAuthPadrao,
  usuarioPadrao,
} from "./helpers/fakes";

jest.mock("expo-router", () => ({
  router: {
    navigate: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/contexts/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/database", () => ({
  listarGalpoesDoUsuario: jest.fn(),
  buscarUltimaLeitura: jest.fn(),
  listarAcessosDoGalpao: jest.fn(),
  atualizarGalpao: jest.fn(),
  removerAcessoDoGalpao: jest.fn(),
  apagarGalpao: jest.fn(),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    channel: jest.fn(),
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

describe("GalpaoDetalheScreen", () => {
  let leituraInsert: ((payload: { new: unknown }) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    leituraInsert = undefined;
    (supabase.channel as jest.Mock).mockImplementation(() => {
      const channel = {
        on: jest.fn((_evento, _filtro, callback) => {
          leituraInsert = callback;
          return channel;
        }),
        subscribe: jest.fn(),
      };
      return channel;
    });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "galpao-1" });
    (useAuth as jest.Mock).mockReturnValue({
      usuario: usuarioPadrao,
      user: userAuthPadrao,
    });
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([
      galpaoNorte,
      galpaoSul,
    ]);
    (listarAcessosDoGalpao as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("mostra Sem dados quando o galpão ainda não tem leitura", async () => {
    (buscarUltimaLeitura as jest.Mock).mockResolvedValue(null);
    render(<GalpaoDetalheScreen />);

    expect(await screen.findByText("Energia")).toBeOnTheScreen();
    expect(screen.getAllByText("Galpão Norte").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Sem dados")).toHaveLength(3);
  });

  it("mostra valores normais da última leitura", async () => {
    (buscarUltimaLeitura as jest.Mock).mockResolvedValue(leituraNormal);
    render(<GalpaoDetalheScreen />);

    expect(await screen.findByText("Fonte")).toBeOnTheScreen();
    expect(screen.getByText("4.2 V")).toBeOnTheScreen();
    expect(screen.getByText("80 mA")).toBeOnTheScreen();
  });

  it("mostra leitura em alerta (bateria, tensão e corrente baixas)", async () => {
    (buscarUltimaLeitura as jest.Mock).mockResolvedValue(leituraAlerta);
    render(<GalpaoDetalheScreen />);

    expect(await screen.findByText("Bateria")).toBeOnTheScreen();
    expect(screen.getByText("2.5 V")).toBeOnTheScreen();
    expect(screen.getByText("20 mA")).toBeOnTheScreen();
  });

  it("abre o histórico do galpão selecionado", async () => {
    (buscarUltimaLeitura as jest.Mock).mockResolvedValue(leituraNormal);
    render(<GalpaoDetalheScreen />);
    await screen.findByText("Histórico");

    fireEvent.press(screen.getByText("Histórico"));

    expect(router.push).toHaveBeenCalledWith(
      "/(private)/historico/page?galpaoId=galpao-1"
    );
  });

  it("troca o galpão pelo seletor", async () => {
    (buscarUltimaLeitura as jest.Mock)
      .mockResolvedValueOnce(leituraNormal)
      .mockResolvedValueOnce(leituraAlerta);

    render(<GalpaoDetalheScreen />);
    await screen.findByText("Energia");

    fireEvent.press(screen.getAllByText("Galpão Norte")[0]);
    fireEvent.press(screen.getByText("Galpão Sul"));

    await waitFor(() => {
      expect(buscarUltimaLeitura).toHaveBeenCalledWith("galpao-2");
    });
  });

  it("volta para a home", async () => {
    (buscarUltimaLeitura as jest.Mock).mockResolvedValue(null);
    render(<GalpaoDetalheScreen />);
    await screen.findByText("Olá, Maria!");

    fireEvent.press(screen.getByLabelText("Voltar para a home"));

    expect(router.back).toHaveBeenCalled();
  });

  it("mostra Nenhum galpão quando o usuário não tem vínculo", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([]);
    render(<GalpaoDetalheScreen />);

    expect(await screen.findByText("Nenhum galpão")).toBeOnTheScreen();
    expect(screen.getAllByText("Sem dados")).toHaveLength(3);
  });

  it("alerta quando o carregamento falha", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockRejectedValue(
      new Error("sem permissão")
    );
    render(<GalpaoDetalheScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Galpão", "sem permissão");
    });
  });

  it("atualiza os cards quando chega uma leitura em tempo real", async () => {
    (buscarUltimaLeitura as jest.Mock).mockResolvedValue(leituraNormal);
    render(<GalpaoDetalheScreen />);
    expect(await screen.findByText("Fonte")).toBeOnTheScreen();

    await waitFor(() => {
      expect(leituraInsert).toBeDefined();
    });

    act(() => {
      leituraInsert?.({ new: leituraAlerta });
    });

    expect(await screen.findByText("Bateria")).toBeOnTheScreen();
    expect(screen.getByText("2.5 V")).toBeOnTheScreen();
    expect(screen.getByText("20 mA")).toBeOnTheScreen();
  });

  it("abre o acesso do galpão selecionado", async () => {
    (buscarUltimaLeitura as jest.Mock).mockResolvedValue(leituraNormal);
    (listarAcessosDoGalpao as jest.Mock).mockResolvedValue([
      {
        usuarioId: "user-1",
        nome: "Maria Silva",
        email: "maria@chicksafe.app",
        papel: "dono",
      },
    ]);
    render(<GalpaoDetalheScreen />);
    await screen.findByText("Fonte");

    fireEvent.press(screen.getByLabelText("Ver acesso de Galpão Norte"));

    expect(await screen.findByText("Acesso — Galpão Norte")).toBeOnTheScreen();
    expect(listarAcessosDoGalpao).toHaveBeenCalledWith("galpao-1");
    expect(screen.getByText("Maria Silva — Dono")).toBeOnTheScreen();
  });

  it("abre as configurações do galpão selecionado", async () => {
    (buscarUltimaLeitura as jest.Mock).mockResolvedValue(leituraNormal);
    render(<GalpaoDetalheScreen />);
    await screen.findByText("Fonte");

    fireEvent.press(screen.getByLabelText("Configurar Galpão Norte"));

    expect(
      await screen.findByText("Configurações — Galpão Norte")
    ).toBeOnTheScreen();
    expect(screen.getByText("Limiar de tensão (V)")).toBeOnTheScreen();
  });
});
