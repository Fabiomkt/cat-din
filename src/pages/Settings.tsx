import { useState, useEffect } from "react";
import { ArrowLeft, Bell, Palette, User, Shield, Database, LogOut, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
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

  useEffect(() => {
    if (!user) return;
    const fetchTelegram = async () => {
      const { data } = await supabase
        .from("perfis_telegram")
        .select("chat_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setTelegramId(String(data.chat_id));
        setTelegramLinked(true);
      }
    };
    fetchTelegram();
  }, [user]);

  const handleLinkTelegram = async () => {
    if (!user || !telegramId.trim()) {
      toast.error("Digite um ID válido do Telegram");
      return;
    }
    setLinkingTelegram(true);
    try {
      if (telegramLinked) {
        const { error } = await supabase
          .from("perfis_telegram")
          .update({ chat_id: Number(telegramId) })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("perfis_telegram")
          .insert({ chat_id: Number(telegramId), user_id: user.id });
        if (error) throw error;
      }
      setTelegramLinked(true);
      toast.success("Telegram vinculado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao vincular Telegram: " + err.message);
    } finally {
      setLinkingTelegram(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
    toast.success("Você saiu da conta");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground text-sm mt-1">Personalize o sistema do seu jeito</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Perfil</CardTitle>
                  <CardDescription>Suas informações</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">E-mail</Label>
                <span className="text-sm font-medium text-foreground">{user?.email}</span>
              </div>
            </CardContent>
          </Card>

          {/* Appearance - Theme Presets + Color Picker */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Aparência</CardTitle>
                  <CardDescription>Personalize cores e tema</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dark mode toggle */}
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

              {/* Preset themes */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Temas pré-definidos</Label>
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

              {/* Custom color picker */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Cores personalizadas</Label>
                <div className="flex gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Cor primária</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={preferences.primary_color}
                        onChange={(e) => updatePreferences({ primary_color: e.target.value })}
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
                        onChange={(e) => updatePreferences({ accent_color: e.target.value })}
                        className="h-10 w-14 p-1 rounded-lg cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground font-mono">{preferences.accent_color}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Notificações</CardTitle>
                  <CardDescription>Configure alertas e lembretes</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Lembrete de contas a vencer", defaultChecked: true },
                { label: "Alertas de gastos acima do limite", defaultChecked: true },
              ].map((toggle, i) => (
                <div key={i}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{toggle.label}</Label>
                    <Switch defaultChecked={toggle.defaultChecked} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>


          {/* Telegram Integration */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Integração com Telegram</CardTitle>
                  <CardDescription>Vincule seu Telegram para registrar gastos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">ID do Telegram</Label>
                <div className="flex gap-3">
                  <Input
                    type="text"
                    placeholder="Ex: 123456789"
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value)}
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
                  <p className="text-xs text-green-500">✓ Telegram vinculado</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="rounded-2xl border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Segurança</CardTitle>
                  <CardDescription>Proteja sua conta</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" size="sm" className="rounded-xl" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair da Conta
              </Button>
            </CardContent>
          </Card>

          {/* Data */}
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
              <Button variant="outline" size="sm" className="rounded-xl">Exportar dados (CSV)</Button>
              <Separator />
              <Button variant="destructive" size="sm" className="rounded-xl">Limpar todos os dados</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
