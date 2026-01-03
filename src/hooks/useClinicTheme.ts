import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ClinicTheme {
  name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
}

export const useClinicTheme = (clinicId?: string) => {
  const [theme, setTheme] = useState<ClinicTheme | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      if (!clinicId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("barbershops")
          .select("name, logo_url, primary_color, secondary_color")
          .eq("id", clinicId)
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

    if (clinicId) {
      const channel = supabase
        .channel(`clinic-theme-${clinicId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'barbershops',
            filter: `id=eq.${clinicId}`
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
  }, [clinicId]);

  const applyTheme = (themeData: ClinicTheme) => {
    if (!themeData.primary_color && !themeData.secondary_color) return;

    const root = document.documentElement;

    if (themeData.primary_color) {
      const primaryHSL = hexToHSL(themeData.primary_color);
      root.style.setProperty("--primary", primaryHSL);
    }

    if (themeData.secondary_color) {
      const secondaryHSL = hexToHSL(themeData.secondary_color);
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
