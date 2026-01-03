CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'owner',
    'client'
);


--
-- Name: get_barbershop_public_info(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_barbershop_public_info(barbershop_id uuid) RETURNS TABLE(id uuid, name text, logo_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT b.id, b.name, b.logo_url
  FROM public.barbershops b
  WHERE b.id = barbershop_id;
$$;


--
-- Name: get_user_barbershop_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_barbershop_id(user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT barbershop_id 
  FROM public.client_barbershop 
  WHERE profile_id = user_id 
  LIMIT 1;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_barbershop_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  
  -- Create role based on metadata
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'client')
  );
  
  -- If owner, also give client role so they can access both panels
  IF (NEW.raw_user_meta_data->>'role') = 'owner' THEN
    -- Add client role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Create barbershop
    INSERT INTO public.barbershops (owner_id, name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'barbershop_name', 'Minha Barbearia')
    )
    RETURNING id INTO v_barbershop_id;
    
    -- Link owner to their own barbershop as client
    INSERT INTO public.client_barbershop (profile_id, barbershop_id)
    VALUES (NEW.id, v_barbershop_id);
  ELSIF (NEW.raw_user_meta_data->>'barbershop_id') IS NOT NULL THEN
    -- If barbershop_id is provided during signup, link the client
    INSERT INTO public.client_barbershop (profile_id, barbershop_id)
    VALUES (NEW.id, (NEW.raw_user_meta_data->>'barbershop_id')::UUID)
    ON CONFLICT (profile_id, barbershop_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: link_client_to_barbershop(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_client_to_barbershop() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Buscar o profile_id a partir do client_id (clients.id)
  SELECT profile_id
  INTO v_profile_id
  FROM public.clients
  WHERE id = NEW.client_id;

  -- Se existir profile_id, cria o vínculo na client_barbershop
  IF v_profile_id IS NOT NULL THEN
    INSERT INTO public.client_barbershop (profile_id, barbershop_id)
    VALUES (v_profile_id, NEW.barbershop_id)
    ON CONFLICT (profile_id, barbershop_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: sync_client_on_barbershop_link(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_client_on_barbershop_link() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_profile RECORD;
BEGIN
  -- Buscar informações do perfil
  SELECT full_name, phone 
  INTO v_profile
  FROM public.profiles
  WHERE id = NEW.profile_id;
  
  -- Inserir ou atualizar registro em clients
  INSERT INTO public.clients (
    barbershop_id,
    profile_id,
    name,
    phone,
    total_visits
  )
  VALUES (
    NEW.barbershop_id,
    NEW.profile_id,
    COALESCE(v_profile.full_name, 'Cliente'),
    v_profile.phone,
    0
  )
  ON CONFLICT (barbershop_id, profile_id) 
  DO UPDATE SET
    name = COALESCE(EXCLUDED.name, clients.name),
    phone = COALESCE(EXCLUDED.phone, clients.phone);
  
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barbershop_id uuid NOT NULL,
    barber_id uuid NOT NULL,
    client_id uuid NOT NULL,
    service_id uuid NOT NULL,
    appointment_date timestamp with time zone NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    paid_amount numeric(10,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT appointments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text])))
);


--
-- Name: barbers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.barbers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barbershop_id uuid NOT NULL,
    name text NOT NULL,
    specialty text,
    photo_url text,
    phone text,
    commission_percent numeric(5,2) DEFAULT 50.00,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    google_calendar_id text
);


