import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, MessageSquare, Trash2 } from "lucide-react";
import ConfirmActionButton from "@/components/ConfirmActionButton";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, toISODate } from "@/lib/finance";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TelegramTransaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  source: string;
}

interface TelegramTransactionsProps {
  startDate: Date;
  endDate: Date;
  onChanged?: () => void;
}

const TelegramTransactions = ({ startDate, endDate, onChanged }: TelegramTransactionsProps) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TelegramTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("transactions")
      .select("id, description, amount, category, date, source")
      .eq("user_id", user.id)
      .in("source", ["telegram_message", "telegram_pdf"])
      .gte("date", toISODate(startDate))
      .lte("date", toISODate(endDate))
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar gastos do Telegram");
      setLoading(false);
      return;
    }

    setTransactions((data || []).map((row) => ({
      id: row.id,
      description: row.description,
      amount: Number(row.amount),
      category: row.category,
      date: row.date,
      source: row.source,
    })));
    setLoading(false);
  }, [user, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao remover gasto");
      return;
    }

    setTransactions((current) => current.filter((transaction) => transaction.id !== id));
    onChanged?.();
    toast.success("Gasto removido");
  };

  const formatDate = (dateStr: string) =>
    new Date(`${dateStr}T00:00:00`).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  if (loading) {
    return (
      <div className="rounded-2xl bg-card border border-border/50 shadow-sm p-8 text-center text-muted-foreground">
        Carregando gastos do Telegram...
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/50 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Gastos via Telegram</h3>
      </div>
      {transactions.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          Nenhum gasto encontrado para este periodo.
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <ArrowDownLeft className="h-5 w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm text-foreground">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.category} | {transaction.source === "telegram_pdf" ? "PDF" : "Mensagem"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                  <p className="font-semibold text-sm text-destructive">- {formatCurrency(transaction.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                </div>
                <ConfirmActionButton
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                  title="Remover gasto"
                  description={`Remover "${transaction.description}" da lista do Telegram?`}
                  confirmLabel="Remover"
                  onConfirm={() => handleDelete(transaction.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </ConfirmActionButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TelegramTransactions;
