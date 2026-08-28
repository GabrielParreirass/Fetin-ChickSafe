import {
  csvHistorico,
  dataArquivo,
  htmlDashboard,
  htmlHistorico,
  svgDonut,
  svgLinha,
  alturaPdf,
  nomeArquivoCsvHistorico,
  nomeArquivoHtmlHistorico,
  nomeArquivoPdfDashboard,
} from "@/lib/exportar";
import type { MudancaLeitura } from "@/lib/historico";
import type { Leitura } from "@/lib/types";
import { resumoDashboard } from "@/lib/dashboard";

const mudanca: MudancaLeitura = {
  id: "1-Energia",
  galpaoId: "galpao-1",
  galpaoNome: "Galpão Norte",
  campo: "Energia",
  estadoAnterior: "Fonte",
  novoEstado: "Bateria",
  dataHora: new Date("2026-08-28T12:00:00.000Z"),
};

const fonte: Leitura = {
  id: 1,
  galpao_id: "galpao-1",
  energia: "Fonte",
  tensao: 4.2,
  corrente: 80,
  criado_em: "2026-08-28T12:00:00.000Z",
};

const bateria: Leitura = {
  id: 2,
  galpao_id: "galpao-1",
  energia: "Bateria",
  tensao: 2.5,
  corrente: 20,
  criado_em: "2026-08-28T11:00:00.000Z",
};

describe("csvHistorico", () => {
  it("gera CSV com BOM, cabeçalho e linhas", () => {
    const csv = csvHistorico([mudanca]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Data/hora;Galpão;Campo;Anterior;Novo");
    expect(csv).toContain("Galpão Norte");
    expect(csv).toContain("Energia");
    expect(csv).toContain("Fonte");
    expect(csv).toContain("Bateria");
  });

  it("escapa ponto e vírgula e aspas", () => {
    const csv = csvHistorico([
      { ...mudanca, galpaoNome: 'Norte; "A"' },
    ]);
    expect(csv).toContain('"Norte; ""A"""');
  });
});

describe("htmlDashboard", () => {
  it("monta o relatório com resumo e leituras", () => {
    const resumo = resumoDashboard([fonte, bateria], 3, 50);
    expect(resumo).not.toBeNull();
    const html = htmlDashboard({
      galpaoNome: "Galpão Norte",
      resumo: resumo!,
      leituras: [fonte, bateria],
      limiarTensao: 3,
      limiarCorrente: 50,
      geradoEm: new Date("2026-08-28T12:00:00.000Z"),
    });
    expect(html).toContain("ChickSafe — Dashboard");
    expect(html).toContain("Galpão Norte");
    expect(html).toContain("Tensão média");
    expect(html).toContain("3.4 V");
    expect(html).toContain("Fonte");
    expect(html).toContain("Bateria");
    expect(html).toContain("Alerta");
    expect(html).toContain("Normal");
    expect(html).toContain("Tensão ao longo do tempo");
    expect(html).toContain("Corrente ao longo do tempo");
    expect(html).toContain("Fonte vs bateria");
    expect(html).toContain("<svg");
  });

  it("escapa HTML no nome do galpão", () => {
    const resumo = resumoDashboard([fonte], 3, 50)!;
    const html = htmlDashboard({
      galpaoNome: '<script>x</script>',
      resumo,
      leituras: [fonte],
      limiarTensao: 3,
      limiarCorrente: 50,
      geradoEm: new Date("2026-08-28T12:00:00.000Z"),
    });
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(html).not.toContain("<script>x</script>");
  });
});

describe("nomes de arquivo", () => {
  const agora = new Date("2026-08-28T15:00:00");

  it("usa a data local no CSV", () => {
    expect(dataArquivo(agora)).toBe("2026-08-28");
    expect(nomeArquivoCsvHistorico(agora)).toBe(
      "historico-chicksafe-2026-08-28.csv"
    );
    expect(nomeArquivoHtmlHistorico(agora)).toBe(
      "historico-chicksafe-2026-08-28.html"
    );
  });

  it("slugifica o nome do galpão no PDF", () => {
    expect(nomeArquivoPdfDashboard("Galpão Norte", agora)).toBe(
      "dashboard-galp-o-norte-2026-08-28.pdf"
    );
    expect(nomeArquivoPdfDashboard("   ", agora)).toBe(
      "dashboard-galpao-2026-08-28.pdf"
    );
  });
});

describe("htmlHistorico", () => {
  it("lista todas as mudanças", () => {
    const html = htmlHistorico([mudanca], new Date("2026-08-28T12:00:00.000Z"));
    expect(html).toContain("ChickSafe — Histórico");
    expect(html).toContain("Galpão Norte");
    expect(html).toContain("Energia");
    expect(html).toContain("Fonte");
    expect(html).toContain("Bateria");
    expect(html).toContain("1 mudança");
  });
});

describe("svgLinha e svgDonut", () => {
  it("desenha a série e o limiar", () => {
    const svg = svgLinha([2, 4, 3], { limiar: 3 });
    expect(svg).toContain("<svg");
    expect(svg).toContain("stroke-dasharray");
    expect(svgLinha([])).toBe("");
  });

  it("desenha donut com uma ou duas fatias", () => {
    expect(
      svgDonut([{ value: 2, color: "#4CAF50", text: "Fonte" }])
    ).toContain("circle");
    expect(
      svgDonut([
        { value: 1, color: "#4CAF50", text: "Fonte" },
        { value: 1, color: "#F44336", text: "Bateria" },
      ])
    ).toContain("<path");
    expect(svgDonut([])).toBe("");
  });
});

describe("alturaPdf", () => {
  it("cresce com tabelas e gráficos", () => {
    expect(alturaPdf("<p>x</p>")).toBe(1100);
    expect(alturaPdf(`<svg></svg>${"<tr>".repeat(40)}`)).toBeGreaterThan(1100);
  });
});
