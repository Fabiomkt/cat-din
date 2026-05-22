# CatDin

Aplicativo web de controle financeiro pessoal com Supabase.

## Principais recursos

- Autenticacao por e-mail e senha.
- Lancamentos de entradas, saidas e parcelas.
- Contas fixas e financiamentos.
- Importacao de fatura de cartao em PDF.
- Categorizacao automatica por palavras-chave.
- Gastos vinculados ao Telegram.
- Exportacao CSV e limpeza dos dados financeiros.
- Temas, cores e modo escuro.

## Desenvolvimento

```bash
npm install
npm run dev
```

Crie um arquivo `.env` a partir de `.env.example` com as credenciais publicas do Supabase.

## Verificacao

```bash
npm run lint
npm test
npm run build
npm audit
```

## Bot do Telegram

O bot usa a Edge Function `telegram-webhook`.

Secrets necessarios no Supabase:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN="token_do_bot"
supabase secrets set TELEGRAM_WEBHOOK_SECRET="um_segredo_longo"
```

Depois do deploy da funcao, configure o webhook no Telegram:

```bash
supabase functions deploy telegram-webhook --no-verify-jwt

curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Fluxos suportados:

- Mensagem de gasto: `gastei 35,90 no mercado hoje`
- Data explicita: `22/05 farmacia 42,10`
- PDF de fatura: o bot le, categoriza e importa os gastos
- `/resumo`, `/extrato`, `/analise`, `/ajuda`
