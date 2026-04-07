import { useEffect, useState } from "react";
import { ArrowDownLeft, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface GastoTelegram {
  id: number;
  descricao: string | null;
  valor: number | null;
  data_criacao: string;
}

const TelegramTransactions = () => {
  const [gastos, setGastos] = useState<GastoTelegram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGastos = async () => {
      const { data, error } = await supabase
        .from("gastos_telegram")
        .select("id, descricao, valor, data_criacao")
        .order("data_criacao", { ascending: false })
        .limit(20);

      if (!error && data) {
        setGastos(data);
      }
      setLoading(false);
    };
    fetchGastos();
  }, []);

  const formatCurrency = (value: number | null) =>
    value != null
      ? `R$ ${Math.abs(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      : "—";

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
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
      {gastos.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          Nenhum gasto registrado pelo Telegram.
        </div>
      ) : (
        <div className="divide-y divide-border/50">
          {gastos.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <ArrowDownLeft className="h-5 w-5 text-destructive" />
                </div>
                <p className="font-medium text-sm text-foreground">
                  {g.descricao || "Sem descrição"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-destructive">
                  - {formatCurrency(g.valor)}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(g.data_criacao)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TelegramTransactions;
