import { useEffect, useState } from "react";
import { ArrowDownLeft, MessageSquare, Trash2 } from "lucide-react";
import ConfirmActionButton from "@/components/ConfirmActionButton";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/finance";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface GastoTelegram {
  id: number;
  descricao: string | null;
  valor: number | null;
  categoria: string | null;
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

  useEffect(() => {
    const fetchGastos = async () => {
      if (!user) return;
      setLoading(true);
      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("gastos_telegram")
        .select("id, descricao, valor, categoria, data_criacao, data_vencimento, parcela_atual, total_parcelas")
        .eq("user_id", user.id)
        .gte("data_vencimento", startStr)
        .lte("data_vencimento", endStr)
        .order("data_vencimento", { ascending: false });

      if (error) {
        toast.error("Erro ao carregar gastos do Telegram");
        setLoading(false);
        return;
      }

      setGastos(data || []);
      onTotalsChange?.((data || []).reduce((sum, gasto) => sum + (gasto.valor ?? 0), 0));
      setLoading(false);
    };

    fetchGastos();
  }, [user, startDate, endDate, onTotalsChange]);

  const handleDelete = async (id: number) => {
    if (!user) return;
    const { error } = await supabase
      .from("gastos_telegram")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao remover gasto");
      return;
    }

    const remaining = gastos.filter((gasto) => gasto.id !== id);
    setGastos(remaining);
    onTotalsChange?.(remaining.reduce((sum, gasto) => sum + (gasto.valor ?? 0), 0));
    toast.success("Gasto removido");
  };

  const formatDate = (dateStr: string | null) =>
    dateStr
      ? new Date(`${dateStr}T00:00:00`).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "-";

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
          Nenhum gasto encontrado para este periodo.
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {gastos.map((gasto) => (
            <div key={gasto.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <ArrowDownLeft className="h-5 w-5 text-destructive" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm text-foreground">
                    {gasto.descricao || "Sem descricao"}
                    {gasto.total_parcelas && gasto.total_parcelas > 1 && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {gasto.parcela_atual ?? 1}/{gasto.total_parcelas}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{gasto.categoria || "Outros"}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="text-right">
                  <p className="font-semibold text-sm text-destructive">
                    - {gasto.valor != null ? formatCurrency(gasto.valor) : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Venc: {formatDate(gasto.data_vencimento)}</p>
                </div>
                <ConfirmActionButton
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                  title="Remover gasto"
                  description={`Remover "${gasto.descricao || "gasto"}" da lista do Telegram?`}
                  confirmLabel="Remover"
                  onConfirm={() => handleDelete(gasto.id)}
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
