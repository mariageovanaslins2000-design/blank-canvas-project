import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, Check } from "lucide-react";
import { toast } from "sonner";

export function ClientLinkGenerator() {
  const { user } = useAuth();
  const [empresaId, setEmpresaId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmpresaId();
  }, [user]);

  const loadEmpresaId = async () => {
    if (!user) return;

    try {
      // Buscar empresa através da funcao_usuario
      const { data } = await supabase
        .from("funcao_usuario")
        .select("empresa_id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (data?.empresa_id) {
        setEmpresaId(data.empresa_id);
      }
    } catch (error) {
      console.error("Erro ao carregar ID da empresa:", error);
    } finally {
      setLoading(false);
    }
  };

  const signupLink = empresaId 
    ? `${window.location.origin}/cadastro-cliente?idEmpresa=${empresaId}`
    : "";

  const handleCopyLink = async () => {
    if (!signupLink) return;

    try {
      await navigator.clipboard.writeText(signupLink);
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast.error("Erro ao copiar link");
    }
  };

  const handleOpenLink = () => {
    if (!signupLink) return;
    window.open(signupLink, "_blank");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link de Cadastro de Clientes</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link de Cadastro de Clientes</CardTitle>
        <CardDescription>
          Compartilhe este link com seus clientes para que eles possam se cadastrar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 p-3 bg-muted rounded-md border font-mono text-sm break-all">
            {signupLink || "Carregando..."}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyLink}
              disabled={!signupLink}
              title="Copiar link"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleOpenLink}
              disabled={!signupLink}
              title="Abrir link em nova aba"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            💡 Como funciona:
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>O cliente clica no link e é direcionado para a página de cadastro</li>
            <li>Após criar a conta, ele fica automaticamente vinculado à sua clínica</li>
            <li>O cliente aparece na lista de clientes e pode fazer agendamentos</li>
            <li>Você pode enviar este link por WhatsApp, redes sociais ou email</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}