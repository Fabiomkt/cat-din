import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Palette, User, Shield, Database, LogOut, MessageCircle, Download, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import ConfirmActionButton from "@/components/ConfirmActionButton";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { buildCsv, downloadTextFile } from "@/lib/finance";
import { toast } from "sonner";

const presetThemes = [
  { name: "Azul", primary: "#3B82F6", accent: "#8B5CF6" },
  { name: "Verde", primary: "#10B981", accent: "#06B6D4" },
  { name: "Rosa", primary: "#EC4899", accent: "#F43F5E" },
  { name: "Laranja", primary: "#F97316", accent: "#EAB308" },
  { name: "Roxo", primary: "#7C3AED", accent: "#A855F7" },
];

const Settings = () => {
  const { user, signOut } = useAuth();
  const { preferences, updatePreferences } = useTheme();
  const navigate = useNavigate();
  const [telegramId, setTelegramId] = useState("");
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [billReminders, setBillReminders] = useState(true);
  const [spendingAlerts, setSpendingAlerts] = useState(true);

  useEffect(() => {
    if (!user) return;

    const storedBillReminders = localStorage.getItem(`catdin:${user.id}:billReminders`);
    const storedSpendingAlerts = localStorage.getItem(`catdin:${user.id}:spendingAlerts`);
    if (storedBillReminders !== null) setBillReminders(storedBillReminders === "true");
    if (storedSpendingAlerts !== null) setSpendingAlerts(storedSpendingAlerts === "true");

    const fetchTelegram = async () => {
      const { data, error } = await supabase
        .from("perfis_telegram")
        .select("chat_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        toast.error("Erro ao carregar Telegram");
        return;
      }

      if (data) {
        setTelegramId(String(data.chat_id));
        setTelegramLinked(true);
      }
    };

    fetchTelegram();
  }, [user]);

  const handleNotificationChange = (key: "billReminders" | "spendingAlerts", value: boolean) => {
    if (!user) return;
    localStorage.setItem(`catdin:${user.id}:${key}`, String(value));
    if (key === "billReminders") setBillReminders(value);
    if (key === "spendingAlerts") setSpendingAlerts(value);
  };

  const handleLinkTelegram = async () => {
    if (!user) return;
    const parsedId = Number(telegramId.trim());
    if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
      toast.error("Digite um ID valido do Telegram");
      return;
    }

    setLinkingTelegram(true);
    try {
      const payload = { chat_id: parsedId, user_id: user.id };
      const { error } = telegramLinked
        ? await supabase.from("perfis_telegram").update({ chat_id: parsedId }).eq("user_id", user.id)
        : await supabase.from("perfis_telegram").insert(payload);

      if (error) throw error;
      setTelegramLinked(true);
      toast.success("Telegram vinculado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Erro ao vincular Telegram: ${message}`);
    } finally {
      setLinkingTelegram(false);
    }
  };

  const handleExport = async () => {
    if (!user) return;
    const [transactionsResult, fixedResult, telegramResult] = await Promise.all([
      supabase.from("transactions").select("date, description, amount, type, category, source").eq("user_id", user.id).order("date", { ascending: false }),
      supabase.from("fixed_expenses").select("name, amount, due_day, paid, category").eq("user_id", user.id).order("due_day", { ascending: true }),
      supabase.from("gastos_telegram").select("data_vencimento, descricao, valor, categoria, origem").eq("user_id", user.id).order("data_vencimento", { ascending: false }),
    ]);

    const error = transactionsResult.error || fixedResult.error || telegramResult.error;
    if (error) {
      toast.error("Erro ao exportar dados");
      return;
    }

    const rows = [
      ...(transactionsResult.data || []).map((row) => ({
        origem: row.source || "manual",
        data: row.date,
        descricao: row.description,
        categoria: row.category,
        tipo: row.type,
        valor: Number(row.amount),
      })),
      ...(fixedResult.data || []).map((row) => ({
        origem: "conta_fixa",
        data: `dia ${row.due_day}`,
        descricao: row.name,
        categoria: row.category,
        tipo: row.paid ? "paga" : "pendente",
        valor: Number(row.amount),
      })),
      ...(telegramResult.data || []).map((row) => ({
        origem: row.origem || "telegram",
        data: row.data_vencimento || "",
        descricao: row.descricao || "",
        categoria: row.categoria || "Outros",
        tipo: "expense",
        valor: Number(row.valor || 0),
      })),
    ];

    if (rows.length === 0) {
      toast.warning("Nenhum dado para exportar");
      return;
    }

    downloadTextFile(`catdin-export-${new Date().toISOString().split("T")[0]}.csv`, buildCsv(rows));
    toast.success("Dados exportados");
  };

  const handleClearData = async () => {
    if (!user) return;
    const [transactionsResult, fixedResult, telegramResult, importsResult] = await Promise.all([
      supabase.from("transactions").delete().eq("user_id", user.id),
      supabase.from("fixed_expenses").delete().eq("user_id", user.id),
      supabase.from("gastos_telegram").delete().eq("user_id", user.id),
      supabase.from("statement_imports").delete().eq("user_id", user.id),
    ]);

    const error = transactionsResult.error || fixedResult.error || telegramResult.error || importsResult.error;
    if (error) {
      toast.error("Erro ao limpar dados");
      return;
    }

    toast.success("Dados financeiros removidos");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
    toast.success("Voce saiu da conta");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuracoes</h1>
            <p className="text-muted-foreground text-sm mt-1">Personalize o sistema do seu jeito</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Perfil</CardTitle>
                  <CardDescription>Suas informacoes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-4">
                <Label className="text-sm text-muted-foreground">E-mail</Label>
                <span className="truncate text-sm font-medium text-foreground">{user?.email}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Aparencia</CardTitle>
                  <CardDescription>Personalize cores e tema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Modo escuro</Label>
                <Switch
                  checked={preferences.theme_mode === "dark"}
                  onCheckedChange={(checked) =>
                    updatePreferences({ theme_mode: checked ? "dark" : "light" })
                  }
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Temas pre-definidos</Label>
                <div className="flex flex-wrap gap-3">
                  {presetThemes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() =>
                        updatePreferences({ primary_color: theme.primary, accent_color: theme.accent })
                      }
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                        preferences.primary_color === theme.primary
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex gap-1">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: theme.accent }} />
                      </div>
                      <span className="text-sm">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label className="text-sm font-medium">Cores personalizadas</Label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Cor primaria</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={preferences.primary_color}
                        onChange={(event) => updatePreferences({ primary_color: event.target.value })}
                        className="h-10 w-14 p-1 rounded-lg cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground font-mono">{preferences.primary_color}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Cor de destaque</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={preferences.accent_color}
                        onChange={(event) => updatePreferences({ accent_color: event.target.value })}
                        className="h-10 w-14 p-1 rounded-lg cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground font-mono">{preferences.accent_color}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Notificacoes</CardTitle>
                  <CardDescription>Configure alertas e lembretes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Lembrete de contas a vencer</Label>
                <Switch checked={billReminders} onCheckedChange={(checked) => handleNotificationChange("billReminders", checked)} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label className="text-sm">Alertas de gastos acima do limite</Label>
                <Switch checked={spendingAlerts} onCheckedChange={(checked) => handleNotificationChange("spendingAlerts", checked)} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Integracao com Telegram</CardTitle>
                  <CardDescription>Vincule seu Telegram para registrar gastos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">ID do Telegram</Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ex: 123456789"
                    value={telegramId}
                    onChange={(event) => setTelegramId(event.target.value.replace(/\D/g, ""))}
                    className="rounded-xl"
                  />
                  <Button
                    onClick={handleLinkTelegram}
                    disabled={linkingTelegram}
                    className="rounded-xl"
                  >
                    {linkingTelegram ? "Vinculando..." : telegramLinked ? "Atualizar" : "Vincular"}
                  </Button>
                </div>
                {telegramLinked && (
                  <p className="text-xs text-green-500">Telegram vinculado</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Seguranca</CardTitle>
                  <CardDescription>Proteja sua conta</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" size="sm" className="rounded-xl" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair da conta
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Dados</CardTitle>
                  <CardDescription>Exportar e gerenciar dados</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar dados CSV
              </Button>
              <Separator />
              <ConfirmActionButton
                variant="destructive"
                size="sm"
                className="rounded-xl"
                title="Limpar dados financeiros"
                description="Todas as transacoes, contas fixas, gastos do Telegram e importacoes serao removidos."
                confirmLabel="Limpar dados"
                onConfirm={handleClearData}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar todos os dados
              </ConfirmActionButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
