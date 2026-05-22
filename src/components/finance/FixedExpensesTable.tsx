import { Home, Zap, Wifi, Car, CreditCard, Droplets, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmActionButton from "@/components/ConfirmActionButton";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { FixedExpenseCategory } from "@/lib/finance";

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  dueDay: number;
  paid: boolean;
  icon: string;
  category: FixedExpenseCategory;
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
  onTogglePaid: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

const FixedExpensesTable = ({ expenses, onTogglePaid, onDelete }: FixedExpensesTableProps) => {
  const categoryLabels: Record<string, string> = {
    casa: "Contas de casa",
    financiamento: "Financiamentos",
    fixa: "Contas fixas",
  };

  const grouped = expenses.reduce((acc, exp) => {
    if (!acc[exp.category]) acc[exp.category] = [];
    acc[exp.category].push(exp);
    return acc;
  }, {} as Record<string, FixedExpense[]>);

  if (expenses.length === 0) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 shadow-sm p-8 text-center text-sm text-muted-foreground">
        Nenhuma conta fixa cadastrada.
      </div>
    );
  }

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
                <div key={expense.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm text-foreground">{expense.name}</p>
                      <p className="text-xs text-muted-foreground">Vence dia {expense.dueDay}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <p className="font-semibold text-sm text-foreground">
                      R$ {expense.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTogglePaid(expense.id)}
                      className={cn(
                        "rounded-full text-xs font-medium",
                        expense.paid
                          ? "bg-success/10 text-success hover:bg-success/20 hover:text-success"
                          : "bg-warning/10 text-warning hover:bg-warning/20 hover:text-warning"
                      )}
                    >
                      {expense.paid ? "Pago" : "Pendente"}
                    </Button>
                    <ConfirmActionButton
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="Remover conta"
                      description={`Remover "${expense.name}" das suas contas fixas?`}
                      confirmLabel="Remover"
                      onConfirm={() => onDelete(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </ConfirmActionButton>
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
