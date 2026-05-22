export type TransactionType = "income" | "expense";
export type FixedExpenseCategory = "casa" | "financiamento" | "fixa";

export interface ParsedStatementTransaction {
  description: string;
  amount: number;
  category: string;
  date: string;
  sourceLine: string;
}

export const transactionCategories = [
  "Salario",
  "Freelance",
  "Aluguel",
  "Mercado",
  "Energia",
  "Internet",
  "Transporte",
  "Lazer",
  "Financiamento",
  "Restaurante",
  "Bebidas",
  "Saude",
  "Educacao",
  "Assinaturas",
  "Viagem",
  "Outros",
];

const categoryRules: Array<{ category: string; keywords: string[] }> = [
  { category: "Mercado", keywords: ["mercado", "supermerc", "atacadao", "assai", "carrefour", "extra", "pao de acucar"] },
  { category: "Restaurante", keywords: ["restaurante", "ifood", "ubereats", "burger", "pizza", "lanch", "padaria", "cafe"] },
  { category: "Bebidas", keywords: ["agua", "refri", "refrigerante", "monster", "energetico", "bebida", "cerveja", "suco"] },
  { category: "Transporte", keywords: ["uber", "99", "posto", "combust", "gasolina", "estacion", "metro", "onibus"] },
  { category: "Energia", keywords: ["energia", "eletropaulo", "enel", "light"] },
  { category: "Internet", keywords: ["internet", "vivo", "claro", "tim", "oi", "netflix", "spotify", "google", "apple.com", "amazon prime"] },
  { category: "Saude", keywords: ["farmacia", "drogaria", "droga", "hospital", "clinica", "laboratorio"] },
  { category: "Educacao", keywords: ["curso", "escola", "faculdade", "udemy", "alura", "livraria"] },
  { category: "Lazer", keywords: ["cinema", "ingresso", "show", "teatro", "steam", "playstation", "xbox"] },
  { category: "Viagem", keywords: ["hotel", "airbnb", "latam", "gol ", "azul", "booking"] },
  { category: "Financiamento", keywords: ["financiamento", "parcela financiamento", "emprestimo"] },
];

const ignoredStatementTerms = [
  "pagamento recebido",
  "pagamento efetuado",
  "total da fatura",
  "valor total",
  "saldo anterior",
  "saldo atual",
  "limite",
  "vencimento",
  "encargos",
  "juros",
  "iof",
];

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function categorizeExpense(description: string) {
  const normalized = normalizeText(description);
  const match = categoryRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)));
  return match?.category ?? "Outros";
}

export function validatePositiveAmount(value: number, fieldName = "Valor") {
  if (!Number.isFinite(value) || value <= 0) {
    return `${fieldName} deve ser maior que zero`;
  }
  if (value > 999999999) {
    return `${fieldName} esta muito alto`;
  }
  return null;
}

export function validateText(value: string, fieldName: string, max = 120) {
  const trimmed = value.trim();
  if (!trimmed) return `${fieldName} e obrigatorio`;
  if (trimmed.length > max) return `${fieldName} deve ter no maximo ${max} caracteres`;
  return null;
}

export function validateDueDay(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 31) {
    return "Dia de vencimento deve estar entre 1 e 31";
  }
  return null;
}

export function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

export function toISODate(date: Date) {
  return date.toISOString().split("T")[0];
}

export function parseBrazilianAmount(value: string) {
  const normalized = value.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
}

export function parseStatementText(text: string, baseYear = new Date().getFullYear()): ParsedStatementTransaction[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const results: ParsedStatementTransaction[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const normalized = normalizeText(line);
    if (ignoredStatementTerms.some((term) => normalized.includes(term))) continue;

    const dateMatch = line.match(/\b(\d{2})[/.-](\d{2})(?:[/.-](\d{2,4}))?\b/);
    const amountMatches = [...line.matchAll(/-?\s?(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\b/g)];
    if (!dateMatch || amountMatches.length === 0) continue;

    const amountText = amountMatches[amountMatches.length - 1][1];
    const amount = parseBrazilianAmount(amountText);
    if (!amount || amount <= 0) continue;

    const day = Number.parseInt(dateMatch[1], 10);
    const month = Number.parseInt(dateMatch[2], 10);
    const yearText = dateMatch[3];
    const year = yearText ? Number.parseInt(yearText.length === 2 ? `20${yearText}` : yearText, 10) : baseYear;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) continue;

    let description = line
      .replace(dateMatch[0], "")
      .replace(amountMatches[amountMatches.length - 1][0], "")
      .replace(/\bBRASIL\b|\bPARCELA\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    description = description.replace(/^\W+|\W+$/g, "");
    if (!description || description.length < 3) continue;

    const key = `${date.toISOString().split("T")[0]}|${amount}|${normalizeText(description)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      description: description.slice(0, 120),
      amount,
      category: categorizeExpense(description),
      date: date.toISOString().split("T")[0],
      sourceLine: line,
    });
  }

  return results;
}

export function buildCsv(rows: Array<Record<string, string | number | boolean | null | undefined>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | boolean | null | undefined) => {
    const raw = value == null ? "" : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export function downloadTextFile(fileName: string, content: string, mimeType = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