--
-- Name: barbershops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.barbershops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    name text NOT NULL,
    logo_url text,
    primary_color text DEFAULT '#D4AF37'::text,
    secondary_color text DEFAULT '#1A1A1A'::text,
    address text,
    phone text,
    opening_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    closing_time time without time zone DEFAULT '18:00:00'::time without time zone NOT NULL,
    working_days integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: client_barbershop; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_barbershop (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    barbershop_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barbershop_id uuid NOT NULL,
    profile_id uuid,
    name text NOT NULL,
    phone text,
    email text,
    total_visits integer DEFAULT 0 NOT NULL,
    last_appointment_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: financial_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barbershop_id uuid NOT NULL,
    appointment_id uuid NOT NULL,
    barber_id uuid NOT NULL,
    valor_total numeric NOT NULL,
    comissao_percent numeric NOT NULL,
    comissao_valor numeric NOT NULL,
    valor_liquido_barbearia numeric NOT NULL,
    status text DEFAULT 'PENDENTE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolio_images; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barbershop_id uuid NOT NULL,
    image_url text NOT NULL,
    title text,
    description text,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text NOT NULL,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    barbershop_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    duration_minutes integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number text NOT NULL,
    profile_id uuid,
    barbershop_id uuid,
    conversation_state jsonb DEFAULT '{}'::jsonb,
    last_message_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: barbers barbers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barbers
    ADD CONSTRAINT barbers_pkey PRIMARY KEY (id);


--
-- Name: barbershops barbershops_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barbershops
    ADD CONSTRAINT barbershops_owner_id_key UNIQUE (owner_id);


--
-- Name: barbershops barbershops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barbershops
    ADD CONSTRAINT barbershops_pkey PRIMARY KEY (id);


--
-- Name: client_barbershop client_barbershop_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_barbershop
    ADD CONSTRAINT client_barbershop_pkey PRIMARY KEY (id);


--
-- Name: client_barbershop client_barbershop_profile_id_barbershop_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_barbershop
    ADD CONSTRAINT client_barbershop_profile_id_barbershop_id_key UNIQUE (profile_id, barbershop_id);


--
-- Name: clients clients_barbershop_id_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_barbershop_id_profile_id_key UNIQUE (barbershop_id, profile_id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: financial_records financial_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_records
    ADD CONSTRAINT financial_records_pkey PRIMARY KEY (id);


--
-- Name: portfolio_images portfolio_images_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_images
    ADD CONSTRAINT portfolio_images_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: whatsapp_conversations whatsapp_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_pkey PRIMARY KEY (id);


--
-- Name: idx_whatsapp_barbershop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_barbershop ON public.whatsapp_conversations USING btree (barbershop_id);


--
-- Name: idx_whatsapp_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_phone ON public.whatsapp_conversations USING btree (phone_number);


--
-- Name: appointments link_client_on_appointment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER link_client_on_appointment BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.link_client_to_barbershop();


--
-- Name: appointments set_updated_at_appointments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: barbers set_updated_at_barbers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_barbers BEFORE UPDATE ON public.barbers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: barbershops set_updated_at_barbershops; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_barbershops BEFORE UPDATE ON public.barbershops FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles set_updated_at_profiles; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: services set_updated_at_services; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_services BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: client_barbershop sync_client_after_barbershop_link; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_client_after_barbershop_link AFTER INSERT ON public.client_barbershop FOR EACH ROW EXECUTE FUNCTION public.sync_client_on_barbershop_link();


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: financial_records update_financial_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_financial_records_updated_at BEFORE UPDATE ON public.financial_records FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: portfolio_images update_portfolio_images_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_portfolio_images_updated_at BEFORE UPDATE ON public.portfolio_images FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: whatsapp_conversations update_whatsapp_conversations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON public.whatsapp_conversations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: appointments appointments_barber_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_barber_id_fkey FOREIGN KEY (barber_id) REFERENCES public.barbers(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_barbershop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_barbershop_id_fkey FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: barbers barbers_barbershop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barbers
    ADD CONSTRAINT barbers_barbershop_id_fkey FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;


--
-- Name: barbershops barbershops_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barbershops
    ADD CONSTRAINT barbershops_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: client_barbershop client_barbershop_barbershop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_barbershop
    ADD CONSTRAINT client_barbershop_barbershop_id_fkey FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;


--
-- Name: client_barbershop client_barbershop_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_barbershop
    ADD CONSTRAINT client_barbershop_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: clients clients_barbershop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_barbershop_id_fkey FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;


--
-- Name: clients clients_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: financial_records financial_records_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_records
    ADD CONSTRAINT financial_records_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: financial_records financial_records_barber_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_records
    ADD CONSTRAINT financial_records_barber_id_fkey FOREIGN KEY (barber_id) REFERENCES public.barbers(id) ON DELETE CASCADE;


--
-- Name: financial_records financial_records_barbershop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_records
    ADD CONSTRAINT financial_records_barbershop_id_fkey FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;


--
-- Name: portfolio_images portfolio_images_barbershop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_images
    ADD CONSTRAINT portfolio_images_barbershop_id_fkey FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: services services_barbershop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_barbershop_id_fkey FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: whatsapp_conversations whatsapp_conversations_barbershop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_barbershop_id_fkey FOREIGN KEY (barbershop_id) REFERENCES public.barbershops(id) ON DELETE CASCADE;


--
-- Name: whatsapp_conversations whatsapp_conversations_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversations
    ADD CONSTRAINT whatsapp_conversations_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: appointments Clients can create their own appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can create their own appointments" ON public.appointments FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = appointments.client_id) AND (clients.profile_id = auth.uid())))) AND public.has_role(auth.uid(), 'client'::public.app_role) AND (barbershop_id = public.get_user_barbershop_id(auth.uid()))));


--
-- Name: appointments Clients can update their own appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can update their own appointments" ON public.appointments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = appointments.client_id) AND (clients.profile_id = auth.uid())))));


--
-- Name: barbers Clients can view active barbers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view active barbers" ON public.barbers FOR SELECT USING (((is_active = true) AND (public.has_role(auth.uid(), 'client'::public.app_role) AND (barbershop_id = public.get_user_barbershop_id(auth.uid())))));


--
-- Name: services Clients can view active services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view active services" ON public.services FOR SELECT USING (((is_active = true) AND (public.has_role(auth.uid(), 'client'::public.app_role) AND (barbershop_id = public.get_user_barbershop_id(auth.uid())))));


--
-- Name: barbershops Clients can view their barbershop; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view their barbershop" ON public.barbershops FOR SELECT USING (((id = public.get_user_barbershop_id(auth.uid())) OR (owner_id = auth.uid())));


--
-- Name: portfolio_images Clients can view their barbershop portfolio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view their barbershop portfolio" ON public.portfolio_images FOR SELECT USING (((barbershop_id = public.get_user_barbershop_id(auth.uid())) OR (EXISTS ( SELECT 1
   FROM public.barbershops
  WHERE ((barbershops.id = portfolio_images.barbershop_id) AND (barbershops.owner_id = auth.uid()))))));


