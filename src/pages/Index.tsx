import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, BarChart3, CreditCard, Settings, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SummaryCard from "@/components/finance/SummaryCard";
import DateFilter from "@/components/finance/DateFilter";
import TransactionList, { Transaction } from "@/components/finance/TransactionList";
import FixedExpensesTable, { FixedExpense } from "@/components/finance/FixedExpensesTable";
import AddTransactionDialog from "@/components/finance/AddTransactionDialog";
import EditTransactionDialog from "@/components/finance/EditTransactionDialog";
import TelegramTransactions from "@/components/finance/TelegramTransactions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

const Index = () => {
  const { user } = useAuth();
  const { preferences, updatePreferences } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0));
  const [loading, setLoading] = useState(true);
  const [telegramTotal, setTelegramTotal] = useState(0);
  const [activeTab, setActiveTab] = useState("transactions");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    const startStr = startDate.toISOString().split("T")[0];
    const endStr = endDate.toISOString().split("T")[0];
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startStr)
      .lte("date", endStr)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar transações");
      return;
    }
    setTransactions(
      (data || []).map((t) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as "income" | "expense",
        category: t.category,
        date: new Date(t.date).toLocaleDateString("pt-BR"),
      }))
    );
  }, [user, startDate, endDate]);

  const fetchFixedExpenses = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("due_day", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar contas fixas");
      return;
    }
    setFixedExpenses(
      (data || []).map((e) => ({
        id: e.id,
        name: e.name,
        amount: Number(e.amount),
        dueDay: e.due_day,
        paid: e.paid,
        icon: e.icon,
        category: e.category as "casa" | "financiamento" | "fixa",
      }))
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchTransactions(), fetchFixedExpenses()]).finally(() => setLoading(false));
  }, [user, fetchTransactions, fetchFixedExpenses]);

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalFixed = fixedExpenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense - telegramTotal - totalFixed;

  const handleAddTransaction = async (tx: { description: string; amount: number; type: "income" | "expense"; category: string; installments?: number }) => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];

    if (tx.installments && tx.installments > 1) {
      const perInstallment = Math.round((tx.amount / tx.installments) * 100) / 100;
      const inserts = Array.from({ length: tx.installments }, (_, i) => ({
        description: `${tx.description} (${i + 1}/${tx.installments})`,
        amount: perInstallment,
        type: tx.type,
        category: tx.category,
        date: today,
        user_id: user.id,
      }));
      const { error } = await supabase.from("transactions").insert(inserts);
      if (error) {
        toast.error("Erro ao adicionar parcelas");
        return;
      }
      toast.success(`${tx.installments} parcelas adicionadas!`);
    } else {
      const { error } = await supabase.from("transactions").insert({
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        date: today,
        user_id: user.id,
      });
      if (error) {
        toast.error("Erro ao adicionar transação");
        return;
      }
      toast.success("Transação adicionada!");
    }
    fetchTransactions();
  };

  const handleAddFixed = async (expense: { name: string; amount: number; dueDay: number; category: "casa" | "financiamento" | "fixa"; icon: string }) => {
    if (!user) return;
    const { error } = await supabase.from("fixed_expenses").insert({
      name: expense.name,
      amount: expense.amount,
      due_day: expense.dueDay,
      category: expense.category,
      icon: expense.icon,
      user_id: user.id,
      paid: false,
    });
    if (error) {
      toast.error("Erro ao adicionar conta fixa");
      return;
    }
    toast.success("Conta fixa adicionada!");
    fetchFixedExpenses();
  };

  const handleTogglePaid = async (id: string) => {
    const expense = fixedExpenses.find((e) => e.id === id);
    if (!expense) return;
    const { error } = await supabase
      .from("fixed_expenses")
      .update({ paid: !expense.paid })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    setFixedExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, paid: !e.paid } : e)));
  };

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from("fixed_expenses").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover cobrança");
      return;
    }
    setFixedExpenses((prev) => prev.filter((e) => e.id !== id));
    toast.success("Cobrança removida!");
  };

  const handleDeleteTransaction = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover transação");
      return;
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast.success("Transação removida!");
  };

  const toggleTheme = () => {
    updatePreferences({ theme_mode: preferences.theme_mode === "dark" ? "light" : "dark" });
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary-foreground" />
              </div>
              Finanças
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Organize suas finanças de forma simples</p>
          </div>
          <div className="flex items-center gap-3">
            <DateFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />
            <AddTransactionDialog onAdd={handleAddTransaction} onAddFixed={handleAddFixed} />
            <Button variant="ghost" size="icon" className="rounded-xl" onClick={toggleTheme}>
              {preferences.theme_mode === "dark" ? <Sun className="h-5 w-5 text-muted-foreground" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
            </Button>
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <Settings className="h-5 w-5 text-muted-foreground" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard title="Saldo" value={fmt(balance)} icon={Wallet} trend={balance >= 0 ? "Positivo" : "Negativo"} trendUp={balance >= 0} />
          <SummaryCard title="Entradas" value={fmt(totalIncome)} icon={TrendingUp} trend="Este mês" trendUp />
          <SummaryCard title="Saídas" value={fmt(totalExpense + telegramTotal)} icon={TrendingDown} trend="Este mês" trendUp={false} />
          <SummaryCard title="Contas Fixas" value={fmt(totalFixed)} icon={PiggyBank} trend={`${fixedExpenses.filter((e) => e.paid).length}/${fixedExpenses.length} pagas`} trendUp />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="fixed" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <PiggyBank className="h-4 w-4 mr-2" />
              Contas Fixas
            </TabsTrigger>
            <TabsTrigger value="financing" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <CreditCard className="h-4 w-4 mr-2" />
              Financiamentos
            </TabsTrigger>
            <TabsTrigger value="telegram" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Telegram
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Nenhuma transação encontrada. Adicione sua primeira transação!</div>
            ) : (
              <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} onEdit={handleEditTransaction} />
            )}
          </TabsContent>

          <TabsContent value="fixed">
            <FixedExpensesTable expenses={fixedExpenses.filter((e) => e.category !== "financiamento")} onTogglePaid={handleTogglePaid} onDelete={handleDeleteExpense} />
          </TabsContent>

          <TabsContent value="financing">
            <FixedExpensesTable expenses={fixedExpenses.filter((e) => e.category === "financiamento")} onTogglePaid={handleTogglePaid} onDelete={handleDeleteExpense} />
          </TabsContent>

          <TabsContent value="telegram">
            <TelegramTransactions startDate={startDate} endDate={endDate} onTotalsChange={setTelegramTotal} />
          </TabsContent>
        </Tabs>

        <EditTransactionDialog
          transaction={editingTransaction}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveTransaction}
        />
      </div>
    </div>
  );
};

export default Index;
