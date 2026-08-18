export type Energia = "USB" | "Bateria";

export type Usuario = {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
};

export type Galpao = {
  id: string;
  nome: string;
  codigo: string | null;
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
  galpoes: Galpao | Galpao[] | null;
};
