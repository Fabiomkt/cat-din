import { ArrowDownLeft, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmActionButton from "@/components/ConfirmActionButton";
import { cn } from "@/lib/utils";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void | Promise<void>;
  onEdit?: (tx: Transaction) => void;
}

const categoryColors: Record<string, string> = {
  Salario: "bg-success/10 text-success",
  Freelance: "bg-primary/10 text-primary",
  Aluguel: "bg-destructive/10 text-destructive",
  Mercado: "bg-warning/10 text-warning",
  Energia: "bg-warning/10 text-warning",
  Internet: "bg-primary/10 text-primary",
  Transporte: "bg-muted-foreground/10 text-muted-foreground",
  Lazer: "bg-primary/10 text-primary",
  Financiamento: "bg-destructive/10 text-destructive",
  Restaurante: "bg-warning/10 text-warning",
  Bebidas: "bg-primary/10 text-primary",
  Saude: "bg-success/10 text-success",
  Educacao: "bg-primary/10 text-primary",
  Assinaturas: "bg-primary/10 text-primary",
  Viagem: "bg-muted-foreground/10 text-muted-foreground",
};

const TransactionList = ({ transactions, onDelete, onEdit }: TransactionListProps) => {
  return (
    <div className="rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/50">
        <h3 className="font-semibold text-foreground">Ultimas transacoes</h3>
      </div>
      <div className="divide-y divide-border/50">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors">
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn(
                "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center",
                tx.type === "income" ? "bg-success/10" : "bg-destructive/10"
              )}>
                {tx.type === "income" ? (
                  <ArrowDownLeft className="h-5 w-5 text-success" />
                ) : (
                  <ArrowUpRight className="h-5 w-5 text-destructive" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-sm text-foreground">{tx.description}</p>
                <span className={cn("text-xs px-2 py-0.5 rounded-full", categoryColors[tx.category] || "bg-muted text-muted-foreground")}>
                  {tx.category}
                </span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="text-right">
                <p className={cn("font-semibold text-sm", tx.type === "income" ? "text-success" : "text-destructive")}>
                  {tx.type === "income" ? "+" : "-"} R$ {Math.abs(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">{tx.date}</p>
              </div>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(tx)}
                  className="h-8 w-8 rounded-lg text-muted-foreground"
                  title="Editar transacao"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              <ConfirmActionButton
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                title="Remover transacao"
                description={`Remover "${tx.description}" da sua lista de gastos?`}
                confirmLabel="Remover"
                onConfirm={() => onDelete(tx.id)}
              >
                <Trash2 className="h-4 w-4" />
              </ConfirmActionButton>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;
