-- Adicionar colunas para rastrear notificações enviadas
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS confirmation_24h_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notification_3h_sent_at TIMESTAMPTZ;