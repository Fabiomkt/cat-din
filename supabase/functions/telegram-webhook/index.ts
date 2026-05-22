import { createClient } from "npm:@supabase/supabase-js@2";
import * as pdfjs from "npm:pdfjs-dist/legacy/build/pdf.mjs";

type ParsedTransaction = {
  description: string;
  amount: number;
  category: string;
  date: string;
  sourceLine: string;
};

type Period = {
  label: string;
  start: string;
  end: string;
};

type TransactionRow = {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const categoryRules = [
  { category: "Mercado", keywords: ["mercado", "supermerc", "atacadao", "assai", "carrefour", "extra", "pao de acucar"] },
  { category: "Restaurante", keywords: ["restaurante", "ifood", "ubereats", "burger", "pizza", "lanch", "padaria", "cafe", "almoco", "jantar"] },
  { category: "Bebidas", keywords: ["agua", "refri", "refrigerante", "monster", "energetico", "bebida", "cerveja", "suco"] },
  { category: "Transporte", keywords: ["uber", "99", "posto", "combust", "gasolina", "estacion", "metro", "onibus", "taxi"] },
  { category: "Energia", keywords: ["energia", "eletropaulo", "enel", "light"] },
  { category: "Internet", keywords: ["internet", "vivo", "claro", "tim", "oi", "netflix", "spotify", "google", "apple.com", "amazon prime"] },
  { category: "Saude", keywords: ["farmacia", "drogaria", "droga", "hospital", "clinica", "laboratorio", "remedio"] },
  { category: "Educacao", keywords: ["curso", "escola", "faculdade", "udemy", "alura", "livraria"] },
  { category: "Lazer", keywords: ["cinema", "ingresso", "show", "teatro", "steam", "playstation", "xbox"] },
  { category: "Viagem", keywords: ["hotel", "airbnb", "latam", "gol ", "azul", "booking"] },
  { category: "Financiamento", keywords: ["financiamento", "emprestimo"] },
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

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function categorizeExpense(description: string) {
  const normalized = normalizeText(description);
  return categoryRules.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword)))?.category ?? "Outros";
}

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function isoDate(date: Date) {
  return date.toISOString().split("T")[0];
}

function parseAmount(value: string) {
  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
}

function parseDateFromText(text: string) {
  const normalized = normalizeText(text);
  const now = new Date();
  if (normalized.includes("anteontem")) {
    const date = new Date(now);
    date.setDate(date.getDate() - 2);
    return date;
  }
  if (normalized.includes("ontem")) {
    const date = new Date(now);
    date.setDate(date.getDate() - 1);
    return date;
  }
  if (normalized.includes("hoje")) return now;

  const dateMatch = text.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
  if (!dateMatch) return now;

  const day = Number.parseInt(dateMatch[1], 10);
  const month = Number.parseInt(dateMatch[2], 10);
  const yearText = dateMatch[3];
  const year = yearText ? Number.parseInt(yearText.length === 2 ? `20${yearText}` : yearText, 10) : now.getFullYear();
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : now;
}

function cleanDescription(text: string, amountMatch: string) {
  return text
    .replace(amountMatch, "")
    .replace(/\b(gastei|paguei|comprei|compra|em|no|na|de|do|da|hoje|ontem|anteontem)\b/gi, " ")
    .replace(/\b\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\W+|\W+$/g, "")
    .slice(0, 120);
}

function parseExpenseMessage(text: string): ParsedTransaction[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parsed: ParsedTransaction[] = [];

  for (const line of lines) {
    const amountMatch = line.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+[.]\d{2}|\d+)/i);
    if (!amountMatch) continue;

    const amount = parseAmount(amountMatch[1]);
    if (!amount || amount <= 0) continue;

    const description = cleanDescription(line, amountMatch[0]) || "Gasto Telegram";
    parsed.push({
      description,
      amount,
      category: categorizeExpense(description),
      date: isoDate(parseDateFromText(line)),
      sourceLine: line,
    });
  }

  return parsed;
}

