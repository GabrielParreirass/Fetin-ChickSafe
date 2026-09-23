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
  limiarTensao: 3,
  limiarCorrente: 50,
  papel: "dono",
  statusAcesso: "aprovado" as const,
};

export const galpaoSul = {
  id: "galpao-2",
  nome: "Galpão Sul",
  codigo: "XYZ789",
  limiarTensao: 3,
  limiarCorrente: 50,
  papel: "dono",
  statusAcesso: "aprovado" as const,
};

export const galpaoNorteFuncionario = {
  ...galpaoNorte,
  papel: "operador",
};

export const galpaoNortePendente = {
  ...galpaoNorteFuncionario,
  statusAcesso: "pendente" as const,
};

const agoraIso = new Date().toISOString();
const cincoMinutosDepois = new Date(Date.now() + 5 * 60 * 1000).toISOString();
const umaHoraAtras = new Date(Date.now() - 61 * 60 * 1000).toISOString();

export const leituraNormal = {
  id: 1,
  galpao_id: "galpao-1",
  energia: "Fonte" as const,
  tensao: 4.2,
  corrente: 80,
  criado_em: agoraIso,
};

export const leituraAlerta = {
  id: 2,
  galpao_id: "galpao-1",
  energia: "Bateria" as const,
  tensao: 2.5,
  corrente: 20,
  criado_em: cincoMinutosDepois,
};

export const leituraOffline = {
  ...leituraNormal,
  id: 99,
  criado_em: umaHoraAtras,
};
