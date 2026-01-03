import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, MessageCircle } from "lucide-react";
import logoDark from "@/assets/logo-dark.png";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Log successful checkout for debugging
    if (sessionId) {
      console.log("Checkout successful, session:", sessionId);
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img src={logoDark} alt="iClinic" className="h-16 w-16 object-contain" />
          </div>
          <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 text-primary w-fit">
            <CheckCircle className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl">Pagamento Confirmado!</CardTitle>
          <CardDescription className="text-base">
            Seu período de teste de 7 dias começou.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-center mb-4">Próximos passos:</h3>
            
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm">Verifique seu email</p>
                <p className="text-xs text-muted-foreground">
                  Enviamos um link de ativação para o email informado
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium text-sm">Verifique seu WhatsApp</p>
                <p className="text-xs text-muted-foreground">
                  Também enviamos o link por WhatsApp
                </p>
              </div>
            </div>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              O link de ativação expira em <strong>48 horas</strong>.
            </p>
            <p className="mt-2">
              Não recebeu? Verifique sua caixa de spam ou entre em contato conosco.
            </p>
          </div>

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate("/vendas")}
          >
            Voltar para o site
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutSuccess;
