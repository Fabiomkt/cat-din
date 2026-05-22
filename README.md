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
