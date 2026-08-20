/** @type {import("jest").Config} */
const ci = process.env.CI === "true" || process.argv.includes("--ci");

const reporters = ["default"];

if (ci) {
  reporters.push(
    [
      "jest-junit",
      {
        outputDirectory: "reports",
        outputName: "junit.xml",
      },
    ],
    [
      "jest-html-reporters",
      {
        publicPath: "./reports",
        filename: "relatorio-testes.html",
        pageTitle: "ChickSafe — Relatório de testes",
        expand: false,
      },
    ]
  );
}

module.exports = {
  preset: "jest-expo",
  testMatch: [
    "<rootDir>/tests/unit/**/*.test.ts",
    "<rootDir>/tests/unit/**/*.test.tsx",
    "<rootDir>/tests/integration/**/*.test.ts",
    "<rootDir>/tests/integration/**/*.test.tsx",
    "<rootDir>/tests/ui/**/*.test.ts",
    "<rootDir>/tests/ui/**/*.test.tsx",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "contexts/**/*.{ts,tsx}",
    "!**/*.d.ts",
  ],
  coverageThreshold: ci
    ? {
        "./lib/": {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      }
    : undefined,
  reporters,
};
