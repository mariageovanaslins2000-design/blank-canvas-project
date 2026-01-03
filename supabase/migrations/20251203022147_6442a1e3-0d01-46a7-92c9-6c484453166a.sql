-- Add client_name column to appointments table to store name per appointment
ALTER TABLE public.appointments ADD COLUMN client_name TEXT;