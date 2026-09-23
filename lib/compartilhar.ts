import { alturaPdf, LARGURA_PDF } from "@/lib/exportar";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

async function garantirCompartilhamento(): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Compartilhamento indisponível neste dispositivo.");
  }
}

function documentoWeb(): Document {
  const doc = globalThis.document;
  if (!doc) {
    throw new Error("Exportação indisponível neste ambiente.");
  }
  return doc;
}

export function baixarTextoWeb(
  nomeArquivo: string,
  conteudo: string,
  mime: string
): void {
  const doc = documentoWeb();
  const blob = new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const ancora = doc.createElement("a");
  ancora.href = url;
  ancora.download = nomeArquivo;
  ancora.rel = "noopener";
  doc.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
}

export function abrirHtmlWeb(html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const janela = globalThis.window?.open(url, "_blank");
  if (!janela) {
    URL.revokeObjectURL(url);
    throw new Error("Permita pop-ups no navegador para ver o relatório.");
  }
}

export async function compartilharPdfHtml(
  html: string,
  dialogTitle = "Exportar dashboard",
  nomeArquivo = "relatorio-chicksafe.html"
): Promise<void> {
  if (Platform.OS === "web") {
    const nomeHtml = nomeArquivo.replace(/\.pdf$/i, ".html");
    baixarTextoWeb(nomeHtml, html, "text/html;charset=utf-8");
    abrirHtmlWeb(html);
    return;
  }
  await garantirCompartilhamento();
  const { uri } = await Print.printToFileAsync({
    html,
    width: LARGURA_PDF,
    height: alturaPdf(html),
  });
  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    dialogTitle,
    UTI: "com.adobe.pdf",
  });
}
