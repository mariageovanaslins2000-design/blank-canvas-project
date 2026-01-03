-- Adicionar novas colunas de limites na tabela subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS max_portfolio_images integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS has_custom_colors boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS has_day_blocking boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS has_date_filter boolean NOT NULL DEFAULT false;

-- Atualizar plano Básico (67 reais) - mais restrito
UPDATE public.subscription_plans 
SET max_portfolio_images = 0,
    has_custom_colors = false,
    has_day_blocking = false,
    has_date_filter = false
WHERE stripe_price_id = 'price_1RfM9fIEJpEcGWsIB6nYxYws';

-- Atualizar plano Profissional (97 reais) - intermediário
UPDATE public.subscription_plans 
SET max_portfolio_images = 10,
    has_custom_colors = true,
    has_day_blocking = true,
    has_date_filter = false
WHERE stripe_price_id = 'price_1RfMAOIEJpEcGWsIDixuFgwB';

-- Atualizar plano Premium (147 reais) - completo
UPDATE public.subscription_plans 
SET max_portfolio_images = NULL,
    has_custom_colors = true,
    has_day_blocking = true,
    has_date_filter = true
WHERE stripe_price_id = 'price_1RfMB2IEJpEcGWsISBFYrVNP';