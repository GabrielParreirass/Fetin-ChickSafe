const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

export type CelulaCalendario = {
  data: Date;
  dia: number;
  noMes: boolean;
};

export function inicioDoMes(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth(), 1);
}

export function avancarMes(data: Date, delta: number): Date {
  return new Date(data.getFullYear(), data.getMonth() + delta, 1);
}

export function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatarDataBr(data: Date): string {
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${data.getFullYear()}`;
}

export function formatarDataAcessivel(data: Date): string {
  return data.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function rotuloMesAno(data: Date): string {
  const texto = data.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function diasDaSemana(): readonly string[] {
  return DIAS_SEMANA;
}

export function celulasDoMes(referencia: Date): CelulaCalendario[] {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  const primeiro = new Date(ano, mes, 1);
  const offset = (primeiro.getDay() + 6) % 7;
  const inicio = new Date(ano, mes, 1 - offset);
  const celulas: CelulaCalendario[] = [];

  for (let i = 0; i < 42; i++) {
    const data = new Date(
      inicio.getFullYear(),
      inicio.getMonth(),
      inicio.getDate() + i
    );
    celulas.push({
      data,
      dia: data.getDate(),
      noMes: data.getMonth() === mes,
    });
  }

  return celulas;
}
