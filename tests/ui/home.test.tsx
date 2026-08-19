import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/contexts/auth";
import {
  apagarGalpao,
  aprovarAcessoDoGalpao,
  atualizarGalpao,
  buscarLeiturasAprovadas,
  criarGalpao,
  entrarGalpaoPorCodigo,
  listarAcessosDoGalpao,
  listarGalpoesDoUsuario,
  listarNotificacoes,
  removerAcessoDoGalpao,
  sairDoGalpao,
} from "@/lib/database";
import HomeLogadaScreen from "@/app/(private)/home/page";
import {
  galpaoNorte,
  galpaoNorteFuncionario,
  galpaoNortePendente,
  leituraAlerta,
  leituraNormal,
  userAuthPadrao,
  usuarioPadrao,
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
  listarAcessosDoGalpao: jest.fn(),
  atualizarGalpao: jest.fn(),
  removerAcessoDoGalpao: jest.fn(),
  apagarGalpao: jest.fn(),
  buscarLeiturasAprovadas: jest.fn(),
  aprovarAcessoDoGalpao: jest.fn(),
  recusarAcessoDoGalpao: jest.fn(),
  sairDoGalpao: jest.fn(),
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
    (listarAcessosDoGalpao as jest.Mock).mockResolvedValue([]);
    (buscarLeiturasAprovadas as jest.Mock).mockResolvedValue({});
    (listarNotificacoes as jest.Mock).mockResolvedValue([]);
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
      expect(Alert.alert).toHaveBeenCalledWith(
        "Pedido enviado",
        "O dono precisa aprovar o acesso a este galpão."
      );
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

  it("abre a lista de acesso com dono e funcionário", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
    (listarAcessosDoGalpao as jest.Mock).mockResolvedValue([
      {
        usuarioId: "user-1",
        nome: "Maria Silva",
        email: "maria@chicksafe.app",
        papel: "dono",
      },
      {
        usuarioId: "user-2",
        nome: "Bruno",
        email: "bruno@chicksafe.app",
        papel: "operador",
      },
    ]);
    render(<HomeLogadaScreen />);
    await screen.findByText("Galpão Norte");

    fireEvent.press(screen.getByLabelText("Ver acesso de Galpão Norte"));

    expect(await screen.findByText("Acesso — Galpão Norte")).toBeOnTheScreen();
    expect(listarAcessosDoGalpao).toHaveBeenCalledWith("galpao-1");
    expect(screen.getByText("Maria Silva — Dono")).toBeOnTheScreen();
    expect(screen.getByText("Bruno — Funcionário")).toBeOnTheScreen();
  });

  it("não abre o detalhe do galpão ao tocar em ver acesso", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
    render(<HomeLogadaScreen />);
    await screen.findByText("Galpão Norte");

    fireEvent.press(screen.getByLabelText("Ver acesso de Galpão Norte"));

    expect(await screen.findByText("Acesso — Galpão Norte")).toBeOnTheScreen();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("fecha o modal de acesso", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
    (listarAcessosDoGalpao as jest.Mock).mockResolvedValue([
      {
        usuarioId: "user-1",
        nome: "Maria Silva",
        email: "maria@chicksafe.app",
        papel: "dono",
      },
    ]);
    render(<HomeLogadaScreen />);
    await screen.findByText("Galpão Norte");
    fireEvent.press(screen.getByLabelText("Ver acesso de Galpão Norte"));
    await screen.findByText("Acesso — Galpão Norte");

    fireEvent.press(screen.getByText("Fechar"));

    await waitFor(() => {
      expect(screen.queryByText("Acesso — Galpão Norte")).toBeNull();
    });
  });

  it("alerta quando a lista de acesso falha", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
    (listarAcessosDoGalpao as jest.Mock).mockRejectedValue(
      new Error("Sem acesso a este galpão")
    );
    render(<HomeLogadaScreen />);
    await screen.findByText("Galpão Norte");

    fireEvent.press(screen.getByLabelText("Ver acesso de Galpão Norte"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Acesso",
        "Sem acesso a este galpão"
      );
    });
  });

  it("abre o perfil pelo botão do header", async () => {
    render(<HomeLogadaScreen />);
    await screen.findByText("Olá, Maria!");

    fireEvent.press(screen.getByLabelText("Abrir perfil"));

    expect(router.push).toHaveBeenCalledWith("/(private)/perfil/page");
  });

  it("deixa o dono salvar nome e limiares nas configurações", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
    (atualizarGalpao as jest.Mock).mockResolvedValue({
      ...galpaoNorte,
      nome: "Galpão Novo",
      limiarTensao: 4,
      limiarCorrente: 80,
    });
    render(<HomeLogadaScreen />);
    await screen.findByText("Galpão Norte");
    fireEvent.press(screen.getByLabelText("Configurar Galpão Norte"));
    await screen.findByText("Configurações — Galpão Norte");

    fireEvent.changeText(screen.getByDisplayValue("Galpão Norte"), "Galpão Novo");
    fireEvent.changeText(screen.getByDisplayValue("3"), "4");
    fireEvent.changeText(screen.getByDisplayValue("50"), "80");
    fireEvent.press(screen.getByText("Salvar alterações"));

    await waitFor(() => {
      expect(atualizarGalpao).toHaveBeenCalledWith({
        galpaoId: "galpao-1",
        nome: "Galpão Novo",
        limiarTensao: 4,
        limiarCorrente: 80,
      });
    });
    expect(await screen.findByText("Alterações salvas.")).toBeOnTheScreen();
  });

  it("remove funcionário depois da confirmação", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
    (listarAcessosDoGalpao as jest.Mock)
      .mockResolvedValueOnce([
        {
          usuarioId: "user-1",
          nome: "Maria Silva",
          email: "maria@chicksafe.app",
          papel: "dono",
        },
        {
          usuarioId: "user-2",
          nome: "Bruno",
          email: "bruno@chicksafe.app",
          papel: "operador",
        },
      ])
      .mockResolvedValueOnce([
        {
          usuarioId: "user-1",
          nome: "Maria Silva",
          email: "maria@chicksafe.app",
          papel: "dono",
        },
      ]);
    (removerAcessoDoGalpao as jest.Mock).mockResolvedValue(undefined);
    render(<HomeLogadaScreen />);
    await screen.findByText("Galpão Norte");
    fireEvent.press(screen.getByLabelText("Ver acesso de Galpão Norte"));
    await screen.findByText("Bruno — Funcionário");

    fireEvent.press(screen.getByLabelText("Remover acesso de Bruno"));
    expect(screen.getByText("Confirmar")).toBeOnTheScreen();
    fireEvent.press(screen.getByLabelText("Remover acesso de Bruno"));

    await waitFor(() => {
      expect(removerAcessoDoGalpao).toHaveBeenCalledWith("galpao-1", "user-2");
    });
  });

  it("apaga o galpão nas configurações depois da confirmação", async () => {
    (listarGalpoesDoUsuario as jest.Mock)
      .mockResolvedValueOnce([galpaoNorte])
      .mockResolvedValueOnce([]);
    (apagarGalpao as jest.Mock).mockResolvedValue(undefined);
    render(<HomeLogadaScreen />);
    await screen.findByText("Galpão Norte");
    fireEvent.press(screen.getByLabelText("Configurar Galpão Norte"));
    await screen.findByText("Apagar galpão");

    fireEvent.press(screen.getByText("Apagar galpão"));
    fireEvent.press(screen.getByText("Confirmar exclusão"));

    await waitFor(() => {
      expect(apagarGalpao).toHaveBeenCalledWith("galpao-1");
    });
  });

  it("esconde edição nas configurações para funcionário", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([
      galpaoNorteFuncionario,
    ]);
    render(<HomeLogadaScreen />);
    await screen.findByText("Galpão Norte");
    fireEvent.press(screen.getByLabelText("Configurar Galpão Norte"));
    await screen.findByText("Configurações — Galpão Norte");

    expect(screen.getByText("O código de convite não pode ser alterado.")).toBeOnTheScreen();
    expect(screen.getByText("3 V")).toBeOnTheScreen();
    expect(screen.getByText("50 mA")).toBeOnTheScreen();
    expect(screen.queryByText("Salvar alterações")).toBeNull();
    expect(screen.queryByText("Apagar galpão")).toBeNull();
  });

  it("mantém a lista de acesso só com as pessoas", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
    (listarAcessosDoGalpao as jest.Mock).mockResolvedValue([
      {
        usuarioId: "user-1",
        nome: "Maria Silva",
        email: "maria@chicksafe.app",
        papel: "dono",
      },
    ]);
    render(<HomeLogadaScreen />);
    await screen.findByText("Galpão Norte");
    fireEvent.press(screen.getByLabelText("Ver acesso de Galpão Norte"));
    await screen.findByText("Maria Silva — Dono");

    expect(screen.queryByText("Limiar de tensão (V)")).toBeNull();
    expect(screen.queryByText("Salvar alterações")).toBeNull();
    expect(screen.queryByText("Apagar galpão")).toBeNull();
  });

  it("mostra status Normal e o resumo da última leitura", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
    (buscarLeiturasAprovadas as jest.Mock).mockResolvedValue({
      "galpao-1": leituraNormal,
    });
    render(<HomeLogadaScreen />);

    expect(await screen.findByText("Normal")).toBeOnTheScreen();
    expect(screen.getByText("Fonte · 4.2 V · 80 mA")).toBeOnTheScreen();
  });

  it("mostra status Alerta quando a leitura está ruim", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
    (buscarLeiturasAprovadas as jest.Mock).mockResolvedValue({
      "galpao-1": leituraAlerta,
    });
    render(<HomeLogadaScreen />);

    expect(await screen.findByText("Alerta")).toBeOnTheScreen();
    expect(screen.getByText("Bateria · 2.5 V · 20 mA")).toBeOnTheScreen();
  });

  it("não abre o detalhe enquanto o acesso está pendente", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([
      galpaoNortePendente,
    ]);
    render(<HomeLogadaScreen />);
    expect(await screen.findByText("Aguardando aprovação")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Configurar Galpão Norte")).toBeNull();

    fireEvent.press(screen.getByText("Galpão Norte"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Aguardando aprovação",
      "O dono ainda precisa aprovar o seu acesso a este galpão."
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("deixa o dono aprovar pedido pendente", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([galpaoNorte]);
    (listarAcessosDoGalpao as jest.Mock)
      .mockResolvedValueOnce([
        {
          usuarioId: "user-1",
          nome: "Maria Silva",
          email: "maria@chicksafe.app",
          papel: "dono",
          status: "aprovado",
        },
        {
          usuarioId: "user-2",
          nome: "Bruno",
          email: "bruno@chicksafe.app",
          papel: "operador",
          status: "pendente",
        },
      ])
      .mockResolvedValueOnce([
        {
          usuarioId: "user-1",
          nome: "Maria Silva",
          email: "maria@chicksafe.app",
          papel: "dono",
          status: "aprovado",
        },
        {
          usuarioId: "user-2",
          nome: "Bruno",
          email: "bruno@chicksafe.app",
          papel: "operador",
          status: "aprovado",
        },
      ]);
    (aprovarAcessoDoGalpao as jest.Mock).mockResolvedValue(undefined);
    render(<HomeLogadaScreen />);
    await screen.findByText("Galpão Norte");
    fireEvent.press(screen.getByLabelText("Ver acesso de Galpão Norte"));
    await screen.findByText("Bruno — Funcionário (pendente)");

    fireEvent.press(screen.getByLabelText("Aprovar acesso de Bruno"));
    fireEvent.press(screen.getByLabelText("Aprovar acesso de Bruno"));

    await waitFor(() => {
      expect(aprovarAcessoDoGalpao).toHaveBeenCalledWith("galpao-1", "user-2");
    });
  });

  it("deixa o funcionário sair do galpão", async () => {
    (listarGalpoesDoUsuario as jest.Mock).mockResolvedValue([
      galpaoNorteFuncionario,
    ]);
    (listarAcessosDoGalpao as jest.Mock).mockResolvedValue([
      {
        usuarioId: "user-9",
        nome: "Dono",
        email: "dono@chicksafe.app",
        papel: "dono",
        status: "aprovado",
      },
      {
        usuarioId: "user-1",
        nome: "Maria Silva",
        email: "maria@chicksafe.app",
        papel: "operador",
        status: "aprovado",
      },
    ]);
    (sairDoGalpao as jest.Mock).mockResolvedValue(undefined);
    render(<HomeLogadaScreen />);
    await screen.findByText("Galpão Norte");
    fireEvent.press(screen.getByLabelText("Ver acesso de Galpão Norte"));
    await screen.findByText("Sair do galpão");

    fireEvent.press(screen.getByLabelText("Sair do galpão"));
    fireEvent.press(screen.getByLabelText("Sair do galpão"));

    await waitFor(() => {
      expect(sairDoGalpao).toHaveBeenCalledWith("galpao-1");
    });
  });
});
