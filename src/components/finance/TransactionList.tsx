import { ArrowDownLeft, ArrowUpRight, Trash2 } from "lucide-react";
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
  onDelete: (id: string) => void;
}

const categoryColors: Record<string, string> = {
  "Salário": "bg-success/10 text-success",
  "Freelance": "bg-primary/10 text-primary",
  "Aluguel": "bg-destructive/10 text-destructive",
  "Mercado": "bg-warning/10 text-warning",
  "Energia": "bg-warning/10 text-warning",
  "Internet": "bg-primary/10 text-primary",
  "Transporte": "bg-muted-foreground/10 text-muted-foreground",
  "Lazer": "bg-primary/10 text-primary",
  "Financiamento": "bg-destructive/10 text-destructive",
};

const TransactionList = ({ transactions }: TransactionListProps) => {
  return (
    <div className="rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/50">
        <h3 className="font-semibold text-foreground">Últimas Transações</h3>
      </div>
      <div className="divide-y divide-border/50">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                tx.type === "income" ? "bg-success/10" : "bg-destructive/10"
              )}>
                {tx.type === "income" ? (
                  <ArrowDownLeft className="h-5 w-5 text-success" />
                ) : (
                  <ArrowUpRight className="h-5 w-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">{tx.description}</p>
                <span className={cn("text-xs px-2 py-0.5 rounded-full", categoryColors[tx.category] || "bg-muted text-muted-foreground")}>
                  {tx.category}
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className={cn("font-semibold text-sm", tx.type === "income" ? "text-success" : "text-destructive")}>
                {tx.type === "income" ? "+" : "-"} R$ {Math.abs(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">{tx.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;