function parseStatementText(text: string, baseYear = new Date().getFullYear()) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const results: ParsedTransaction[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const normalized = normalizeText(line);
    if (ignoredStatementTerms.some((term) => normalized.includes(term))) continue;

    const dateMatch = line.match(/\b(\d{2})[/.-](\d{2})(?:[/.-](\d{2,4}))?\b/);
    const amountMatches = [...line.matchAll(/-?\s?(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})\b/g)];
    if (!dateMatch || amountMatches.length === 0) continue;

    const amount = parseAmount(amountMatches[amountMatches.length - 1][1]);
    if (!amount) continue;

    const day = Number.parseInt(dateMatch[1], 10);
    const month = Number.parseInt(dateMatch[2], 10);
    const yearText = dateMatch[3];
    const year = yearText ? Number.parseInt(yearText.length === 2 ? `20${yearText}` : yearText, 10) : baseYear;
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) continue;

    const description = line
      .replace(dateMatch[0], "")
      .replace(amountMatches[amountMatches.length - 1][0], "")
      .replace(/\bBRASIL\b|\bPARCELA\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\W+|\W+$/g, "")
      .slice(0, 120);

    if (!description || description.length < 3) continue;
    const key = `${isoDate(date)}|${amount}|${normalizeText(description)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      description,
      amount,
      category: categorizeExpense(description),
      date: isoDate(date),
      sourceLine: line,
    });
  }

  return results;
}

function parsePeriod(input = ""): Period {
  const normalized = normalizeText(input);
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), 1);
  let end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let label = "este mes";

  if (normalized.includes("hoje")) {
    start = new Date(now);
    end = new Date(now);
    label = "hoje";
  } else if (normalized.includes("ontem")) {
    start = new Date(now);
    start.setDate(start.getDate() - 1);
    end = new Date(start);
    label = "ontem";
  } else if (normalized.includes("semana")) {
    start = new Date(now);
    start.setDate(start.getDate() - 6);
    end = new Date(now);
    label = "ultimos 7 dias";
  } else if (normalized.includes("30")) {
    start = new Date(now);
    start.setDate(start.getDate() - 29);
    end = new Date(now);
    label = "ultimos 30 dias";
  } else {
    const matches = [...input.matchAll(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/g)];
    if (matches.length >= 1) {
      const toDate = (match: RegExpMatchArray) => {
        const day = Number.parseInt(match[1], 10);
        const month = Number.parseInt(match[2], 10);
        const yearText = match[3];
        const year = yearText ? Number.parseInt(yearText.length === 2 ? `20${yearText}` : yearText, 10) : now.getFullYear();
        return new Date(year, month - 1, day);
      };
      start = toDate(matches[0]);
      end = matches[1] ? toDate(matches[1]) : new Date(start);
      label = `${start.toLocaleDateString("pt-BR")} a ${end.toLocaleDateString("pt-BR")}`;
    }
  }

  return { label, start: isoDate(start), end: isoDate(end) };
}

function groupByCategory(rows: TransactionRow[]) {
  return rows
    .filter((row) => row.type === "expense")
    .reduce((acc, row) => {
      acc[row.category] = (acc[row.category] || 0) + Number(row.amount);
      return acc;
    }, {} as Record<string, number>);
}

function formatCategoryRanking(rows: TransactionRow[], limit = 5) {
  const grouped = groupByCategory(rows);
  const ranking = Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, limit);
  return ranking.length
    ? ranking.map(([category, amount], index) => `${index + 1}. ${category}: ${formatCurrency(amount)}`).join("\n")
    : "Sem gastos no periodo.";
}

async function extractPdfText(buffer: ArrayBuffer) {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    isEvalSupported: false,
  });
  const document = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: { str?: string }) => item.str ?? "").join("\n"));
  }

  return pages.join("\n");
}

async function sendTelegramMessage(token: string, chatId: number, text: string) {
  const chunks = text.match(/[\s\S]{1,3900}/g) || [text];
  for (const chunk of chunks) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk }),
    });
  }
}

async function fetchTransactions(supabase: ReturnType<typeof createClient>, userId: string, period: Period) {
  const { data, error } = await supabase
    .from("transactions")
    .select("date, description, amount, type, category")
    .eq("user_id", userId)
    .gte("date", period.start)
    .lte("date", period.end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => ({
    ...row,
    amount: Number(row.amount),
  })) as TransactionRow[];
}

async function insertTelegramExpenses(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  transactions: ParsedTransaction[],
  source: "telegram_message" | "telegram_pdf",
  importId?: string,
) {
  const { error: transactionError } = await supabase.from("transactions").insert(transactions.map((transaction) => ({
    user_id: userId,
    description: transaction.description,
    amount: transaction.amount,
    type: "expense",
    category: transaction.category,
    date: transaction.date,
    source,
    import_id: importId ?? null,
    metadata: { sourceLine: transaction.sourceLine },
  })));

  if (transactionError) throw transactionError;

  await supabase.from("gastos_telegram").insert(transactions.map((transaction) => ({
    user_id: userId,
    mensagem_bruta: transaction.sourceLine,
    descricao: transaction.description,
    valor: transaction.amount,
    categoria: transaction.category,
    data_vencimento: transaction.date,
    origem: source,
  })));
}

function helpMessage(chatId: number) {
  return [
    "CatDin no Telegram",
    "",
    `Seu ID para vincular no app: ${chatId}`,
    "",
    "Envie gastos assim:",
    "gastei 35,90 no mercado hoje",
    "Uber 18,50 ontem",
    "22/05 farmacia 42,10",
    "",
    "Comandos:",
    "/resumo - resumo do mes",
    "Quanto gastei ate agora? - resumo do mes",
    "/resumo semana - ultimos 7 dias",
    "/extrato 30 - ultimos 30 dias",
    "/analise - cortes e sugestoes",
    "",
    "Tambem posso receber PDF de fatura e importar os gastos por categoria.",
  ].join("\n");
}

function wantsSummary(normalizedText: string) {
  return (
    normalizedText.startsWith("/resumo") ||
    normalizedText.includes("quanto gastei") ||
    normalizedText.includes("quanto eu gastei") ||
    normalizedText.includes("total gasto") ||
    normalizedText.includes("gastei ate agora") ||
    normalizedText === "resumo"
  );
}

function wantsStatement(normalizedText: string) {
  return normalizedText.startsWith("/extrato") || normalizedText.includes("extrato") || normalizedText.includes("ultimos gastos");
}

function wantsAnalysis(normalizedText: string) {
  return normalizedText.startsWith("/analise") || normalizedText.includes("analise") || normalizedText.includes("opcoes de corte") || normalizedText.includes("investimento");
}

async function handleSummary(supabase: ReturnType<typeof createClient>, token: string, chatId: number, userId: string, text: string) {
  const period = parsePeriod(text);
  const rows = await fetchTransactions(supabase, userId, period);
  const income = rows.filter((row) => row.type === "income").reduce((sum, row) => sum + row.amount, 0);
  const expense = rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amount, 0);
  const balance = income - expense;

  await sendTelegramMessage(token, chatId, [
    `Resumo - ${period.label}`,
    `Entradas: ${formatCurrency(income)}`,
    `Saidas: ${formatCurrency(expense)}`,
    `Saldo: ${formatCurrency(balance)}`,
    "",
    "Categorias:",
    formatCategoryRanking(rows),
  ].join("\n"));
}

async function handleStatement(supabase: ReturnType<typeof createClient>, token: string, chatId: number, userId: string, text: string) {
  const period = parsePeriod(text);
  const rows = await fetchTransactions(supabase, userId, period);
  const expenses = rows.filter((row) => row.type === "expense").slice(0, 15);

  if (expenses.length === 0) {
    await sendTelegramMessage(token, chatId, `Sem gastos em ${period.label}.`);
    return;
  }

  await sendTelegramMessage(token, chatId, [
    `Extrato - ${period.label}`,
    ...expenses.map((row) => `${new Date(`${row.date}T00:00:00`).toLocaleDateString("pt-BR")} | ${row.description} | ${row.category} | ${formatCurrency(row.amount)}`),
  ].join("\n"));
}

async function handleAnalysis(supabase: ReturnType<typeof createClient>, token: string, chatId: number, userId: string, text: string) {
  const period = parsePeriod(text);
  const rows = await fetchTransactions(supabase, userId, period);
  const income = rows.filter((row) => row.type === "income").reduce((sum, row) => sum + row.amount, 0);
  const expense = rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amount, 0);
  const balance = income - expense;
  const grouped = Object.entries(groupByCategory(rows)).sort((a, b) => b[1] - a[1]);
  const largest = rows.filter((row) => row.type === "expense").sort((a, b) => b.amount - a.amount)[0];
  const cuts = grouped
    .filter(([category]) => ["Restaurante", "Lazer", "Assinaturas", "Transporte", "Outros"].includes(category))
    .slice(0, 3)
    .map(([category, amount]) => `Reduzir 15% em ${category}: economia estimada de ${formatCurrency(amount * 0.15)}`);
  const investmentSuggestion = balance > 0
    ? `Separar ${formatCurrency(balance * 0.3)} para reserva/investimentos e manter ${formatCurrency(balance * 0.7)} como folga.`
    : `Antes de investir, buscar cortar ao menos ${formatCurrency(Math.abs(balance))} para fechar o periodo no azul.`;

  await sendTelegramMessage(token, chatId, [
    `Analise - ${period.label}`,
    `Entradas: ${formatCurrency(income)}`,
    `Saidas: ${formatCurrency(expense)}`,
    `Saldo: ${formatCurrency(balance)}`,
    "",
    "Maiores categorias:",
    formatCategoryRanking(rows, 5),
    "",
    largest ? `Maior gasto: ${largest.description} (${formatCurrency(largest.amount)})` : "Maior gasto: nenhum gasto no periodo",
    "",
    "Opcoes de corte:",
    cuts.length ? cuts.join("\n") : "Poucos dados variaveis para sugerir cortes.",
    "",
    "Investimento/reserva:",
    investmentSuggestion,
  ].join("\n"));
}

Deno.serve(async (request) => {
  try {
    if (request.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const webhookSecret = Deno.env.get("TELEGRAM_WEBHOOK_SECRET");

    if (!supabaseUrl || !serviceRoleKey || !telegramToken) {
      return new Response(JSON.stringify({ error: "Missing function environment variables" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    if (webhookSecret && request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
      return new Response(JSON.stringify({ error: "Invalid webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const update = await request.json();
    const updateId = update.update_id;
    const message = update.message;
    const chatId = message?.chat?.id;

    if (!chatId) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (typeof updateId === "number") {
      const { error: logError } = await supabase
        .from("telegram_update_log")
        .insert({ update_id: updateId, chat_id: chatId });

      if (logError?.code === "23505") {
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          headers: { ...corsHeaders, "content-type": "application/json" },
        });
      }

      if (logError) throw logError;
    }

    const { data: profile } = await supabase
      .from("perfis_telegram")
      .select("user_id")
      .eq("chat_id", chatId)
      .maybeSingle();

    if (message?.text && ["/start", "/ajuda", "/help"].some((command) => normalizeText(message.text).startsWith(command))) {
      await sendTelegramMessage(telegramToken, chatId, helpMessage(chatId));
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    if (!profile?.user_id) {
      await sendTelegramMessage(telegramToken, chatId, `Telegram nao vinculado ao CatDin.\nAbra Configuracoes > Integracao com Telegram e cadastre este ID: ${chatId}`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const userId = profile.user_id;
    const text = message?.text || "";
    const normalizedText = normalizeText(text);

    if (wantsSummary(normalizedText)) {
      await handleSummary(supabase, telegramToken, chatId, userId, text);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    if (wantsStatement(normalizedText)) {
      await handleStatement(supabase, telegramToken, chatId, userId, text);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    if (wantsAnalysis(normalizedText)) {
      await handleAnalysis(supabase, telegramToken, chatId, userId, text);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    if (message?.text) {
      const parsed = parseExpenseMessage(message.text);
      if (parsed.length === 0) {
        await sendTelegramMessage(telegramToken, chatId, "Nao encontrei um gasto nessa mensagem. Exemplo: gastei 35,90 no mercado hoje");
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "content-type": "application/json" } });
      }

      await insertTelegramExpenses(supabase, userId, parsed, "telegram_message");
      const total = parsed.reduce((sum, transaction) => sum + transaction.amount, 0);
      await sendTelegramMessage(telegramToken, chatId, [
        `${parsed.length} gasto(s) registrado(s):`,
        ...parsed.map((transaction) => `${transaction.description} | ${transaction.category} | ${formatCurrency(transaction.amount)} | ${new Date(`${transaction.date}T00:00:00`).toLocaleDateString("pt-BR")}`),
        `Total: ${formatCurrency(total)}`,
      ].join("\n"));
      return new Response(JSON.stringify({ ok: true, count: parsed.length }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    const documentMessage = message?.document;
    const isPdf = documentMessage?.mime_type === "application/pdf" || documentMessage?.file_name?.toLowerCase().endsWith(".pdf");
    if (documentMessage?.file_id && isPdf) {
      const fileResult = await fetch(`https://api.telegram.org/bot${telegramToken}/getFile?file_id=${documentMessage.file_id}`);
      const filePayload = await fileResult.json();
      const filePath = filePayload.result?.file_path;

      if (!filePath) {
        await sendTelegramMessage(telegramToken, chatId, "Nao consegui baixar o PDF.");
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "content-type": "application/json" } });
      }

      const fileResponse = await fetch(`https://api.telegram.org/file/bot${telegramToken}/${filePath}`);
      const textFromPdf = await extractPdfText(await fileResponse.arrayBuffer());
      const parsed = parseStatementText(textFromPdf);

      if (parsed.length === 0) {
        await sendTelegramMessage(telegramToken, chatId, "Nenhum gasto foi identificado no PDF.");
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "content-type": "application/json" } });
      }

      const total = parsed.reduce((sum, transaction) => sum + transaction.amount, 0);
      const { data: importRecord, error: importError } = await supabase
        .from("statement_imports")
        .insert({
          user_id: userId,
          source: "telegram_pdf",
          file_name: documentMessage.file_name || "telegram.pdf",
          transactions_count: parsed.length,
          total_amount: total,
        })
        .select("id")
        .single();

      if (importError) throw importError;

      await insertTelegramExpenses(supabase, userId, parsed, "telegram_pdf", importRecord.id);
      await sendTelegramMessage(telegramToken, chatId, `${parsed.length} gasto(s) importado(s) do PDF. Total: ${formatCurrency(total)}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});
