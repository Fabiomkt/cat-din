import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, Mail, Lock, Eye, EyeOff, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { validateText } from "@/lib/finance";
import { toast } from "sonner";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const validateEmailPassword = () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!emailRegex.test(trimmedEmail)) return "Digite um e-mail valido";
    if (password.length < 6) return "A senha deve ter pelo menos 6 caracteres";
    return null;
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    const errorMessage = validateEmailPassword();
    if (errorMessage) return toast.error(errorMessage);

    setLoading(true);
    const { error } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (error) {
      toast.error("Erro ao entrar: " + error.message);
      return;
    }
    navigate("/");
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    const phoneDigits = phone.replace(/\D/g, "");
    const errorMessage =
      validateText(fullName, "Nome completo") ||
      (!phoneDigits || phoneDigits.length < 10 ? "Digite um telefone valido" : null) ||
      validateEmailPassword();

    if (errorMessage) return toast.error(errorMessage);

    setLoading(true);
    const { error } = await signUp(email.trim().toLowerCase(), password, fullName.trim(), phoneDigits);
    setLoading(false);
    if (error) {
      toast.error("Erro ao cadastrar: " + error.message);
      return;
    }
    toast.success("Cadastro realizado. Verifique seu e-mail para confirmar.");
  };

  const PasswordToggle = () => (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
    >
      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl border-border/50 shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary flex items-center justify-center">
            <Wallet className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">CatDin</CardTitle>
          <CardDescription>Organize suas financas de forma simples</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="w-full rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="login" className="w-full rounded-lg">Entrar</TabsTrigger>
              <TabsTrigger value="register" className="w-full rounded-lg">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="login-email" type="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="login-password" type={showPassword ? "text" : "password"} placeholder="******" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10 pr-10 rounded-xl" />
                    <PasswordToggle />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-name" type="text" placeholder="Seu nome completo" value={fullName} onChange={(event) => setFullName(event.target.value)} className="pl-10 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-phone" type="tel" placeholder="(00) 00000-0000" value={phone} onChange={(event) => setPhone(event.target.value)} className="pl-10 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-email" type="email" placeholder="seu@email.com" value={email} onChange={(event) => setEmail(event.target.value)} className="pl-10 rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="reg-password" type={showPassword ? "text" : "password"} placeholder="******" value={password} onChange={(event) => setPassword(event.target.value)} className="pl-10 pr-10 rounded-xl" />
                    <PasswordToggle />
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                  {loading ? "Cadastrando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
