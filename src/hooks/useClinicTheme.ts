import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ClinicTheme {
  nome: string;
  logo_url: string;
  cor_primaria: string;
  cor_secundaria: string;
}

export const useClinicTheme = (empresaId?: string) => {
  const [theme, setTheme] = useState<ClinicTheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      if (!empresaId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("empresas")
          .select("nome, logo_url, cor_primaria, cor_secundaria")
          .eq("id", empresaId)
          .single();

        if (error) throw error;

        if (data) {
          setTheme(data);
          applyTheme(data);
        }
      } catch (error) {
        console.error("Error loading theme:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTheme();

    if (empresaId) {
      const channel = supabase
        .channel(`empresa-theme-${empresaId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'empresas',
            filter: `id=eq.${empresaId}`
          },
          (payload) => {
            const newData = payload.new as ClinicTheme;
            setTheme(newData);
            applyTheme(newData);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [empresaId]);

  const applyTheme = (themeData: ClinicTheme) => {
    if (!themeData.cor_primaria && !themeData.cor_secundaria) return;

    const root = document.documentElement;

    if (themeData.cor_primaria) {
      const primaryHSL = hexToHSL(themeData.cor_primaria);
      root.style.setProperty("--primary", primaryHSL);
    }

    if (themeData.cor_secundaria) {
      const secondaryHSL = hexToHSL(themeData.cor_secundaria);
      root.style.setProperty("--secondary", secondaryHSL);
    }
  };

  const hexToHSL = (hex: string): string => {
    hex = hex.replace("#", "");

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  return { theme, loading };
};

// Backward compatibility export
export const useBarbershopTheme = useClinicTheme;