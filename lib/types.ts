export type Energia = "Fonte" | "Bateria" | "USB";

export type Usuario = {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
};

export type StatusAcesso = "pendente" | "aprovado";

export type Galpao = {
  id: string;
  nome: string;
  codigo: string | null;
  limiarTensao: number;
  limiarCorrente: number;
  papel: string;
  statusAcesso: StatusAcesso;
};

export type GalpaoRow = {
  id: string;
  nome: string;
  codigo: string | null;
  limiar_tensao?: number | string | null;
  limiar_corrente?: number | string | null;
  limiarTensao?: number;
  limiarCorrente?: number;
  papel?: string;
};

export type Leitura = {
  id: number;
  galpao_id: string;
  energia: Energia;
  tensao: number;
  corrente: number;
  criado_em: string;
};

export type UsuarioGalpaoRow = {
  galpao_id: string;
  papel?: string;
  status?: string;
  galpoes: GalpaoRow | GalpaoRow[] | null;
};
