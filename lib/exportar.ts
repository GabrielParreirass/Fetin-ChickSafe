import type { ResumoDashboard } from "@/lib/dashboard";
import {
  fatiasEnergia,
  leiturasCronologicas,
  pontosCorrente,
  pontosTensao,
} from "@/lib/dashboard";
import type { MudancaLeitura } from "@/lib/historico";
import {
  formatarCorrente,
  formatarTensao,
  rotuloEnergia,
  statusGeralLeitura,
} from "@/lib/status";
import { cores } from "@/constants/tema";
import type { Leitura } from "@/lib/types";
import { formatarDataHora } from "@/lib/calendario";

function formatarDataExportacao(data: Date): string {
  if (Number.isNaN(data.getTime())) {
    return "";
  }
  return formatarDataHora(data);
}

function escaparHtml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function dataArquivo(agora: Date = new Date()): string {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function nomeArquivoHtmlHistorico(agora: Date = new Date()): string {
  return `historico-chicksafe-${dataArquivo(agora)}.html`;
}

export function nomeArquivoPdfDashboard(
  galpaoNome: string,
  agora: Date = new Date()
): string {
  const slug = galpaoNome
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `dashboard-${slug || "galpao"}-${dataArquivo(agora)}.pdf`;
}

const LARGURA_PDF = 612;

export function alturaPdf(html: string): number {
  const linhas = (html.match(/<tr[\s>]/g) ?? []).length;
  const graficos = (html.match(/<svg[\s>]/g) ?? []).length;
  const titulos = (html.match(/<h2[\s>]/g) ?? []).length;
  return Math.max(1100, 420 + graficos * 240 + titulos * 40 + linhas * 26);
}

export function svgLinha(
  valores: number[],
  opcoes: { limiar?: number; cor?: string } = {}
): string {
  if (valores.length === 0) {
    return "";
  }
  const largura = 540;
  const altura = 180;
  const padX = 40;
  const padY = 14;
  const plotW = largura - padX - 10;
  const plotH = altura - padY - 22;
  const limiar = opcoes.limiar;
  const min = Math.min(...valores, limiar ?? valores[0]);
  const max = Math.max(...valores, limiar ?? valores[0]);
  const range = max - min || 1;
  const xDe = (i: number) =>
    padX + (valores.length === 1 ? plotW / 2 : (i / (valores.length - 1)) * plotW);
  const yDe = (v: number) => padY + ((max - v) / range) * plotH;
  const d = valores
    .map(
      (valor, i) =>
        `${i === 0 ? "M" : "L"} ${xDe(i).toFixed(1)} ${yDe(valor).toFixed(1)}`
    )
    .join(" ");
  const linhaLimiar =
    limiar == null
      ? ""
      : `<line x1="${padX}" y1="${yDe(limiar).toFixed(1)}" x2="${largura - 10}" y2="${yDe(limiar).toFixed(1)}" stroke="${cores.alerta}" stroke-dasharray="4 3" stroke-width="1.5" />`;
  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" height="${altura}">${linhaLimiar}<path d="${d}" fill="none" stroke="${opcoes.cor ?? cores.tinta}" stroke-width="2" /></svg>`;
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

export function svgDonut(
  fatias: Array<{ value: number; color: string; text: string }>
): string {
  const visiveis = fatias.filter((fatia) => fatia.value > 0);
  if (visiveis.length === 0) {
    return "";
  }
  const cx = 90;
  const cy = 90;
  const r = 72;
  const ri = 42;
  const total = visiveis.reduce((soma, fatia) => soma + fatia.value, 0);
  if (visiveis.length === 1) {
    return `<svg viewBox="0 0 180 180" width="180" height="180"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${visiveis[0].color}" /><circle cx="${cx}" cy="${cy}" r="${ri}" fill="${cores.branco}" /></svg>`;
  }
  let angulo = -90;
  const paths = visiveis.map((fatia) => {
    const inicio = angulo;
    angulo += (fatia.value / total) * 360;
    const [x0, y0] = polar(cx, cy, r, inicio);
    const [x1, y1] = polar(cx, cy, r, angulo);
    const [xi0, yi0] = polar(cx, cy, ri, angulo);
    const [xi1, yi1] = polar(cx, cy, ri, inicio);
    const grande = angulo - inicio > 180 ? 1 : 0;
    return `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${grande} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L ${xi0.toFixed(1)} ${yi0.toFixed(1)} A ${ri} ${ri} 0 ${grande} 0 ${xi1.toFixed(1)} ${yi1.toFixed(1)} Z" fill="${fatia.color}" />`;
  });
  return `<svg viewBox="0 0 180 180" width="180" height="180">${paths.join("")}</svg>`;
}

const ESTILO_PDF = `
  @page { margin: 18px; size: auto; }
  html, body { height: auto; overflow: visible; }
  body { font-family: Helvetica, Arial, sans-serif; color: ${cores.tinta}; padding: 16px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 22px 0 8px; page-break-after: avoid; }
  p, td, th { font-size: 12px; }
  .meta { color: ${cores.tintaFraca}; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th, td { border: 1px solid ${cores.borda}; padding: 7px; text-align: left; }
  th { background: ${cores.superficieSuave}; }
  .cards { width: 100%; margin-bottom: 8px; }
  .cards td { width: 50%; background: ${cores.superficieCard}; }
  .grafico { page-break-inside: avoid; margin: 8px 0 4px; }
  .pizza { text-align: center; page-break-inside: avoid; }
`;

export function htmlHistorico(
  mudancas: MudancaLeitura[],
  geradoEm: Date = new Date()
): string {
  const gerado = formatarDataExportacao(geradoEm);
  const linhas = mudancas
    .map(
      (item) => `<tr>
        <td>${escaparHtml(formatarDataExportacao(item.dataHora))}</td>
        <td>${escaparHtml(item.galpaoNome)}</td>
        <td>${escaparHtml(item.campo)}</td>
        <td>${escaparHtml(item.estadoAnterior)}</td>
        <td>${escaparHtml(item.novoEstado)}</td>
      </tr>`
    )
    .join("");
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Histórico ChickSafe</title>
    <style>${ESTILO_PDF}</style>
  </head>
  <body>
    <h1>ChickSafe — Histórico</h1>
    <p class="meta">${mudancas.length} mudança(s) · gerado em ${escaparHtml(gerado)}</p>
    <table>
      <thead>
        <tr>
          <th>Data/hora</th>
          <th>Galpão</th>
          <th>Campo</th>
          <th>Anterior</th>
          <th>Novo</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
  </body>
</html>`;
}

export function htmlDashboard(input: {
  galpaoNome: string;
  resumo: ResumoDashboard;
  leituras: Leitura[];
  limiarTensao: number;
  limiarCorrente: number;
  geradoEm?: Date;
}): string {
  const gerado = formatarDataExportacao(input.geradoEm ?? new Date());
  const serie = leiturasCronologicas(input.leituras);
  const graficoTensao = svgLinha(
    pontosTensao(input.leituras).map((ponto) => ponto.value),
    { limiar: input.limiarTensao, cor: cores.tinta }
  );
  const graficoCorrente = svgLinha(
    pontosCorrente(input.leituras).map((ponto) => ponto.value),
    { limiar: input.limiarCorrente, cor: cores.tinta }
  );
  const pizza = svgDonut(fatiasEnergia(input.resumo));
  const linhas = serie
    .map((leitura) => {
      const situacao = statusGeralLeitura(
        leitura,
        input.limiarTensao,
        input.limiarCorrente
      ).rotulo;
      return `<tr>
        <td>${escaparHtml(formatarDataExportacao(new Date(leitura.criado_em)))}</td>
        <td>${escaparHtml(rotuloEnergia(leitura.energia))}</td>
        <td>${escaparHtml(formatarTensao(Number(leitura.tensao)))}</td>
        <td>${escaparHtml(formatarCorrente(Number(leitura.corrente)))}</td>
        <td>${escaparHtml(situacao)}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Dashboard ${escaparHtml(input.galpaoNome)}</title>
    <style>${ESTILO_PDF}</style>
  </head>
  <body>
    <h1>ChickSafe — Dashboard</h1>
    <p class="meta">${escaparHtml(input.galpaoNome)} · gerado em ${escaparHtml(gerado)}</p>
    <h2>Resumo</h2>
    <table class="cards">
      <tr>
        <td>Tensão média<br /><strong>${escaparHtml(formatarTensao(input.resumo.mediaTensao))}</strong><br />${escaparHtml(formatarTensao(input.resumo.minTensao))} – ${escaparHtml(formatarTensao(input.resumo.maxTensao))}</td>
        <td>Corrente média<br /><strong>${escaparHtml(formatarCorrente(input.resumo.mediaCorrente))}</strong><br />${escaparHtml(formatarCorrente(input.resumo.minCorrente))} – ${escaparHtml(formatarCorrente(input.resumo.maxCorrente))}</td>
      </tr>
      <tr>
        <td>Tempo em bateria<br /><strong>${Math.round(input.resumo.percentualBateria)}%</strong><br />${input.resumo.leiturasBateria} de ${input.resumo.total} leituras</td>
        <td>Leituras em alerta<br /><strong>${Math.round(input.resumo.percentualAlerta)}%</strong><br />${input.resumo.leiturasAlerta} de ${input.resumo.total}</td>
      </tr>
    </table>
    <p class="meta">Limiares: tensão ${escaparHtml(formatarTensao(input.limiarTensao))} · corrente ${escaparHtml(formatarCorrente(input.limiarCorrente))}</p>
    <h2>Tensão ao longo do tempo</h2>
    <p class="meta">Linha vermelha: limiar de ${escaparHtml(formatarTensao(input.limiarTensao))}</p>
    <div class="grafico">${graficoTensao}</div>
    <h2>Corrente ao longo do tempo</h2>
    <p class="meta">Linha vermelha: limiar de ${escaparHtml(formatarCorrente(input.limiarCorrente))}</p>
    <div class="grafico">${graficoCorrente}</div>
    <h2>Fonte vs bateria</h2>
    <div class="pizza">${pizza}</div>
    <p class="meta">Verde: fonte/USB · Vermelho: bateria</p>
    <h2>Leituras</h2>
    <table>
      <thead>
        <tr>
          <th>Data/hora</th>
          <th>Energia</th>
          <th>Tensão</th>
          <th>Corrente</th>
          <th>Situação</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>
  </body>
</html>`;
}

export { LARGURA_PDF };

