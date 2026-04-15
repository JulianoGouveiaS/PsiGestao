import {useState} from "react";
import {Link} from "react-router-dom";
import {supabase} from "@/integrations/supabase/client";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {toast} from "sonner";
import {Brain, Building2, CheckCircle2, Eye, EyeOff, Stethoscope} from "lucide-react";
import {motion} from "framer-motion";
import {cn} from "@/lib/utils";

type UserRole = "psychologist" | "clinic_admin";

export default function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [role, setRole] = useState<UserRole>("psychologist");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      toast.error("Erro ao criar conta", { description: error.message });
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="w-full max-w-md border-border/60 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <CardTitle className="text-xl">Verifique seu email</CardTitle>
              <CardDescription>
                Enviamos um link de confirmação para <strong>{email}</strong>. Clique no link para ativar sua conta.
              </CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Link to="/login" className="text-sm font-medium text-primary hover:underline">
                Voltar para o login
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-accent via-accent/90 to-primary">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--accent)/0.3),transparent_70%)]" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-accent-foreground">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Brain className="h-7 w-7" />
              </div>
              <span className="text-2xl font-bold">PsiGestão</span>
            </div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Comece agora<br />sua jornada digital
            </h2>
            <p className="text-lg text-accent-foreground/80 max-w-md">
              Simplifique sua rotina clínica com ferramentas pensadas especialmente para profissionais de psicologia.
            </p>
          </motion.div>
        </div>
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute top-20 -right-10 h-40 w-40 rounded-full bg-white/5" />
      </div>

      {/* Right side - Form */}
      <div className="flex flex-1 items-center justify-center bg-background px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="flex flex-col items-center gap-2 text-center lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Brain className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">PsiGestão</h1>
            <p className="text-sm text-muted-foreground">Crie sua conta para começar</p>
          </div>

          <Card className="border-border/60 shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Criar conta</CardTitle>
              <CardDescription>Preencha os dados abaixo para se cadastrar</CardDescription>
            </CardHeader>
            <form onSubmit={handleSignup}>
              <CardContent className="space-y-4">
                {/* Role selection */}
                <div className="space-y-2">
                  <Label>Tipo de conta</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "psychologist" as UserRole, label: "Psicóloga(o)", Icon: Stethoscope, desc: "Atendo pacientes" },
                      { value: "clinic_admin" as UserRole, label: "Secretária de Clínica", Icon: Building2, desc: "Gerencio uma clínica" },
                    ].map(({ value, label, Icon, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRole(value)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center text-sm transition-colors",
                          role === value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:border-muted-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-medium">{label}</span>
                        <span className="text-xs opacity-70">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder={role === "clinic_admin" ? "Nome da secretária" : "Dr(a). Maria Silva"}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando conta..." : "Criar conta"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Já tem uma conta?{" "}
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    Entrar
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
