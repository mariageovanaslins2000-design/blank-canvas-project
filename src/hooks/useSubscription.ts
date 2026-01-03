import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Usage {
  professionals: number;
  clients: number;
  portfolioImages: number;
}

// Simplified subscription hook that works without subscription tables
export function useSubscription() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<Usage>({ professionals: 0, clients: 0, portfolioImages: 0 });
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Buscar empresa através da funcao_usuario
      const { data: funcaoData } = await supabase
        .from("funcao_usuario")
        .select("empresa_id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!funcaoData?.empresa_id) {
        setLoading(false);
        return;
      }

      setEmpresaId(funcaoData.empresa_id);

      // Get usage counts
      const [professionalsResult, portfolioResult] = await Promise.all([
        supabase.from("profissionais").select("id", { count: "exact" }).eq("empresa_id", funcaoData.empresa_id).eq("ativo", true),
        supabase.from("imagens_do_portfolio").select("id", { count: "exact" }).eq("empresa_id", funcaoData.empresa_id)
      ]);

      // Get clients count through cliente_empresa
      const { data: clientLinks } = await supabase
        .from("cliente_empresa")
        .select("cliente_id", { count: "exact" })
        .eq("empresa_id", funcaoData.empresa_id);

      setUsage({
        professionals: professionalsResult.count || 0,
        clients: clientLinks?.length || 0,
        portfolioImages: portfolioResult.count || 0
      });

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Default plan with unlimited features
  const plan = {
    name: "Premium",
    max_professionals: null,
    max_clients: null,
    max_portfolio_images: null,
    has_custom_colors: true,
    has_day_blocking: true,
    has_date_filter: true,
    has_whatsapp_integration: true,
    has_advanced_reports: true,
  };

  const isActive = (): boolean => true;

  const canAddProfessional = (): boolean => true;

  const canAddClient = (): boolean => true;

  const canAddPortfolioImage = (): boolean => true;

  const hasPortfolioAccess = (): boolean => true;

  const hasFeature = (feature: 'custom_colors' | 'day_blocking' | 'date_filter' | 'whatsapp' | 'advanced_reports'): boolean => {
    return true;
  };

  const getProfessionalsLimit = (): { current: number; max: number | null } => {
    return { current: usage.professionals, max: null };
  };

  const getClientsLimit = (): { current: number; max: number | null } => {
    return { current: usage.clients, max: null };
  };

  const getPortfolioLimit = (): { current: number; max: number | null } => {
    return { current: usage.portfolioImages, max: null };
  };

  const refreshUsage = () => {
    loadData();
  };

  return {
    subscription: null,
    plan,
    usage,
    loading,
    barbershopId: empresaId,
    isActive,
    canAddProfessional,
    canAddClient,
    canAddPortfolioImage,
    hasPortfolioAccess,
    hasFeature,
    getProfessionalsLimit,
    getClientsLimit,
    getPortfolioLimit,
    refreshUsage
  };
}