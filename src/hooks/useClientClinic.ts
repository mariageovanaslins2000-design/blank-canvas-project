import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface EmpresaData {
  id: string;
  nome: string;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
}

export function useClientClinic() {
  const { user } = useAuth();
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState<EmpresaData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEmpresa = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Buscar vinculação cliente-empresa
        const { data: linkData, error: linkError } = await supabase
          .from("cliente_empresa")
          .select("empresa_id")
          .eq("cliente_id", user.id)
          .maybeSingle();

        if (linkError) throw linkError;
        
        if (!linkData) {
          // Tenta buscar através do cliente com user_id
          const { data: clienteData } = await supabase
            .from("clientes")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (clienteData) {
            const { data: linkData2 } = await supabase
              .from("cliente_empresa")
              .select("empresa_id")
              .eq("cliente_id", clienteData.id)
              .maybeSingle();

            if (linkData2) {
              setEmpresaId(linkData2.empresa_id);

              const { data: empresaData } = await supabase
                .from("empresas")
                .select("id, nome, logo_url, cor_primaria, cor_secundaria")
                .eq("id", linkData2.empresa_id)
                .single();

              if (empresaData) setEmpresa(empresaData);
            }
          }

          setLoading(false);
          return;
        }

        setEmpresaId(linkData.empresa_id);

        const { data: empresaData, error: empresaError } = await supabase
          .from("empresas")
          .select("id, nome, logo_url, cor_primaria, cor_secundaria")
          .eq("id", linkData.empresa_id)
          .single();

        if (empresaError) throw empresaError;
        setEmpresa(empresaData);
      } catch (error) {
        console.error("Error loading empresa:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEmpresa();

    if (user) {
      const channel = supabase
        .channel('empresa-theme-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'empresas'
          },
          (payload) => {
            if (empresaId && payload.new.id === empresaId) {
              setEmpresa(payload.new as EmpresaData);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, empresaId]);

  return { 
    empresaId, 
    empresa, 
    loading,
    // Backward compatibility aliases
    clinicId: empresaId,
    clinic: empresa,
    barbershopId: empresaId, 
    barbershop: empresa 
  };
}

// Backward compatibility export
export const useClientBarbershop = useClientClinic;