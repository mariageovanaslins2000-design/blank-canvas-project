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

const signInSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
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

export default function ClientLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [barbershopLogo, setBarbershopLogo] = useState<string | null>(null);
  const [barbershopName, setBarbershopName] = useState<string>("");
  const [primaryColor, setPrimaryColor] = useState<string | null>(null);

  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const barbershopId = searchParams.get("idBarbearia");
    if (barbershopId) {
      loadBarbershopInfo(barbershopId);
    }
  }, [searchParams]);

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
      
      if (data && data.length > 0) {
        setBarbershopName(data[0].name);
        setBarbershopLogo(data[0].logo_url);
        if (data[0].primary_color) {
          setPrimaryColor(data[0].primary_color);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar clínica:", error);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      signInSchema.parse(signInData);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) throw error;

      // Check if user has client role
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const roles = rolesData?.map(r => r.role) || [];

      if (roles.includes("client")) {
        toast.success("Login realizado com sucesso!");
        navigate("/client");
      } else {
        await supabase.auth.signOut();
        toast.error("Esta área é exclusiva para clientes");
      }
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
        console.error("Signin error:", error);
        if (error.message?.includes("Invalid login credentials")) {
          toast.error("Email ou senha incorretos");
        } else {
          toast.error(error.message || "Erro ao fazer login");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

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
          <CardTitle className="text-2xl">Login de Paciente</CardTitle>
          <CardDescription>
            {barbershopName ? `Acesse sua conta em ${barbershopName}` : "Acesse sua conta para agendar consultas"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={signInData.email}
                onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
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
                value={signInData.password}
                onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                required
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center mt-4">
              <p className="text-sm text-muted-foreground">
                Não tem conta? Solicite o link de cadastro à sua clínica.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}