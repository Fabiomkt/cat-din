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
import ImportStatementDialog from "@/components/finance/ImportStatementDialog";
import TelegramTransactions from "@/components/finance/TelegramTransactions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { FixedExpenseCategory, formatCurrency, ParsedStatementTransaction, toISODate } from "@/lib/finance";
import { toast } from "sonner";

const addMonths = (date: Date, months: number) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const splitInstallments = (amount: number, installments: number) => {
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / installments);
  const remainder = cents % installments;
  return Array.from({ length: installments }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
};

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
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", toISODate(startDate))
      .lte("date", toISODate(endDate))
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar transacoes");
      return;
    }

    setTransactions(
      (data || []).map((transaction) => ({
        id: transaction.id,
        description: transaction.description,
        amount: Number(transaction.amount),
        type: transaction.type as "income" | "expense",
        category: transaction.category,
        date: new Date(`${transaction.date}T00:00:00`).toLocaleDateString("pt-BR"),
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
      (data || []).map((expense) => ({
        id: expense.id,
        name: expense.name,
        amount: Number(expense.amount),
        dueDay: expense.due_day,
        paid: expense.paid,
        icon: expense.icon,
        category: expense.category as FixedExpenseCategory,
      }))
    );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchTransactions(), fetchFixedExpenses()]).finally(() => setLoading(false));
  }, [user, fetchTransactions, fetchFixedExpenses]);

  const totalIncome = transactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalExpense = transactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalFixed = fixedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const balance = totalIncome - totalExpense - telegramTotal - totalFixed;

  const handleAddTransaction = async (tx: { description: string; amount: number; type: "income" | "expense"; category: string; installments?: number }) => {
    if (!user) return false;
    const today = new Date();

    if (tx.installments && tx.installments > 1) {
      const values = splitInstallments(tx.amount, tx.installments);
      const inserts = values.map((amount, index) => ({
        description: `${tx.description} (${index + 1}/${tx.installments})`,
        amount,
        type: tx.type,
        category: tx.category,
        date: toISODate(addMonths(today, index)),
        user_id: user.id,
        source: "manual_installment",
      }));

      const { error } = await supabase.from("transactions").insert(inserts);
      if (error) {
        toast.error("Erro ao adicionar parcelas");
        return false;
      }
      toast.success(`${tx.installments} parcelas adicionadas`);
    } else {
      const { error } = await supabase.from("transactions").insert({
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        category: tx.category,
        date: toISODate(today),
        user_id: user.id,
        source: "manual",
      });

      if (error) {
        toast.error("Erro ao adicionar transacao");
        return false;
      }
      toast.success("Transacao adicionada");
    }

    await fetchTransactions();
    return true;
  };

  const handleAddFixed = async (expense: { name: string; amount: number; dueDay: number; category: FixedExpenseCategory; icon: string }) => {
    if (!user) return false;
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
      return false;
    }

    toast.success("Conta fixa adicionada");
    await fetchFixedExpenses();
    return true;
  };

  const handleImportStatement = async (fileName: string, parsedTransactions: ParsedStatementTransaction[], source: "card_pdf" | "telegram_pdf") => {
    if (!user) return;
    const total = parsedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    const { data: importRecord, error: importError } = await supabase
      .from("statement_imports")
      .insert({
        user_id: user.id,
        source,
        file_name: fileName,
        transactions_count: parsedTransactions.length,
        total_amount: total,
      })
      .select("id")
      .single();

    if (importError) {
      toast.error("Erro ao registrar importacao");
      return;
    }

    const { error } = await supabase.from("transactions").insert(
      parsedTransactions.map((transaction) => ({
        user_id: user.id,
        description: transaction.description,
        amount: transaction.amount,
        type: "expense",
        category: transaction.category,
        date: transaction.date,
        source,
        import_id: importRecord.id,
        metadata: { sourceLine: transaction.sourceLine, fileName },
      }))
    );

    if (error) {
      await supabase.from("statement_imports").delete().eq("id", importRecord.id).eq("user_id", user.id);
      toast.error("Erro ao importar fatura");
      return;
    }

    toast.success(`${parsedTransactions.length} gastos importados`);
    await fetchTransactions();
  };

  const handleTogglePaid = async (id: string) => {
    if (!user) return;
    const expense = fixedExpenses.find((item) => item.id === id);
    if (!expense) return;

    const { error } = await supabase
      .from("fixed_expenses")
      .update({ paid: !expense.paid })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao atualizar conta");
      return;
    }

    setFixedExpenses((prev) => prev.map((item) => (item.id === id ? { ...item, paid: !item.paid } : item)));
  };

  const handleDeleteExpense = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("fixed_expenses").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      toast.error("Erro ao remover cobranca");
      return;
    }

    setFixedExpenses((prev) => prev.filter((expense) => expense.id !== id));
    toast.success("Cobranca removida");
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      toast.error("Erro ao remover transacao");
      return;
    }

    setTransactions((prev) => prev.filter((transaction) => transaction.id !== id));
    toast.success("Transacao removida");
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleSaveTransaction = async (id: string, data: { description: string; amount: number; type: "income" | "expense"; category: string }) => {
    if (!user) return false;
    const { error } = await supabase
      .from("transactions")
      .update({
        description: data.description,
        amount: data.amount,
        type: data.type,
        category: data.category,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao atualizar transacao");
      return false;
    }

    toast.success("Transacao atualizada");
    if (data.category === "Financiamento") setActiveTab("financing");
    await fetchTransactions();
    return true;
  };

  const toggleTheme = () => {
    updatePreferences({ theme_mode: preferences.theme_mode === "dark" ? "light" : "dark" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary-foreground" />
              </div>
              Financas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Organize suas financas de forma simples</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <DateFilter startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />
            <ImportStatementDialog onImport={handleImportStatement} />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard title="Saldo" value={formatCurrency(balance)} icon={Wallet} trend={balance >= 0 ? "Positivo" : "Negativo"} trendUp={balance >= 0} />
          <SummaryCard title="Entradas" value={formatCurrency(totalIncome)} icon={TrendingUp} trend="Este mes" trendUp />
          <SummaryCard title="Saidas" value={formatCurrency(totalExpense + telegramTotal)} icon={TrendingDown} trend="Este mes" trendUp={false} />
          <SummaryCard title="Contas fixas" value={formatCurrency(totalFixed)} icon={PiggyBank} trend={`${fixedExpenses.filter((expense) => expense.paid).length}/${fixedExpenses.length} pagas`} trendUp />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Transacoes
            </TabsTrigger>
            <TabsTrigger value="fixed" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <PiggyBank className="h-4 w-4 mr-2" />
              Contas fixas
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
              <div className="rounded-2xl bg-card border border-border/50 shadow-sm text-center py-12 text-muted-foreground">
                Nenhuma transacao encontrada.
              </div>
            ) : (
              <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} onEdit={handleEditTransaction} />
            )}
          </TabsContent>

          <TabsContent value="fixed">
            <FixedExpensesTable expenses={fixedExpenses.filter((expense) => expense.category !== "financiamento")} onTogglePaid={handleTogglePaid} onDelete={handleDeleteExpense} />
          </TabsContent>

          <TabsContent value="financing">
            <FixedExpensesTable expenses={fixedExpenses.filter((expense) => expense.category === "financiamento")} onTogglePaid={handleTogglePaid} onDelete={handleDeleteExpense} />
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
