-- Criar tabela de dias bloqueados por profissional
CREATE TABLE public.blocked_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(barbershop_id, barber_id, blocked_date)
);

-- Enable RLS
ALTER TABLE public.blocked_days ENABLE ROW LEVEL SECURITY;

-- Owners can manage their blocked days
CREATE POLICY "Owners can manage their blocked days"
ON public.blocked_days FOR ALL
USING (EXISTS (
  SELECT 1 FROM barbershops
  WHERE barbershops.id = blocked_days.barbershop_id
  AND barbershops.owner_id = auth.uid()
));

-- Clients can view blocked days for their barbershop
CREATE POLICY "Clients can view blocked days"
ON public.blocked_days FOR SELECT
USING (
  has_role(auth.uid(), 'client') 
  AND barbershop_id = get_user_barbershop_id(auth.uid())
);