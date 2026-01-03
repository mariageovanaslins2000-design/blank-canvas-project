-- Drop tabelas se existirem (para recomeçar)
DROP TABLE IF EXISTS public.activation_tokens CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;

-- Tabela de planos de assinatura (max_professionals pode ser NULL = ilimitado)
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  max_professionals INTEGER,
  max_clients INTEGER,
  has_whatsapp_integration BOOLEAN NOT NULL DEFAULT false,
  has_advanced_reports BOOLEAN NOT NULL DEFAULT false,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de assinaturas
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing',
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired'))
);

-- Tabela de tokens de ativação
CREATE TABLE public.activation_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  email TEXT NOT NULL,
  phone TEXT,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  stripe_customer_id TEXT,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '48 hours'),
  email_sent_at TIMESTAMP WITH TIME ZONE,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_subscriptions_barbershop ON public.subscriptions(barbershop_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_activation_tokens_token ON public.activation_tokens(token);
CREATE INDEX idx_activation_tokens_email ON public.activation_tokens(email);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas para subscription_plans (público pode ver planos ativos)
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

-- Políticas para subscriptions
CREATE POLICY "Owners can view their subscription"
ON public.subscriptions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.barbershops
  WHERE barbershops.id = subscriptions.barbershop_id
  AND barbershops.owner_id = auth.uid()
));

CREATE POLICY "System can manage subscriptions"
ON public.subscriptions
FOR ALL
USING (true)
WITH CHECK (true);

-- Políticas para activation_tokens (apenas sistema pode gerenciar)
CREATE POLICY "System can manage activation tokens"
ON public.activation_tokens
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Inserir planos iniciais (NULL = ilimitado)
INSERT INTO public.subscription_plans (name, description, price_monthly, max_professionals, max_clients, has_whatsapp_integration, has_advanced_reports, features, display_order) VALUES
('Básico', 'Ideal para profissionais autônomos', 67.00, 1, 50, false, false, '["Agendamento online", "Gestão de clientes", "Controle financeiro básico", "1 profissional", "Até 50 clientes"]'::jsonb, 1),
('Profissional', 'Para clínicas em crescimento', 97.00, 3, NULL, true, false, '["Tudo do Básico", "Até 3 profissionais", "Clientes ilimitados", "Integração WhatsApp", "Relatórios básicos", "Portfólio online"]'::jsonb, 2),
('Premium', 'Solução completa para grandes clínicas', 147.00, NULL, NULL, true, true, '["Tudo do Profissional", "Profissionais ilimitados", "WhatsApp avançado", "Relatórios completos", "Suporte prioritário", "Personalização avançada"]'::jsonb, 3);