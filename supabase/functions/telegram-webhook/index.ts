import { createClient } from "npm:@supabase/supabase-js@2";
import * as pdfjs from "npm:pdfjs-dist/legacy/build/pdf.mjs";

type ParsedTransaction = {
  description: string;
  amount: number;
  category: string;
  date: string;
  sourceLine: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const categoryRules = [
  { category: "Mercado", keywords: ["mercado", "supermerc", "atacadao", "assai", "carrefour", "extra"] },
  { category: "Restaurante", keywords: ["restaurante", "ifood", "ubereats", "burger", "pizza", "lanch", "padaria", "cafe"] },
  { category: "Transporte", keywords: ["uber", "99", "posto", "combust", "gasolina", "estacion", "metro", "onibus"] },
  { category: "Internet", keywords: ["internet", "vivo", "claro", "tim", "netflix", "spotify", "google", "apple.com"] },
  { category: "Saude", keywords: ["farmacia", "drogaria", "hospital", "clinica", "laboratorio"] },
  { category: "Educacao", keywords: ["curso", "escola", "faculdade", "udemy", "alura", "livraria"] },
  { category: "Lazer", keywords: ["cinema", "ingresso", "show", "teatro", "steam", "playstation", "xbox"] },
  { category: "Viagem", keywords: ["hotel", "airbnb", "latam", "gol ", "azul", "booking"] },
  { category: "Financiamento", keywords: ["financiamento", "emprestimo"] },
];

const ignoredTerms = [
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

function parseAmount(value: string) {
  const normalized = value.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.abs(parsed) : null;
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
    if (ignoredTerms.some((term) => normalized.includes(term))) continue;

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
    const key = `${date.toISOString().split("T")[0]}|${amount}|${normalizeText(description)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      description,
      amount,
      category: categorizeExpense(description),
      date: date.toISOString().split("T")[0],
      sourceLine: line,
    });
  }

  return results;
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
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

  if (!supabaseUrl || !serviceRoleKey || !telegramToken) {
    return new Response(JSON.stringify({ error: "Missing function environment variables" }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const update = await request.json();
  const message = update.message;
  const chatId = message?.chat?.id;

  if (!chatId) {
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: profile } = await supabase
    .from("perfis_telegram")
    .select("user_id")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (!profile?.user_id) {
    await sendTelegramMessage(telegramToken, chatId, "Telegram nao vinculado ao CatDin.");
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const userId = profile.user_id;

  if (message.text) {
    const parsed = parseStatementText(message.text);
    if (parsed.length === 0) {
      await sendTelegramMessage(telegramToken, chatId, "Nao encontrei gastos nessa mensagem.");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    await supabase.from("gastos_telegram").insert(parsed.map((transaction) => ({
      user_id: userId,
      mensagem_bruta: transaction.sourceLine,
      descricao: transaction.description,
      valor: transaction.amount,
      categoria: transaction.category,
      data_vencimento: transaction.date,
      origem: "telegram_message",
    })));

    await sendTelegramMessage(telegramToken, chatId, `${parsed.length} gasto(s) importado(s).`);
    return new Response(JSON.stringify({ ok: true, count: parsed.length }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const documentMessage = message.document;
  const isPdf = documentMessage?.mime_type === "application/pdf" || documentMessage?.file_name?.toLowerCase().endsWith(".pdf");
  if (documentMessage?.file_id && isPdf) {
    const fileResult = await fetch(`https://api.telegram.org/bot${telegramToken}/getFile?file_id=${documentMessage.file_id}`);
    const filePayload = await fileResult.json();
    const filePath = filePayload.result?.file_path;

    if (!filePath) {
      await sendTelegramMessage(telegramToken, chatId, "Nao consegui baixar o PDF.");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const fileResponse = await fetch(`https://api.telegram.org/file/bot${telegramToken}/${filePath}`);
    const text = await extractPdfText(await fileResponse.arrayBuffer());
    const parsed = parseStatementText(text);

    if (parsed.length === 0) {
      await sendTelegramMessage(telegramToken, chatId, "Nenhum gasto foi identificado no PDF.");
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
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

    await supabase.from("transactions").insert(parsed.map((transaction) => ({
      user_id: userId,
      description: transaction.description,
      amount: transaction.amount,
      type: "expense",
      category: transaction.category,
      date: transaction.date,
      source: "telegram_pdf",
      import_id: importRecord.id,
      metadata: {
        sourceLine: transaction.sourceLine,
        telegramFileId: documentMessage.file_id,
      },
    })));

    await sendTelegramMessage(telegramToken, chatId, `${parsed.length} gasto(s) importado(s) do PDF.`);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
