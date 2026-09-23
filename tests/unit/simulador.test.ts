jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

import {
  galpaoParaTesteAlerta,
  leituraAlertaDeTeste,
  leituraNormalDeTeste,
} from "@/lib/simulador";
import { galpaoNorte, galpaoNortePendente, galpaoSul } from "../ui/helpers/fakes";

describe("galpaoParaTesteAlerta", () => {
  it("escolhe o primeiro galpão com acesso aprovado", () => {
    expect(
      galpaoParaTesteAlerta([galpaoNortePendente, galpaoSul])
    ).toEqual(galpaoSul);
  });

  it("devolve null quando nenhum está aprovado", () => {
    expect(galpaoParaTesteAlerta([galpaoNortePendente])).toBeNull();
  });
});

describe("leituras de teste de alerta", () => {
  it("gera uma leitura Normal acima dos limiares", () => {
    expect(leituraNormalDeTeste(galpaoNorte)).toEqual({
      galpao_id: "galpao-1",
      energia: "Fonte",
      tensao: 4,
      corrente: 60,
    });
  });

  it("gera uma leitura em alerta por bateria", () => {
    expect(leituraAlertaDeTeste(galpaoNorte)).toEqual({
      galpao_id: "galpao-1",
      energia: "Bateria",
      tensao: 0,
      corrente: 0,
    });
  });
});
