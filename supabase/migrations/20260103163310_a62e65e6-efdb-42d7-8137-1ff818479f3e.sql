
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'professional', 'client');

-- Create enum for appointment status
CREATE TYPE public.appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'refunded', 'cancelled');

-- =====================
-- EMPRESAS (Companies/Clinics)
-- =====================
CREATE TABLE public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    cor_primaria TEXT DEFAULT '#10b981',
    cor_secundaria TEXT DEFAULT '#059669',
    telefone TEXT,
    email TEXT,
    endereco TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    horario_abertura TIME DEFAULT '08:00',
    horario_fechamento TIME DEFAULT '18:00',
    dias_funcionamento INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6],
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- PERFIS (Profiles)
-- =====================
CREATE TABLE public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT,
    email TEXT,
    telefone TEXT,
    avatar_url TEXT,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- FUNCAO_USUARIO (User Roles)
-- =====================
CREATE TABLE public.funcao_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'client',
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role, empresa_id)
);

-- =====================
-- PROFISSIONAIS (Professionals)
-- =====================
CREATE TABLE public.profissionais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    especialidade TEXT,
    avatar_url TEXT,
    cor TEXT DEFAULT '#10b981',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- CLIENTES (Clients)
-- =====================
CREATE TABLE public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    data_nascimento DATE,
    avatar_url TEXT,
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- CLIENTE_EMPRESA (Client-Company Junction)
-- =====================
CREATE TABLE public.cliente_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (cliente_id, empresa_id)
);

-- =====================
-- SERVICOS (Services)
-- =====================
CREATE TABLE public.servicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    preco DECIMAL(10,2) NOT NULL DEFAULT 0,
    duracao_minutos INTEGER NOT NULL DEFAULT 60,
    cor TEXT DEFAULT '#10b981',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- AGENDAMENTOS (Appointments)
-- =====================
CREATE TABLE public.agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    profissional_id UUID REFERENCES public.profissionais(id) ON DELETE SET NULL,
    servico_id UUID REFERENCES public.servicos(id) ON DELETE SET NULL,
    data_hora TIMESTAMPTZ NOT NULL,
    duracao_minutos INTEGER NOT NULL DEFAULT 60,
    status appointment_status DEFAULT 'scheduled',
    valor DECIMAL(10,2),
    notas TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- DIAS_BLOQUEADOS (Blocked Days)
-- =====================
CREATE TABLE public.dias_bloqueados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    profissional_id UUID REFERENCES public.profissionais(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    motivo TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- PROCEDIMENTOS_DO_CLIENTE (Client Procedures)
-- =====================
CREATE TABLE public.procedimentos_do_cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
    agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
    servico_id UUID REFERENCES public.servicos(id) ON DELETE SET NULL,
    profissional_id UUID REFERENCES public.profissionais(id) ON DELETE SET NULL,
    data_procedimento TIMESTAMPTZ DEFAULT now(),
    observacoes TEXT,
    fotos TEXT[],
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- REGISTRO_FINANCEIROS (Financial Records)
-- =====================
CREATE TABLE public.registro_financeiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    categoria TEXT,
    descricao TEXT,
    valor DECIMAL(10,2) NOT NULL,
    data_transacao DATE NOT NULL DEFAULT CURRENT_DATE,
    status payment_status DEFAULT 'pending',
    metodo_pagamento TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- IMAGENS_DO_PORTFOLIO (Portfolio Images)
-- =====================
CREATE TABLE public.imagens_do_portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    profissional_id UUID REFERENCES public.profissionais(id) ON DELETE SET NULL,
    servico_id UUID REFERENCES public.servicos(id) ON DELETE SET NULL,
    titulo TEXT,
    descricao TEXT,
    imagem_url TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- CONVERSAS_DO_WHATSAPP (WhatsApp Conversations)
-- =====================
CREATE TABLE public.conversas_do_whatsapp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    telefone TEXT NOT NULL,
    ultimo_contato TIMESTAMPTZ DEFAULT now(),
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- HISTORICO_MENSAGENS (Message History)
-- =====================
CREATE TABLE public.historico_mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id UUID REFERENCES public.conversas_do_whatsapp(id) ON DELETE CASCADE NOT NULL,
    direcao TEXT NOT NULL CHECK (direcao IN ('incoming', 'outgoing')),
    conteudo TEXT NOT NULL,
    tipo TEXT DEFAULT 'text',
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- ENABLE RLS ON ALL TABLES
-- =====================
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funcao_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profissionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dias_bloqueados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedimentos_do_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registro_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imagens_do_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversas_do_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_mensagens ENABLE ROW LEVEL SECURITY;

-- =====================
-- SECURITY DEFINER FUNCTIONS
-- =====================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.funcao_usuario
        WHERE user_id = _user_id AND role = _role
    )
$$;

CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT empresa_id FROM public.perfis WHERE id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of_empresa(_user_id UUID, _empresa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.funcao_usuario
        WHERE user_id = _user_id 
        AND role = 'admin' 
        AND empresa_id = _empresa_id
    )
$$;

-- =====================
-- RLS POLICIES
-- =====================

-- EMPRESAS policies
CREATE POLICY "Public can view active empresas" ON public.empresas
    FOR SELECT USING (ativo = true);

CREATE POLICY "Admins can manage their empresa" ON public.empresas
    FOR ALL TO authenticated
    USING (public.is_admin_of_empresa(auth.uid(), id));

