import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface AddTransactionDialogProps {
  onAdd: (tx: { description: string; amount: number; type: "income" | "expense"; category: string }) => void;
  onAddFixed?: (expense: { name: string; amount: number; dueDay: number; category: "casa" | "financiamento" | "fixa"; icon: string; installments?: number }) => void;
}

const transactionCategories = [
  "Salário", "Freelance", "Aluguel", "Mercado", "Energia",
  "Internet", "Transporte", "Lazer", "Financiamento", "Outros",
];

const fixedCategories = [
  { value: "casa", label: "🏠 Contas de Casa" },
  { value: "financiamento", label: "🏦 Financiamento" },
  { value: "fixa", label: "📋 Conta Fixa" },
];

const iconOptions = [
  { value: "home", label: "🏠 Casa" },
  { value: "zap", label: "⚡ Energia" },
  { value: "wifi", label: "📶 Internet" },
  { value: "car", label: "🚗 Veículo" },
  { value: "credit", label: "💳 Cartão" },
  { value: "water", label: "💧 Água" },
  { value: "phone", label: "📱 Telefone" },
];

const AddTransactionDialog = ({ onAdd, onAddFixed }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"transaction" | "fixed">("transaction");

  // Transaction fields
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");

  // Fixed expense fields
  const [fixedName, setFixedName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedDueDay, setFixedDueDay] = useState("");
  const [fixedCategory, setFixedCategory] = useState<"casa" | "financiamento" | "fixa">("fixa");
  const [fixedIcon, setFixedIcon] = useState("home");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState("");

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setType("expense");
    setCategory("");
    setFixedName("");
    setFixedAmount("");
    setFixedDueDay("");
    setFixedCategory("fixa");
    setFixedIcon("home");
    setIsInstallment(false);
    setInstallments("");
    setMode("transaction");
  };

  const handleSubmit = () => {
    if (mode === "transaction") {
      if (!description || !amount || !category) return;
      onAdd({ description, amount: parseFloat(amount), type, category });
    } else {
      if (!fixedName || !fixedAmount || !fixedDueDay) return;
      onAddFixed?.({
        name: fixedName,
        amount: parseFloat(fixedAmount),
        dueDay: parseInt(fixedDueDay),
        category: fixedCategory,
        icon: fixedIcon,
        installments: isInstallment && installments ? parseInt(installments) : undefined,
      });
    }
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2">
          <Plus className="h-4 w-4" />
          Nova Transação
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Mode selector */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === "transaction" ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setMode("transaction")}
            >
              Transação
            </Button>
            <Button
              variant={mode === "fixed" ? "default" : "outline"}
              className="rounded-xl"
              onClick={() => setMode("fixed")}
            >
              Conta Fixa
            </Button>
          </div>

          {mode === "transaction" ? (
            <>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input className="rounded-xl" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Supermercado" />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input className="rounded-xl" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Entrada</SelectItem>
                      <SelectItem value="expense">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {transactionCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Nome da conta</Label>
                <Input className="rounded-xl" value={fixedName} onChange={(e) => setFixedName(e.target.value)} placeholder="Ex: Aluguel" />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input className="rounded-xl" type="number" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Dia de vencimento</Label>
                  <Input className="rounded-xl" type="number" min="1" max="31" value={fixedDueDay} onChange={(e) => setFixedDueDay(e.target.value)} placeholder="1-31" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={fixedCategory} onValueChange={(v) => setFixedCategory(v as "casa" | "financiamento" | "fixa")}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fixedCategories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Select value={fixedIcon} onValueChange={setFixedIcon}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((i) => (
                      <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <Label className="cursor-pointer">Parcelado?</Label>
                <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
              </div>
              {isInstallment && (
                <div className="space-y-2">
                  <Label>Número de parcelas</Label>
                  <Input className="rounded-xl" type="number" min="2" value={installments} onChange={(e) => setInstallments(e.target.value)} placeholder="Ex: 12" />
                </div>
              )}
            </>
          )}

          <Button className="w-full rounded-xl" onClick={handleSubmit}>Adicionar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
