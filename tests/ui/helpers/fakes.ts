export const usuarioPadrao = {
  id: "user-1",
  nome: "Maria Silva",
  cpf: "12345678900",
  email: "maria@chicksafe.app",
  telefone: "31999990000",
};

export const userAuthPadrao = { id: "user-1" };

export const galpaoNorte = {
  id: "galpao-1",
  nome: "Galpão Norte",
  codigo: "ABC123",
};

export const galpaoSul = {
  id: "galpao-2",
  nome: "Galpão Sul",
  codigo: "XYZ789",
};

export const leituraNormal = {
  id: 1,
  galpao_id: "galpao-1",
  energia: "Fonte" as const,
  tensao: 4.2,
  corrente: 80,
  criado_em: "2026-01-01T10:00:00.000Z",
};

export const leituraAlerta = {
  id: 2,
  galpao_id: "galpao-1",
  energia: "Bateria" as const,
  tensao: 2.5,
  corrente: 20,
  criado_em: "2026-01-01T10:05:00.000Z",
};
