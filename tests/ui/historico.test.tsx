import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/contexts/auth";
import { listarGalpoesDoUsuario, listarLeituras } from "@/lib/database";
import HistoricoScreen from "@/app/(private)/historico/page";
import { formatarDataAcessivel } from "@/lib/calendario";
import {
  galpaoNorte,
  galpaoSul,
  leituraAlerta,
  leituraNormal,
  userAuthPadrao,
} from "./helpers/fakes";

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
    useLocalSearchParams: jest.fn(),
  };
});

jest.mock("@/contexts/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/database", () => ({
  listarGalpoesDoUsuario: jest.fn(),
  listarLeituras: jest.fn(),
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

describe("HistoricoScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    (useAuth as jest.Mock).mockReturnValue({ user: userAuthPadrao });
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("mostra estado vazio quando não há mudanças", async () => {
    (listarLeituras as jest.Mock).mockResolvedValue([leituraNormal]);
    render(<HistoricoScreen />);

    expect(
      await screen.findByText(/Nenhuma mudança registrada ainda/)
    ).toBeOnTheScreen();
  });

  it("lista as mudanças extraídas das leituras", async () => {
    (listarLeituras as jest.Mock).mockResolvedValue([
      leituraNormal,
      leituraAlerta,
    ]);
    render(<HistoricoScreen />);

    expect(await screen.findByText("Energia")).toBeOnTheScreen();
    expect(screen.getAllByText("Galpão Norte").length).toBeGreaterThan(0);
    expect(screen.getByText("Anterior: Fonte")).toBeOnTheScreen();
    expect(screen.getByText("Novo: Bateria")).toBeOnTheScreen();
    expect(screen.getByText("Tensão da Bateria")).toBeOnTheScreen();
    expect(screen.getAllByText("Corrente do ventilador").length).toBeGreaterThan(0);
  });

  it("volta pela seta do header", async () => {
    (listarLeituras as jest.Mock).mockResolvedValue([]);
    render(<HistoricoScreen />);
    await screen.findByText("Histórico");

    fireEvent.press(screen.getByLabelText("Voltar"));

    expect(router.back).toHaveBeenCalled();
  });

  it("filtra leituras pelo galpaoId da URL", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ galpaoId: "galpao-2" });
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([
      galpaoNorte,
      galpaoSul,
    ]);
    (listarLeituras as jest.Mock).mockImplementation(async (id: string) => {
      if (id === "galpao-2") {
        return [
          { ...leituraNormal, galpao_id: "galpao-2" },
          { ...leituraAlerta, galpao_id: "galpao-2" },
        ];
      }
      return [leituraNormal];
    });

    render(<HistoricoScreen />);

    expect(await screen.findByText("Energia")).toBeOnTheScreen();
    expect(listarLeituras).toHaveBeenCalledWith("galpao-2");
    expect(listarLeituras).not.toHaveBeenCalledWith("galpao-1");
    expect(screen.getAllByText("Galpão Sul").length).toBeGreaterThan(0);
  });

  it("alerta quando o histórico não carrega", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockRejectedValue(
      new Error("timeout")
    );
    render(<HistoricoScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Histórico", "timeout");
    });
  });

  it("filtra pelo tipo de mudança", async () => {
    (listarLeituras as jest.Mock).mockResolvedValue([
      leituraNormal,
      leituraAlerta,
    ]);
    render(<HistoricoScreen />);
    expect(await screen.findByText("Energia")).toBeOnTheScreen();
    expect(screen.getByText("Tensão da Bateria")).toBeOnTheScreen();

    fireEvent.press(screen.getByText("Tensão da bateria"));

    expect(screen.getByText("Tensão da Bateria")).toBeOnTheScreen();
    expect(screen.queryByText("Anterior: Fonte")).toBeNull();
    expect(screen.queryByText("Anterior: Alerta (20 mA)")).toBeNull();
    expect(screen.getByText("Anterior: Normal (4.2 V)")).toBeOnTheScreen();
    expect(screen.getByText("Novo: Alerta (2.5 V)")).toBeOnTheScreen();
  });

  it("filtra por data escolhida no calendário", async () => {
    (listarLeituras as jest.Mock).mockResolvedValue([
      leituraNormal,
      leituraAlerta,
    ]);
    render(<HistoricoScreen />);
    expect(await screen.findByText("Energia")).toBeOnTheScreen();

    fireEvent.press(screen.getByLabelText("Escolher data inicial"));
    expect(screen.getByText("Seg")).toBeOnTheScreen();
    expect(screen.getByLabelText("Mês anterior")).toBeOnTheScreen();

    const dia20 = new Date();
    dia20.setDate(20);
    fireEvent.press(screen.getByLabelText(formatarDataAcessivel(dia20)));

    expect(
      await screen.findByText("Nenhuma mudança neste filtro.")
    ).toBeOnTheScreen();
  });

  it("abre o calendário da data final", async () => {
    (listarLeituras as jest.Mock).mockResolvedValue([leituraNormal]);
    render(<HistoricoScreen />);
    await screen.findByText(/Nenhuma mudança registrada ainda/);

    fireEvent.press(screen.getByLabelText("Escolher data final"));

    expect(screen.getByLabelText("Mês anterior")).toBeOnTheScreen();
    expect(screen.getByLabelText("Próximo mês")).toBeOnTheScreen();
    expect(screen.getByText("Seg")).toBeOnTheScreen();
  });
});
