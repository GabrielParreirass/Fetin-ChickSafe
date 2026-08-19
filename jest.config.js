/** @type {import("jest").Config} */
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
};