-- PERFIS policies
CREATE POLICY "Users can view own profile" ON public.perfis
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.perfis
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.perfis
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view profiles in their empresa" ON public.perfis
    FOR SELECT TO authenticated
    USING (public.is_admin_of_empresa(auth.uid(), empresa_id));

-- FUNCAO_USUARIO policies
CREATE POLICY "Users can view own roles" ON public.funcao_usuario
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles in their empresa" ON public.funcao_usuario
    FOR ALL TO authenticated
    USING (public.is_admin_of_empresa(auth.uid(), empresa_id));

-- PROFISSIONAIS policies
CREATE POLICY "Public can view active professionals" ON public.profissionais
    FOR SELECT USING (ativo = true);

CREATE POLICY "Admins can manage professionals" ON public.profissionais
    FOR ALL TO authenticated
    USING (public.is_admin_of_empresa(auth.uid(), empresa_id));

-- CLIENTES policies
CREATE POLICY "Clients can view own data" ON public.clientes
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Clients can update own data" ON public.clientes
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage clients in their empresa" ON public.clientes
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.cliente_empresa ce
            WHERE ce.cliente_id = clientes.id
            AND public.is_admin_of_empresa(auth.uid(), ce.empresa_id)
        )
    );

-- CLIENTE_EMPRESA policies
CREATE POLICY "Clients can view own associations" ON public.cliente_empresa
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.id = cliente_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage client associations" ON public.cliente_empresa
    FOR ALL TO authenticated
    USING (public.is_admin_of_empresa(auth.uid(), empresa_id));

-- SERVICOS policies
CREATE POLICY "Public can view active services" ON public.servicos
    FOR SELECT USING (ativo = true);

CREATE POLICY "Admins can manage services" ON public.servicos
    FOR ALL TO authenticated
    USING (public.is_admin_of_empresa(auth.uid(), empresa_id));

-- AGENDAMENTOS policies
CREATE POLICY "Clients can view own appointments" ON public.agendamentos
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.id = cliente_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Clients can create appointments" ON public.agendamentos
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.id = cliente_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage all appointments" ON public.agendamentos
    FOR ALL TO authenticated
    USING (public.is_admin_of_empresa(auth.uid(), empresa_id));

-- DIAS_BLOQUEADOS policies
CREATE POLICY "Public can view blocked days" ON public.dias_bloqueados
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage blocked days" ON public.dias_bloqueados
    FOR ALL TO authenticated
    USING (public.is_admin_of_empresa(auth.uid(), empresa_id));

-- PROCEDIMENTOS_DO_CLIENTE policies
CREATE POLICY "Clients can view own procedures" ON public.procedimentos_do_cliente
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.clientes c
            WHERE c.id = cliente_id AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage client procedures" ON public.procedimentos_do_cliente
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.clientes c
            JOIN public.cliente_empresa ce ON ce.cliente_id = c.id
            WHERE c.id = cliente_id
            AND public.is_admin_of_empresa(auth.uid(), ce.empresa_id)
        )
    );

-- REGISTRO_FINANCEIROS policies
CREATE POLICY "Admins can manage financial records" ON public.registro_financeiros
    FOR ALL TO authenticated
    USING (public.is_admin_of_empresa(auth.uid(), empresa_id));

-- IMAGENS_DO_PORTFOLIO policies
CREATE POLICY "Public can view active portfolio images" ON public.imagens_do_portfolio
    FOR SELECT USING (ativo = true);

CREATE POLICY "Admins can manage portfolio images" ON public.imagens_do_portfolio
    FOR ALL TO authenticated
    USING (public.is_admin_of_empresa(auth.uid(), empresa_id));

-- CONVERSAS_DO_WHATSAPP policies
CREATE POLICY "Admins can manage whatsapp conversations" ON public.conversas_do_whatsapp
    FOR ALL TO authenticated
    USING (public.is_admin_of_empresa(auth.uid(), empresa_id));

-- HISTORICO_MENSAGENS policies
CREATE POLICY "Admins can manage message history" ON public.historico_mensagens
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversas_do_whatsapp c
            WHERE c.id = conversa_id
            AND public.is_admin_of_empresa(auth.uid(), c.empresa_id)
        )
    );

-- =====================
-- TRIGGERS FOR UPDATED_AT
-- =====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON public.perfis
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profissionais_updated_at BEFORE UPDATE ON public.profissionais
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON public.servicos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agendamentos_updated_at BEFORE UPDATE ON public.agendamentos
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_registro_financeiros_updated_at BEFORE UPDATE ON public.registro_financeiros
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversas_updated_at BEFORE UPDATE ON public.conversas_do_whatsapp
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- TRIGGER FOR NEW USER PROFILE
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.perfis (id, nome, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.raw_user_meta_data ->> 'full_name'),
        NEW.email
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- INDEXES FOR PERFORMANCE
-- =====================
CREATE INDEX idx_agendamentos_data ON public.agendamentos(data_hora);
CREATE INDEX idx_agendamentos_empresa ON public.agendamentos(empresa_id);
CREATE INDEX idx_agendamentos_cliente ON public.agendamentos(cliente_id);
CREATE INDEX idx_agendamentos_profissional ON public.agendamentos(profissional_id);
CREATE INDEX idx_clientes_user ON public.clientes(user_id);
CREATE INDEX idx_profissionais_empresa ON public.profissionais(empresa_id);
CREATE INDEX idx_servicos_empresa ON public.servicos(empresa_id);
CREATE INDEX idx_funcao_usuario_user ON public.funcao_usuario(user_id);
CREATE INDEX idx_empresas_slug ON public.empresas(slug);
