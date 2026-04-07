import { useEffect, useState } from "react";
import { ArrowDownLeft, MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface GastoTelegram {
  id: number;
  descricao: string | null;
  valor: number | null;
  data_criacao: string;
  data_vencimento: string | null;
  parcela_atual: number | null;
  total_parcelas: number | null;
}

interface TelegramTransactionsProps {
  startDate: Date;
  endDate: Date;
  onTotalsChange?: (total: number) => void;
}

const TelegramTransactions = ({ startDate, endDate, onTotalsChange }: TelegramTransactionsProps) => {
  const { user } = useAuth();
  const [gastos, setGastos] = useState<GastoTelegram[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGastos = async () => {
    if (!user) return;
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("gastos_telegram")
      .select("id, descricao, valor, data_criacao, data_vencimento, parcela_atual, total_parcelas")
      .eq("user_id", user.id)
      .gte("data_vencimento", startStr)
      .lte("data_vencimento", endStr)
      .order("data_vencimento", { ascending: false });

    if (!error && data) {
      setGastos(data);
      const total = data.reduce((s, g) => s + (g.valor ?? 0), 0);
      onTotalsChange?.(total);
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchGastos();
  }, [user, startDate, endDate]);

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from("gastos_telegram").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover gasto");
      return;
    }
    setGastos((prev) => prev.filter((g) => g.id !== id));
    toast.success("Gasto removido!");
    // recalc totals
    const remaining = gastos.filter((g) => g.id !== id);
    onTotalsChange?.(remaining.reduce((s, g) => s + (g.valor ?? 0), 0));
  };

  const formatCurrency = (value: number | null) =>
    value != null
      ? `R$ ${Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      : "—";

  const formatDate = (dateStr: string | null) =>
    dateStr
      ? new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "—";

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
      {gastos.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          Nenhum gasto encontrado para este período.
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {gastos.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <ArrowDownLeft className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {g.descricao || "Sem descrição"}
                    {g.total_parcelas && g.total_parcelas > 1 && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {g.parcela_atual ?? 1}/{g.total_parcelas}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-semibold text-sm text-destructive">
                    - {formatCurrency(g.valor)}
                  </p>
                  <p className="text-xs text-muted-foreground">Venc: {formatDate(g.data_vencimento)}</p>
                </div>
                <button
                  onClick={() => handleDelete(g.id)}
                  className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  title="Remover gasto"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TelegramTransactions;
