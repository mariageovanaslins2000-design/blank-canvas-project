-- Adicionar colunas faltantes na tabela empresas
ALTER TABLE public.empresas 
ADD COLUMN IF NOT EXISTS horario_abertura_sabado TIME,
ADD COLUMN IF NOT EXISTS horario_fechamento_sabado TIME;

-- Adicionar coluna de comissão na tabela profissionais
ALTER TABLE public.profissionais 
ADD COLUMN IF NOT EXISTS percentual_comissao NUMERIC DEFAULT 50;

-- Adicionar colunas de estatísticas na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS total_visitas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultimo_agendamento TIMESTAMP WITH TIME ZONE;

-- Criar bucket para logos das empresas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Criar bucket para fotos dos profissionais
INSERT INTO storage.buckets (id, name, public) 
VALUES ('professional-photos', 'professional-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket de logos
CREATE POLICY "Logos são públicos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'logos');

CREATE POLICY "Admins podem fazer upload de logos" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'logos' 
  AND EXISTS (
    SELECT 1 FROM public.funcao_usuario 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins podem atualizar logos" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'logos' 
  AND EXISTS (
    SELECT 1 FROM public.funcao_usuario 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins podem deletar logos" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'logos' 
  AND EXISTS (
    SELECT 1 FROM public.funcao_usuario 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Políticas para o bucket de fotos de profissionais
CREATE POLICY "Fotos de profissionais são públicas" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'professional-photos');

CREATE POLICY "Admins podem fazer upload de fotos de profissionais" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'professional-photos' 
  AND EXISTS (
    SELECT 1 FROM public.funcao_usuario 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins podem atualizar fotos de profissionais" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'professional-photos' 
  AND EXISTS (
    SELECT 1 FROM public.funcao_usuario 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins podem deletar fotos de profissionais" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'professional-photos' 
  AND EXISTS (
    SELECT 1 FROM public.funcao_usuario 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);