-- Adicionar colunas para horário de funcionamento do sábado
ALTER TABLE public.barbershops
ADD COLUMN saturday_opening_time time without time zone DEFAULT NULL,
ADD COLUMN saturday_closing_time time without time zone DEFAULT NULL;