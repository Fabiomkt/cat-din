import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { FixedExpenseCategory, transactionCategories, validateDueDay, validatePositiveAmount, validateText } from "@/lib/finance";
import { toast } from "sonner";

interface AddTransactionDialogProps {
  onAdd: (tx: { description: string; amount: number; type: "income" | "expense"; category: string; installments?: number }) => Promise<boolean>;
  onAddFixed?: (expense: { name: string; amount: number; dueDay: number; category: FixedExpenseCategory; icon: string }) => Promise<boolean>;
}

const fixedCategories = [
  { value: "casa", label: "Casa" },
  { value: "financiamento", label: "Financiamento" },
  { value: "fixa", label: "Conta fixa" },
];

const iconOptions = [
  { value: "home", label: "Casa" },
  { value: "zap", label: "Energia" },
  { value: "wifi", label: "Internet" },
  { value: "car", label: "Veiculo" },
  { value: "credit", label: "Cartao" },
  { value: "water", label: "Agua" },
  { value: "phone", label: "Telefone" },
];

const AddTransactionDialog = ({ onAdd, onAddFixed }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"transaction" | "fixed">("transaction");
  const [submitting, setSubmitting] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState("");

  const [fixedName, setFixedName] = useState("");
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedDueDay, setFixedDueDay] = useState("");
  const [fixedCategory, setFixedCategory] = useState<FixedExpenseCategory>("fixa");
  const [fixedIcon, setFixedIcon] = useState("home");

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setType("expense");
    setCategory("");
    setIsInstallment(false);
    setInstallments("");
    setFixedName("");
    setFixedAmount("");
    setFixedDueDay("");
    setFixedCategory("fixa");
    setFixedIcon("home");
    setMode("transaction");
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (mode === "transaction") {
      const parsedAmount = Number.parseFloat(amount);
      const parsedInstallments = isInstallment && installments ? Number.parseInt(installments, 10) : undefined;
      const error =
        validateText(description, "Descricao") ||
        validatePositiveAmount(parsedAmount) ||
        (!category ? "Selecione uma categoria" : null) ||
        (isInstallment && (!parsedInstallments || parsedInstallments < 2 || parsedInstallments > 120) ? "Parcelas devem estar entre 2 e 120" : null);

      if (error) {
        toast.error(error);
        return;
      }

      setSubmitting(true);
      const success = await onAdd({
        description: description.trim(),
        amount: parsedAmount,
        type,
        category,
        installments: parsedInstallments,
      });
      setSubmitting(false);
      if (!success) return;
    } else {
      const parsedAmount = Number.parseFloat(fixedAmount);
      const parsedDueDay = Number.parseInt(fixedDueDay, 10);
      const error =
        validateText(fixedName, "Nome da conta") ||
        validatePositiveAmount(parsedAmount) ||
        validateDueDay(parsedDueDay);

      if (error) {
        toast.error(error);
        return;
      }

      setSubmitting(true);
      const success = await onAddFixed?.({
        name: fixedName.trim(),
        amount: parsedAmount,
        dueDay: parsedDueDay,
        category: fixedCategory,
        icon: fixedIcon,
      });
      setSubmitting(false);
      if (!success) return;
    }

    resetForm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2">
          <Plus className="h-4 w-4" />
          Nova transacao
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant={mode === "transaction" ? "default" : "outline"} className="rounded-xl" onClick={() => setMode("transaction")}>
              Transacao
            </Button>
            <Button variant={mode === "fixed" ? "default" : "outline"} className="rounded-xl" onClick={() => setMode("fixed")}>
              Conta fixa
            </Button>
          </div>

          {mode === "transaction" ? (
            <>
              <div className="space-y-2">
                <Label>Descricao</Label>
                <Input className="rounded-xl" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex: Supermercado" />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <CurrencyInput className="rounded-xl" value={amount} onValueChange={setAmount} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={(value) => setType(value as "income" | "expense")}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Entrada</SelectItem>
                      <SelectItem value="expense">Saida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {transactionCategories.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-3">
                <Label className="cursor-pointer">Parcelado?</Label>
                <Switch checked={isInstallment} onCheckedChange={setIsInstallment} />
              </div>
              {isInstallment && (
                <div className="space-y-2">
                  <Label>Numero de parcelas</Label>
                  <Input className="rounded-xl" type="number" min="2" max="120" value={installments} onChange={(event) => setInstallments(event.target.value)} placeholder="Ex: 12" />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Nome da conta</Label>
                <Input className="rounded-xl" value={fixedName} onChange={(event) => setFixedName(event.target.value)} placeholder="Ex: Aluguel" />
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <CurrencyInput className="rounded-xl" value={fixedAmount} onValueChange={setFixedAmount} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Dia de vencimento</Label>
                  <Input className="rounded-xl" type="number" min="1" max="31" value={fixedDueDay} onChange={(event) => setFixedDueDay(event.target.value)} placeholder="1-31" />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={fixedCategory} onValueChange={(value) => setFixedCategory(value as FixedExpenseCategory)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fixedCategories.map((item) => (
                        <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Icone</Label>
                <Select value={fixedIcon} onValueChange={setFixedIcon}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <Button className="w-full rounded-xl" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Salvando..." : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
