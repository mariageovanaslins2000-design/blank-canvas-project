-- Drop existing function and recreate with primary_color
DROP FUNCTION IF EXISTS public.get_barbershop_public_info(uuid);

CREATE OR REPLACE FUNCTION public.get_barbershop_public_info(barbershop_id uuid)
 RETURNS TABLE(id uuid, name text, logo_url text, primary_color text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT b.id, b.name, b.logo_url, b.primary_color
  FROM public.barbershops b
  WHERE b.id = barbershop_id;
$function$;