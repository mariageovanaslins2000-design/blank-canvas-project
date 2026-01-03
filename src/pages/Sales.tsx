import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Sparkles, Calendar, Users, MessageCircle, BarChart3, Shield, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoDark from "@/assets/logo-dark.png";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  stripe_price_id: string | null;
  max_professionals: number | null;
  max_clients: number | null;
  has_whatsapp_integration: boolean;
  has_advanced_reports: boolean;
  features: unknown;
  display_order: number;
}

const Sales = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) {
        console.error("Error fetching plans:", error);
        toast.error("Erro ao carregar planos");
      } else {
        setPlans(data || []);
      }
      setLoading(false);
    };

    fetchPlans();
  }, []);

  const handleCheckout = async (plan: Plan) => {
    setCheckoutLoading(plan.id);
    
    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: { 
          priceId: plan.stripe_price_id,
          planId: plan.id
        }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error("Erro ao iniciar checkout: " + error.message);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const getPlanIcon = (index: number) => {
    if (index === 0) return <Star className="h-6 w-6" />;
    if (index === 1) return <Sparkles className="h-6 w-6" />;
    return <Shield className="h-6 w-6" />;
  };

  const getPlanBadge = (index: number) => {
    if (index === 1) return <Badge className="bg-primary text-primary-foreground">Mais Popular</Badge>;
    if (index === 2) return <Badge variant="secondary">Completo</Badge>;
    return null;
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 w-full">
        <div className="w-full max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={logoDark} alt="iClinic" className="h-8 w-8 sm:h-10 sm:w-10 object-contain" />
            <span className="font-display text-lg sm:text-xl font-semibold">iClinic</span>
          </div>
          <Button variant="outline" size="sm" className="text-sm" onClick={() => navigate("/auth")}>
            Já sou cliente
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-10 sm:py-16 lg:py-24 bg-gradient-to-b from-primary/5 to-background w-full">
        <div className="w-full max-w-7xl mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4">
            <Clock className="h-3 w-3 mr-1" />
            7 dias grátis para testar
          </Badge>
          <h1 className="text-2xl sm:text-4xl lg:text-6xl font-display font-bold mb-4 sm:mb-6 text-foreground">
            Gerencie sua clínica com<br />
            <span className="text-primary">simplicidade e elegância</span>
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
            Sistema completo para clínicas estéticas: agendamentos, clientes, financeiro e integração com WhatsApp. 
            Tudo em um só lugar.
          </p>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-3 sm:gap-4 text-muted-foreground text-sm sm:text-base">
            <div className="flex items-center justify-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <span>Agendamento Online</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <span>Gestão de Clientes</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <span>WhatsApp Integrado</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <span>Relatórios</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-10 sm:py-16 lg:py-24 w-full">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-4">
              Escolha o plano ideal para você
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Comece com 7 dias grátis. Cancele quando quiser.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
              {plans.map((plan, index) => (
                <Card 
                  key={plan.id} 
                  className={`relative flex flex-col w-full ${
                    index === 1 
                      ? "border-primary shadow-lg md:scale-105" 
                      : "border-border"
                  }`}
                >
                  {getPlanBadge(index) && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      {getPlanBadge(index)}
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10 text-primary w-fit">
                      {getPlanIcon(index)}
                    </div>
                    <CardTitle className="text-xl sm:text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">{plan.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="flex-1">
                    <div className="text-center mb-6">
                      <span className="text-3xl sm:text-4xl font-bold">
                        R$ {plan.price_monthly.toFixed(0)}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    
                    <ul className="space-y-3">
                      {(plan.features as string[]).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
                          <span className="text-xs sm:text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className="w-full text-sm sm:text-base" 
                      size="lg"
                      variant={index === 1 ? "default" : "outline"}
                      onClick={() => handleCheckout(plan)}
                      disabled={checkoutLoading === plan.id}
                    >
                      {checkoutLoading === plan.id 
                        ? "Carregando..." 
                        : "Começar 7 dias grátis"
                      }
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-10 sm:py-16 lg:py-24 bg-muted/30 w-full">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-4">
              Por que escolher o iClinic?
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            <div className="text-center">
              <div className="mx-auto mb-3 sm:mb-4 p-3 sm:p-4 rounded-full bg-primary/10 text-primary w-fit">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h3 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Agendamento Inteligente</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Seus clientes agendam online 24/7. Você só confirma.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-3 sm:mb-4 p-3 sm:p-4 rounded-full bg-primary/10 text-primary w-fit">
                <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h3 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">WhatsApp Automático</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Lembretes e confirmações enviados automaticamente.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-3 sm:mb-4 p-3 sm:p-4 rounded-full bg-primary/10 text-primary w-fit">
                <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h3 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Controle Financeiro</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Comissões, faturamento e relatórios em tempo real.
              </p>
            </div>
            
            <div className="text-center">
              <div className="mx-auto mb-3 sm:mb-4 p-3 sm:p-4 rounded-full bg-primary/10 text-primary w-fit">
                <Users className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h3 className="font-semibold mb-1 sm:mb-2 text-sm sm:text-base">Gestão de Clientes</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Histórico completo e fidelização automática.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-10 sm:py-16 lg:py-24 w-full">
        <div className="w-full max-w-3xl mx-auto px-4">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-4">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="bg-card rounded-lg p-4 sm:p-6 border">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Como funciona o período de teste?</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Você tem 7 dias grátis para testar todas as funcionalidades. 
                Não cobramos nada até o fim do período. Cancele quando quiser.
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-4 sm:p-6 border">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Posso mudar de plano depois?</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Sim! Você pode fazer upgrade ou downgrade a qualquer momento. 
                O valor é ajustado proporcionalmente.
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-4 sm:p-6 border">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Como funciona a integração com WhatsApp?</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Nosso sistema envia lembretes automáticos para seus clientes 
                via WhatsApp. Disponível nos planos Profissional e Premium.
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-4 sm:p-6 border">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Preciso instalar algo?</h3>
              <p className="text-muted-foreground text-xs sm:text-sm">
                Não! O iClinic funciona 100% no navegador. Você também pode 
                instalar como app no celular para acesso rápido.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-10 sm:py-16 lg:py-24 bg-primary text-primary-foreground w-full">
        <div className="w-full max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold mb-4">
            Pronto para transformar sua clínica?
          </h2>
          <p className="text-base sm:text-xl opacity-90 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Comece agora com 7 dias grátis. Sem compromisso.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            className="text-sm sm:text-base"
            onClick={() => {
              document.querySelector("#pricing")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Ver Planos e Começar
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 border-t w-full">
        <div className="w-full max-w-7xl mx-auto px-4 text-center text-xs sm:text-sm text-muted-foreground">
          <p>© 2024 iClinic. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Sales;
