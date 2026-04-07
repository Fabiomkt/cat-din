import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface AddTransactionDialogProps {
  onAdd: (tx: { description: string; amount: number; type: "income" | "expense"; category: string }) => void;
}

const categories = [
  "Salário", "Freelance", "Aluguel", "Mercado", "Energia",
  "Internet", "Transporte", "Lazer", "Financiamento", "Outros",
];

const AddTransactionDialog = ({ onAdd }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState("");

  const handleSubmit = () => {
    if (!description || !amount || !category) return;
    onAdd({ description, amount: parseFloat(amount), type, category });
    setDescription("");
    setAmount("");
    setType("expense");
    setCategory("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl gap-2">
          <Plus className="h-4 w-4" />
          Nova Transação
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar Transação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
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
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Entrada</SelectItem>
                  <SelectItem value="expense">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full rounded-xl" onClick={handleSubmit}>Adicionar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTransactionDialog;
