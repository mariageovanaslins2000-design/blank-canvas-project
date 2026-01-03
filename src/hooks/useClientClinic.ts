import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ClinicData {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export function useClientClinic() {
  const { user } = useAuth();
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClinic = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: linkData, error: linkError } = await supabase
          .from("client_barbershop")
          .select("barbershop_id")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (linkError) throw linkError;
        
        if (!linkData) {
          setClinicId(null);
          setClinic(null);
          setLoading(false);
          return;
        }

        setClinicId(linkData.barbershop_id);

        const { data: clinicData, error: clinicError } = await supabase
          .from("barbershops")
          .select("id, name, logo_url, primary_color, secondary_color")
          .eq("id", linkData.barbershop_id)
          .single();

        if (clinicError) throw clinicError;
        setClinic(clinicData);
      } catch (error) {
        console.error("Error loading clinic:", error);
      } finally {
        setLoading(false);
      }
    };

    loadClinic();

    if (user) {
      const channel = supabase
        .channel('clinic-theme-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'barbershops'
          },
          (payload) => {
            if (clinicId && payload.new.id === clinicId) {
              setClinic(payload.new as ClinicData);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, clinicId]);

  return { 
    clinicId, 
    clinic, 
    loading,
    // Backward compatibility aliases
    barbershopId: clinicId, 
    barbershop: clinic 
  };
}

// Backward compatibility export
export const useClientBarbershop = useClientClinic;
