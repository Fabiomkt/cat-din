import { Home, Zap, Wifi, Car, CreditCard, Droplets, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  paid: boolean;
  icon: string;
  category: "casa" | "financiamento" | "fixa";
}

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  zap: Zap,
  wifi: Wifi,
  car: Car,
  credit: CreditCard,
  water: Droplets,
  phone: Phone,
};

interface FixedExpensesTableProps {
  expenses: FixedExpense[];
  onTogglePaid: (id: string) => void;
}

const FixedExpensesTable = ({ expenses, onTogglePaid }: FixedExpensesTableProps) => {
  const categoryLabels: Record<string, string> = {
    casa: "🏠 Contas de Casa",
    financiamento: "🏦 Financiamentos",
    fixa: "📋 Contas Fixas",
  };

  const grouped = expenses.reduce((acc, exp) => {
    if (!acc[exp.category]) acc[exp.category] = [];
    acc[exp.category].push(exp);
    return acc;
  }, {} as Record<string, FixedExpense[]>);

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border/50">
            <h3 className="font-semibold text-foreground">{categoryLabels[category]}</h3>
          </div>
          <div className="divide-y divide-border/50">
            {items.map((expense) => {
              const Icon = iconMap[expense.icon] || CreditCard;
              return (
                <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{expense.name}</p>
                      <p className="text-xs text-muted-foreground">Vence dia {expense.dueDay}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-sm text-foreground">
                      R$ {expense.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <button
                      onClick={() => onTogglePaid(expense.id)}
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                        expense.paid
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      )}
                    >
                      {expense.paid ? "Pago" : "Pendente"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FixedExpensesTable;
