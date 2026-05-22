import { describe, expect, it } from "vitest";
import { buildCsv, categorizeExpense, parseStatementText } from "@/lib/finance";

describe("finance helpers", () => {
  it("categorizes common card statement descriptions", () => {
    expect(categorizeExpense("IFood Restaurante Centro")).toBe("Restaurante");
    expect(categorizeExpense("Uber Trip")).toBe("Transporte");
    expect(categorizeExpense("Drogaria Sao Paulo")).toBe("Saude");
  });

  it("parses statement lines and ignores totals", () => {
    const text = [
      "01/05 Mercado Central 123,45",
      "02/05 Uber Trip 34,90",
      "Total da fatura 158,35",
    ].join("\n");

    const parsed = parseStatementText(text, 2026);

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      description: "Mercado Central",
      amount: 123.45,
      category: "Mercado",
      date: "2026-05-01",
    });
  });

  it("exports CSV with escaped values", () => {
    const csv = buildCsv([{ descricao: 'Compra "teste"', valor: 10 }]);

    expect(csv).toContain('"Compra ""teste"""');
    expect(csv).toContain('"10"');
  });
});
