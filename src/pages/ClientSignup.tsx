import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PasswordStrengthIndicator } from "@/components/Auth/PasswordStrengthIndicator";

const strongPasswordSchema = z.string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
  .regex(/[0-9]/, "Deve conter pelo menos um número")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Deve conter pelo menos um caractere especial");

const signUpSchema = z.object({
  email: z.string().email("Email inválido"),
  password: strongPasswordSchema,
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  phone: z.string().min(10, "Telefone inválido"),
});

const hexToHSL = (hex: string): string => {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

export default function ClientSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);
  const [barbershopName, setBarbershopName] = useState<string>("");
  const [barbershopLogo, setBarbershopLogo] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);

  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        toast.error("Você já está logado. Por favor, faça logout antes de se cadastrar como cliente.");
        navigate("/auth");
        return;
      }
    };

    checkSession();

    const id = searchParams.get("idBarbearia");
    if (!id) {
      toast.error("Link inválido. Por favor, solicite um novo link à clínica.");
      navigate("/auth");
      return;
    }

    setBarbershopId(id);
    loadBarbershopInfo(id);
  }, [searchParams, navigate]);

  // Apply custom theme when primary color is loaded
  useEffect(() => {
    if (primaryColor) {
      const hsl = hexToHSL(primaryColor);
      document.documentElement.style.setProperty("--primary", hsl);
    }

    return () => {
      // Reset to default on unmount
      document.documentElement.style.removeProperty("--primary");
    };
  }, [primaryColor]);

  const loadBarbershopInfo = async (id: string) => {
    try {
      const { data, error } = await supabase
        .rpc("get_barbershop_public_info", { barbershop_id: id });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast.error("Clínica não encontrada. Verifique se o link está correto.");
        navigate("/auth");
        return;
      }
      
      setBarbershopName(data[0].name);
      setBarbershopLogo(data[0].logo_url);
      if (data[0].primary_color) {
        setPrimaryColor(data[0].primary_color);
      }
    } catch (error) {
      console.error("Erro ao carregar clínica:", error);
      toast.error("Erro ao carregar informações da clínica. Tente novamente.");
      navigate("/auth");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    if (!barbershopId) {
      toast.error("ID da clínica não encontrado");
      setIsLoading(false);
      return;
    }

    try {
      signUpSchema.parse(signUpData);

      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/client`,
          data: {
            full_name: signUpData.fullName,
            phone: signUpData.phone,
            role: "client",
            barbershop_id: barbershopId,
          },
        },
      });

      if (error) throw error;

      toast.success("Conta criada com sucesso!");
      navigate("/client");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error("Signup error:", error);
        if (error.message?.includes("already registered")) {
          toast.error("Este email já está cadastrado");
        } else {
          toast.error(error.message || "Erro ao criar conta");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!barbershopId) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {barbershopLogo ? (
              <img 
                src={barbershopLogo} 
                alt={barbershopName} 
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="p-3 bg-primary rounded-full">
                <Scissors className="h-8 w-8 text-primary-foreground" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">Cadastro de Paciente</CardTitle>
          <CardDescription>
            Você está se cadastrando em: <strong>{barbershopName}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullname">Nome Completo</Label>
              <Input
                id="fullname"
                placeholder="João Silva"
                value={signUpData.fullName}
                onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                required
              />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={signUpData.phone}
                onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })}
                required
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={signUpData.email}
                onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                required
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={signUpData.password}
                onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                required
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              <PasswordStrengthIndicator password={signUpData.password} />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Cadastrando..." : "Criar Conta"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto"
                onClick={() => navigate(`/login-cliente?idBarbearia=${barbershopId}`)}
              >
                Fazer login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}