import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { PasswordStrengthIndicator } from "@/components/Auth/PasswordStrengthIndicator";
import logoDark from "@/assets/logo-dark.png";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

const activationSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().min(10, "Telefone inválido"),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  clinicName: z.string().min(2, "Nome da clínica é obrigatório"),
});

interface TokenInfo {
  id: string;
  email: string;
  phone: string | null;
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  expires_at: string;
  used_at: string | null;
  plan?: {
    name: string;
    description: string;
  };
}

const Activate = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    password: "",
    clinicName: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("Token não fornecido");
        setLoading(false);
        return;
      }

      try {
        const { data, error: invokeError } = await supabase.functions.invoke("validate-activation-token", {
          body: { token }
        });

        if (invokeError) throw invokeError;
        
        if (data.error) {
          setError(data.error);
        } else if (data.tokenInfo) {
          setTokenInfo(data.tokenInfo);
          setFormData(prev => ({
            ...prev,
            phone: data.tokenInfo.phone || ""
          }));
        }
      } catch (err: any) {
        console.error("Token validation error:", err);
        setError("Erro ao validar token. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    
    const validation = activationSchema.safeParse(formData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        if (err.path[0]) {
          errors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    
    try {
      const { data, error: activateError } = await supabase.functions.invoke("activate-account", {
        body: {
          token,
          fullName: formData.fullName,
          phone: formData.phone,
          password: formData.password,
          clinicName: formData.clinicName,
        }
      });

      if (activateError) throw activateError;
      
      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success("Conta criada com sucesso!");
      
      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: tokenInfo!.email,
        password: formData.password,
      });

      if (signInError) {
        toast.error("Conta criada, mas erro ao fazer login. Por favor faça login manualmente.");
        navigate("/auth");
      } else {
        navigate("/admin");
      }
    } catch (err: any) {
      console.error("Activation error:", err);
      toast.error("Erro ao ativar conta: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Validando token...</p>
        </div>
      </div>
    );
  }

  // Verifica se é token já usado (conta já ativada)
  const isTokenUsed = error?.toLowerCase().includes("já foi utilizado") || error?.toLowerCase().includes("already used");
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className={`mx-auto mb-4 p-3 rounded-full w-fit ${isTokenUsed ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
              {isTokenUsed ? <CheckCircle className="h-8 w-8" /> : <AlertCircle className="h-8 w-8" />}
            </div>
            <CardTitle className="text-xl">
              {isTokenUsed ? "Conta Já Ativada" : "Link Inválido"}
            </CardTitle>
            <CardDescription>
              {isTokenUsed 
                ? "Sua conta já está ativa! Você pode fazer login para acessar o sistema."
                : error
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isTokenUsed ? (
              <Button className="w-full" onClick={() => navigate("/auth")}>
                Fazer Login
              </Button>
            ) : (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Se você acredita que isso é um erro, entre em contato conosco ou 
                  solicite um novo link de ativação.
                </p>
                <Button className="w-full" onClick={() => navigate("/vendas")}>
                  Ver Planos
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoDark} alt="iClinic" className="h-16 w-16 object-contain" />
          </div>
          <div className="mx-auto mb-2 p-2 rounded-full bg-primary/10 text-primary w-fit">
            <CheckCircle className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Ative sua Conta</CardTitle>
          <CardDescription>
            Plano: <strong>{tokenInfo?.plan?.name || "Carregando..."}</strong>
            <br />
            Email: <strong>{tokenInfo?.email}</strong>
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                placeholder="Seu nome completo"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              />
              {formErrors.fullName && (
                <p className="text-sm text-destructive">{formErrors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              />
              {formErrors.phone && (
                <p className="text-sm text-destructive">{formErrors.phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicName">Nome da Clínica</Label>
              <Input
                id="clinicName"
                placeholder="Minha Clínica de Estética"
                value={formData.clinicName}
                onChange={(e) => setFormData(prev => ({ ...prev, clinicName: e.target.value }))}
              />
              {formErrors.clinicName && (
                <p className="text-sm text-destructive">{formErrors.clinicName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Crie uma senha forte"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
              <PasswordStrengthIndicator password={formData.password} />
              {formErrors.password && (
                <p className="text-sm text-destructive">{formErrors.password}</p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Ativar Minha Conta"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Activate;
