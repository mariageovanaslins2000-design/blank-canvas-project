-- Criar bucket para logos das clínicas
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);

-- Criar bucket para imagens do portfólio
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true);

-- Criar bucket para fotos dos profissionais
INSERT INTO storage.buckets (id, name, public)
VALUES ('professional-photos', 'professional-photos', true);

-- Políticas para bucket 'logos'
CREATE POLICY "Logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Owners can update their logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY "Owners can delete their logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Políticas para bucket 'portfolio'
CREATE POLICY "Portfolio images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'portfolio');

CREATE POLICY "Authenticated users can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'portfolio' AND auth.role() = 'authenticated');

CREATE POLICY "Owners can update portfolio images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'portfolio' AND auth.role() = 'authenticated');

CREATE POLICY "Owners can delete portfolio images"
ON storage.objects FOR DELETE
USING (bucket_id = 'portfolio' AND auth.role() = 'authenticated');

-- Políticas para bucket 'professional-photos'
CREATE POLICY "Professional photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'professional-photos');

CREATE POLICY "Authenticated users can upload professional photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'professional-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Owners can update professional photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'professional-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Owners can delete professional photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'professional-photos' AND auth.role() = 'authenticated');