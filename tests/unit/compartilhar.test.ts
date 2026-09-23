jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock("expo-print", () => ({
  printToFileAsync: jest.fn(),
}));

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { compartilharPdfHtml } from "@/lib/compartilhar";

describe("compartilharPdfHtml", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(undefined);
    (Print.printToFileAsync as jest.Mock).mockResolvedValue({
      uri: "file:///cache/dashboard.pdf",
    });
  });

  it("gera o PDF e compartilha", async () => {
    await compartilharPdfHtml("<html></html>");
    expect(Print.printToFileAsync).toHaveBeenCalledWith({
      html: "<html></html>",
      width: 612,
      height: expect.any(Number),
    });
    expect(Sharing.shareAsync).toHaveBeenCalledWith("file:///cache/dashboard.pdf", {
      mimeType: "application/pdf",
      dialogTitle: "Exportar dashboard",
      UTI: "com.adobe.pdf",
    });
  });

  it("falha quando o compartilhamento não está disponível", async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);
    await expect(compartilharPdfHtml("<html></html>")).rejects.toThrow(
      "Compartilhamento indisponível neste dispositivo."
    );
    expect(Print.printToFileAsync).not.toHaveBeenCalled();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });
});

describe("exportação na web", () => {
  const originalOS = Platform.OS;
  let click: jest.Mock;
  let appendChild: jest.Mock;
  let remove: jest.Mock;
  let open: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    click = jest.fn();
    appendChild = jest.fn();
    remove = jest.fn();
    open = jest.fn(() => ({ closed: false }));
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => "web",
    });
    globalThis.URL.createObjectURL = jest.fn(() => "blob:relatorio");
    globalThis.URL.revokeObjectURL = jest.fn();
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: jest.fn(() => ({
          href: "",
          download: "",
          rel: "",
          click,
          remove,
        })),
        body: { appendChild },
      },
    });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { open },
    });
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => originalOS,
    });
  });

  it("baixa o HTML e abre o relatório num blob, sem about:blank", async () => {
    await compartilharPdfHtml("<html>ok</html>", "Exportar", "dashboard.pdf");
    expect(appendChild).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith("blob:relatorio", "_blank");
    expect(open).not.toHaveBeenCalledWith("", "_blank");
    expect(Print.printToFileAsync).not.toHaveBeenCalled();
  });
});
