export type Galpao = {
  id: number;
  nome: string;
  energia: "USB" | "Bateria";
  tensaoBateria: number;
  correnteVentilador: number;
};

export const GALPOES: Galpao[] = [
  {
    id: 1,
    nome: "Galpão Santa Rita",
    energia: "USB",
    tensaoBateria: 12.4,
    correnteVentilador: 1.8,
  },
  {
    id: 2,
    nome: "Galpão Inatel",
    energia: "Bateria",
    tensaoBateria: 11.1,
    correnteVentilador: 0.4,
  },
];

export function getGalpaoById(id: number): Galpao | undefined {
  return GALPOES.find((galpao) => galpao.id === id);
}
