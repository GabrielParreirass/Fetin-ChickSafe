import { render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/contexts/auth";
import { listarGalpoesDoUsuario, listarLeituras } from "@/lib/database";
import DashboardGalpaoScreen from "@/app/(private)/galpao/[id]/dashboard/page";
import {
  galpaoNorte,
  galpaoNorteFuncionario,
  leituraAlerta,
  leituraNormal,
  userAuthPadrao,
} from "./helpers/fakes";

jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/contexts/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/database", () => ({
  listarGalpoesDoUsuario: jest.fn(),
  listarLeituras: jest.fn(),
}));

jest.mock("react-native-gifted-charts", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    LineChart: ({ data }: { data: Array<{ value: number }> }) =>
      React.createElement(
        Text,
        null,
        `grafico-${data.map((item) => item.value).join(",")}`
      ),
    PieChart: () => React.createElement(Text, null, "pizza-energia"),
  };
});

jest.mock("@expo/vector-icons/MaterialIcons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    __esModule: true,
    default: ({ name }: { name: string }) =>
      React.createElement(Text, null, name),
  };
});

describe("DashboardGalpaoScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: "galpao-1" });
    (useAuth as jest.Mock).mockReturnValue({ user: userAuthPadrao });
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
    (listarLeituras as jest.Mock).mockResolvedValue([
      leituraAlerta,
      leituraNormal,
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("mostra resumo e gráficos para o dono", async () => {
    render(<DashboardGalpaoScreen />);

    expect(await screen.findByText("Dashboard")).toBeOnTheScreen();
    expect(screen.getByText("Galpão Norte")).toBeOnTheScreen();
    expect(screen.getByText("Tensão ao longo do tempo")).toBeOnTheScreen();
    expect(screen.getByText("Corrente ao longo do tempo")).toBeOnTheScreen();
    expect(screen.getByText("Fonte vs bateria")).toBeOnTheScreen();
    expect(screen.getByText("3.4 V")).toBeOnTheScreen();
    expect(screen.getByText("pizza-energia")).toBeOnTheScreen();
  });

  it("bloqueia o dashboard para funcionário", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([
      galpaoNorteFuncionario,
    ]);
    render(<DashboardGalpaoScreen />);

    expect(
      await screen.findByText("Só o dono pode ver o dashboard deste galpão.")
    ).toBeOnTheScreen();
    expect(listarLeituras).not.toHaveBeenCalled();
  });

  it("mostra estado vazio quando não há leituras", async () => {
    (listarLeituras as jest.Mock).mockResolvedValue([]);
    render(<DashboardGalpaoScreen />);

    expect(
      await screen.findByText(/Ainda não há leituras para montar os gráficos/)
    ).toBeOnTheScreen();
  });

  it("alerta quando o carregamento falha", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockRejectedValue(
      new Error("sem permissão")
    );
    render(<DashboardGalpaoScreen />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith("Dashboard", "sem permissão");
    });
  });
});
