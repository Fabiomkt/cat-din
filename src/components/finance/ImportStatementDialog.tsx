import { useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parsePdfStatement } from "@/lib/pdf";
import { formatCurrency, parseStatementText, ParsedStatementTransaction, transactionCategories } from "@/lib/finance";
import { toast } from "sonner";

interface ImportStatementDialogProps {
  onImport: (fileName: string, transactions: ParsedStatementTransaction[], source: "card_pdf" | "telegram_pdf") => Promise<void>;
}

const ImportStatementDialog = ({ onImport }: ImportStatementDialogProps) => {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rawText, setRawText] = useState("");
  const [transactions, setTransactions] = useState<ParsedStatementTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFileName("");
    setRawText("");
    setTransactions([]);
    setLoading(false);
    setImporting(false);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Envie um arquivo PDF");
      return;
    }

    setLoading(true);
    setFileName(file.name);
    try {
      const parsed = await parsePdfStatement(file);
      setRawText(parsed.text);
      setTransactions(parsed.transactions);
      if (parsed.transactions.length === 0) {
        toast.warning("Nenhum gasto foi identificado no PDF");
      } else {
        toast.success(`${parsed.transactions.length} gastos encontrados`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao ler PDF");
    } finally {
      setLoading(false);
    }
  };

  const handleParseText = () => {
    const parsed = parseStatementText(rawText);
    setTransactions(parsed);
    if (parsed.length === 0) {
      toast.warning("Nenhum gasto foi identificado no texto");
      return;
    }
    toast.success(`${parsed.length} gastos encontrados`);
  };

  const updateCategory = (index: number, category: string) => {
    setTransactions((current) => current.map((tx, i) => (i === index ? { ...tx, category } : tx)));
  };

  const handleImport = async () => {
    if (transactions.length === 0) {
      toast.error("Nenhum gasto para importar");
      return;
    }
    setImporting(true);
    try {
      await onImport(fileName || "fatura.pdf", transactions, "card_pdf");
      reset();
      setOpen(false);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl gap-2">
          <Upload className="h-4 w-4" />
          Importar fatura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar fatura do cartão</DialogTitle>
          <DialogDescription>PDF da fatura ou texto extraído do Telegram</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="statement-file">Arquivo PDF</Label>
              <Input
                id="statement-file"
                type="file"
                accept="application/pdf,.pdf"
                className="rounded-xl"
                disabled={loading || importing}
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </div>
            <Button variant="secondary" className="rounded-xl" onClick={handleParseText} disabled={!rawText.trim() || loading || importing}>
              <FileText className="h-4 w-4" />
              Ler texto
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="statement-text">Texto da fatura</Label>
            <Textarea
              id="statement-text"
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              className="min-h-28 rounded-xl font-mono text-xs"
              placeholder="Cole aqui o texto extraído quando o PDF vier pelo Telegram"
              disabled={loading || importing}
            />
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                      Lendo fatura...
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Nenhum gasto carregado
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.slice(0, 40).map((tx, index) => (
                    <TableRow key={`${tx.date}-${tx.amount}-${index}`}>
                      <TableCell className="whitespace-nowrap">{new Date(`${tx.date}T00:00:00`).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="min-w-56">{tx.description}</TableCell>
                      <TableCell className="min-w-44">
                        <Select value={tx.category} onValueChange={(value) => updateCategory(index, value)}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {transactionCategories.map((category) => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(tx.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {transactions.length > 40 && (
            <p className="text-xs text-muted-foreground">Mostrando 40 de {transactions.length} gastos encontrados.</p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setOpen(false)} disabled={importing}>
              Cancelar
            </Button>
            <Button className="rounded-xl" onClick={handleImport} disabled={transactions.length === 0 || loading || importing}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Importar {transactions.length || ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportStatementDialog;
