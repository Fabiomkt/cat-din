import { useState } from "react";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SummaryCard from "@/components/finance/SummaryCard";
import DateFilter from "@/components/finance/DateFilter";
import TransactionList, { Transaction } from "@/components/finance/TransactionList";
import FixedExpensesTable, { FixedExpense } from "@/components/finance/FixedExpensesTable";
import AddTransactionDialog from "@/components/finance/AddTransactionDialog";

const initialTransactions: Transaction[] = [
  { id: "1", description: "Salário", amount: 5500, type: "income", category: "Salário", date: "05/04/2026" },
  { id: "2", description: "Freelance Design", amount: 1200, type: "income", category: "Freelance", date: "03/04/2026" },
  { id: "3", description: "Aluguel", amount: 1800, type: "expense", category: "Aluguel", date: "01/04/2026" },
  { id: "4", description: "Supermercado", amount: 650, type: "expense", category: "Mercado", date: "02/04/2026" },
  { id: "5", description: "Conta de Luz", amount: 180, type: "expense", category: "Energia", date: "10/04/2026" },
  { id: "6", description: "Internet", amount: 120, type: "expense", category: "Internet", date: "15/04/2026" },
  { id: "7", description: "Uber", amount: 85, type: "expense", category: "Transporte", date: "06/04/2026" },
];

const initialFixedExpenses: FixedExpense[] = [
  { id: "f1", name: "Aluguel", amount: 1800, dueDay: 1, paid: true, icon: "home", category: "casa" },
  { id: "f2", name: "Conta de Luz", amount: 180, dueDay: 10, paid: false, icon: "zap", category: "casa" },
  { id: "f3", name: "Água", amount: 95, dueDay: 15, paid: false, icon: "water", category: "casa" },
  { id: "f4", name: "Internet", amount: 120, dueDay: 20, paid: true, icon: "wifi", category: "casa" },
  { id: "f5", name: "Financiamento Carro", amount: 1450, dueDay: 5, paid: true, icon: "car", category: "financiamento" },
  { id: "f6", name: "Financiamento Imóvel", amount: 2200, dueDay: 10, paid: false, icon: "home", category: "financiamento" },
  { id: "f7", name: "Cartão de Crédito", amount: 890, dueDay: 25, paid: false, icon: "credit", category: "fixa" },
  { id: "f8", name: "Plano Celular", amount: 69.9, dueDay: 12, paid: true, icon: "phone", category: "fixa" },
];

const Index = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>(initialFixedExpenses);
  const [startDate, setStartDate] = useState(new Date(2026, 3, 1));
  const [endDate, setEndDate] = useState(new Date(2026, 3, 30));

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const totalFixed = fixedExpenses.reduce((s, e) => s + e.amount, 0);

  const handleAddTransaction = (tx: { description: string; amount: number; type: "income" | "expense"; category: string }) => {
    const newTx: Transaction = {
      id: Date.now().toString(),
      ...tx,
      date: new Date().toLocaleDateString("pt-BR"),
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleTogglePaid = (id: string) => {
    setFixedExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, paid: !e.paid } : e)));
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
            <AddTransactionDialog onAdd={handleAddTransaction} />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard title="Saldo" value={fmt(balance)} icon={Wallet} trend={balance >= 0 ? "Positivo" : "Negativo"} trendUp={balance >= 0} />
          <SummaryCard title="Entradas" value={fmt(totalIncome)} icon={TrendingUp} trend="+12% vs mês anterior" trendUp />
          <SummaryCard title="Saídas" value={fmt(totalExpense)} icon={TrendingDown} trend="-5% vs mês anterior" trendUp />
          <SummaryCard title="Contas Fixas" value={fmt(totalFixed)} icon={PiggyBank} trend={`${fixedExpenses.filter((e) => e.paid).length}/${fixedExpenses.length} pagas`} trendUp />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList className="rounded-xl bg-muted/50 p-1">
            <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="fixed" className="rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <PiggyBank className="h-4 w-4 mr-2" />
              Contas Fixas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <TransactionList transactions={transactions} />
          </TabsContent>

          <TabsContent value="fixed">
            <FixedExpensesTable expenses={fixedExpenses} onTogglePaid={handleTogglePaid} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
