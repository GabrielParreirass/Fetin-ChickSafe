const fs = require("fs");
const path = require("path");

const jsonPath = path.join("reports", "jest.json");
if (!fs.existsSync(jsonPath)) {
  process.exit(0);
}

const resultado = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const duracaoMs = (resultado.testResults || []).reduce((soma, suite) => {
  const inicio = suite.perfStats?.start ?? suite.startTime ?? 0;
  const fim = suite.perfStats?.end ?? suite.endTime ?? 0;
  return soma + Math.max(0, fim - inicio);
}, 0);

const falhas = (resultado.testResults || []).flatMap((suite) => {
  const arquivo = String(suite.name || "").replace(/\\/g, "/");
  return (suite.assertionResults || [])
    .filter((teste) => teste.status === "failed")
    .map((teste) => `- \`${arquivo}\` › ${teste.fullName}`);
});

const linhas = [
  "## Relatório de testes",
  "",
  "| Métrica | Valor |",
  "|---|---|",
  `| Suites | ${resultado.numPassedTestSuites}/${resultado.numTotalTestSuites} passou |`,
  `| Testes | ${resultado.numPassedTests}/${resultado.numTotalTests} passou |`,
  `| Falhou | ${resultado.numFailedTests} |`,
  `| Pulou | ${resultado.numPendingTests} |`,
  `| Duração | ${(duracaoMs / 1000).toFixed(1)}s |`,
  "",
];

if (falhas.length > 0) {
  linhas.push("### Falhas", "", ...falhas, "");
}

linhas.push(
  "Baixe o artefato **relatorio-testes** nesta run e abra `relatorio-testes.html`.",
  "A cobertura está em `coverage/lcov-report/index.html` no mesmo zip."
);

const saida = `${linhas.join("\n")}\n`;
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, saida);
} else {
  process.stdout.write(saida);
}
