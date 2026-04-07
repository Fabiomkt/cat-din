import { ArrowLeft, Bell, Palette, User, Shield, Database } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const settingsSections = [
  {
    title: "Perfil",
    description: "Gerencie suas informações pessoais",
    icon: User,
    settings: [
      { label: "Nome", value: "Usuário", type: "text" as const },
      { label: "E-mail", value: "usuario@email.com", type: "text" as const },
    ],
  },
  {
    title: "Notificações",
    description: "Configure alertas e lembretes",
    icon: Bell,
    toggles: [
      { label: "Lembrete de contas a vencer", defaultChecked: true },
      { label: "Resumo semanal por e-mail", defaultChecked: false },
      { label: "Alertas de gastos acima do limite", defaultChecked: true },
    ],
  },
  {
    title: "Aparência",
    description: "Personalize a interface",
    icon: Palette,
    toggles: [
      { label: "Modo escuro", defaultChecked: false },
      { label: "Animações", defaultChecked: true },
    ],
  },
  {
    title: "Segurança",
    description: "Proteja sua conta",
    icon: Shield,
    toggles: [
      { label: "Autenticação em duas etapas", defaultChecked: false },
      { label: "Bloqueio por inatividade", defaultChecked: true },
    ],
  },
  {
    title: "Dados",
    description: "Exportar e gerenciar dados",
    icon: Database,
    actions: [
      { label: "Exportar dados (CSV)", action: "export" },
      { label: "Limpar todos os dados", action: "clear", destructive: true },
    ],
  },
];

const Settings = () => {
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

        {/* Settings Sections */}
        <div className="space-y-6">
          {settingsSections.map((section) => (
            <Card key={section.title} className="rounded-2xl border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.settings?.map((setting, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">{setting.label}</Label>
                    <span className="text-sm font-medium text-foreground">{setting.value}</span>
                  </div>
                ))}
                {section.toggles?.map((toggle, i) => (
                  <div key={i}>
                    {i > 0 && <Separator className="mb-4" />}
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">{toggle.label}</Label>
                      <Switch defaultChecked={toggle.defaultChecked} />
                    </div>
                  </div>
                ))}
                {section.actions?.map((action, i) => (
                  <div key={i}>
                    {i > 0 && <Separator className="mb-4" />}
                    <Button
                      variant={action.destructive ? "destructive" : "outline"}
                      size="sm"
                      className="rounded-xl"
                    >
                      {action.label}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
