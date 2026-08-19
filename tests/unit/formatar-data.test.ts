import { formatarDataHora } from "@/app/utils/historico";

describe("formatarDataHora", () => {
  it("formata data e hora no padrão brasileiro", () => {
    const data = new Date(2026, 0, 15, 14, 5, 9);
    const spy = jest
      .spyOn(Date.prototype, "toLocaleString")
      .mockReturnValue("15/01/2026, 14:05:09");

    expect(formatarDataHora(data)).toBe("15/01/2026, 14:05:09");
    expect(spy).toHaveBeenCalledWith("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    spy.mockRestore();
  });
});