--
-- Name: appointments Clients can view their own appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view their own appointments" ON public.appointments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.clients
  WHERE ((clients.id = appointments.client_id) AND (clients.profile_id = auth.uid())))));


--
-- Name: clients Clients can view their own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view their own record" ON public.clients FOR SELECT TO authenticated USING ((profile_id = auth.uid()));


--
-- Name: appointments Owners can delete their barbershop appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can delete their barbershop appointments" ON public.appointments FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.barbershops
  WHERE ((barbershops.id = appointments.barbershop_id) AND (barbershops.owner_id = auth.uid())))));


--
-- Name: barbers Owners can manage their barbers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage their barbers" ON public.barbers USING ((EXISTS ( SELECT 1
   FROM public.barbershops
  WHERE ((barbershops.id = barbers.barbershop_id) AND (barbershops.owner_id = auth.uid())))));


--
-- Name: barbershops Owners can manage their barbershop; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage their barbershop" ON public.barbershops USING ((auth.uid() = owner_id));


--
-- Name: appointments Owners can manage their barbershop appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage their barbershop appointments" ON public.appointments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.barbershops
  WHERE ((barbershops.id = appointments.barbershop_id) AND (barbershops.owner_id = auth.uid())))));


--
-- Name: clients Owners can manage their clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage their clients" ON public.clients TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.barbershops
  WHERE ((barbershops.id = clients.barbershop_id) AND (barbershops.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.barbershops
  WHERE ((barbershops.id = clients.barbershop_id) AND (barbershops.owner_id = auth.uid())))));


--
-- Name: financial_records Owners can manage their financial records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage their financial records" ON public.financial_records USING ((EXISTS ( SELECT 1
   FROM public.barbershops
  WHERE ((barbershops.id = financial_records.barbershop_id) AND (barbershops.owner_id = auth.uid())))));


--
-- Name: portfolio_images Owners can manage their portfolio images; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage their portfolio images" ON public.portfolio_images USING ((EXISTS ( SELECT 1
   FROM public.barbershops
  WHERE ((barbershops.id = portfolio_images.barbershop_id) AND (barbershops.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.barbershops
  WHERE ((barbershops.id = portfolio_images.barbershop_id) AND (barbershops.owner_id = auth.uid())))));


--
-- Name: services Owners can manage their services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage their services" ON public.services USING ((EXISTS ( SELECT 1
   FROM public.barbershops
  WHERE ((barbershops.id = services.barbershop_id) AND (barbershops.owner_id = auth.uid())))));


--
-- Name: appointments Owners can view their barbershop appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view their barbershop appointments" ON public.appointments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.barbershops
  WHERE ((barbershops.id = appointments.barbershop_id) AND (barbershops.owner_id = auth.uid())))));


--
-- Name: whatsapp_conversations Owners can view their barbershop conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view their barbershop conversations" ON public.whatsapp_conversations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.barbershops
  WHERE ((barbershops.id = whatsapp_conversations.barbershop_id) AND (barbershops.owner_id = auth.uid())))));


--
-- Name: whatsapp_conversations System can manage conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage conversations" ON public.whatsapp_conversations USING (true) WITH CHECK (true);


--
-- Name: client_barbershop Users can insert their own barbershop links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own barbershop links" ON public.client_barbershop FOR INSERT WITH CHECK ((auth.uid() = profile_id));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: client_barbershop Users can view their own barbershop links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own barbershop links" ON public.client_barbershop FOR SELECT USING ((auth.uid() = profile_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: appointments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: barbers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;

--
-- Name: barbershops; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

--
-- Name: client_barbershop; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_barbershop ENABLE ROW LEVEL SECURITY;

--
-- Name: clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_images; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_images ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


