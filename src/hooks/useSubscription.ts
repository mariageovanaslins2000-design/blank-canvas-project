import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SubscriptionPlan {
  id: string;
  name: string;
  max_professionals: number | null;
  max_clients: number | null;
  max_portfolio_images: number | null;
  has_custom_colors: boolean;
  has_day_blocking: boolean;
  has_date_filter: boolean;
  has_whatsapp_integration: boolean;
  has_advanced_reports: boolean;
}

interface Subscription {
  id: string;
  status: string;
  plan_id: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
}

interface Usage {
  professionals: number;
  clients: number;
  portfolioImages: number;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [usage, setUsage] = useState<Usage>({ professionals: 0, clients: 0, portfolioImages: 0 });
  const [loading, setLoading] = useState(true);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user]);

  const loadSubscriptionData = async () => {
    if (!user) return;

    try {
      // Get barbershop
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!barbershop) {
        setLoading(false);
        return;
      }

      setBarbershopId(barbershop.id);

      // Get subscription
      const { data: subscriptionData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (subscriptionData) {
        setSubscription(subscriptionData);

        // Get plan details
        const { data: planData } = await supabase
          .from("subscription_plans")
          .select("*")
          .eq("id", subscriptionData.plan_id)
          .single();

        if (planData) {
          setPlan(planData as SubscriptionPlan);
        }
      }

      // Get usage counts
      const [professionalsResult, clientsResult, portfolioResult] = await Promise.all([
        supabase.from("barbers").select("id", { count: "exact" }).eq("barbershop_id", barbershop.id).eq("is_active", true),
        supabase.from("clients").select("id", { count: "exact" }).eq("barbershop_id", barbershop.id),
        supabase.from("portfolio_images").select("id", { count: "exact" }).eq("barbershop_id", barbershop.id)
      ]);

      setUsage({
        professionals: professionalsResult.count || 0,
        clients: clientsResult.count || 0,
        portfolioImages: portfolioResult.count || 0
      });

    } catch (error) {
      console.error("Error loading subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  const isActive = (): boolean => {
    if (!subscription) return false;
    return subscription.status === "active" || subscription.status === "trialing";
  };

  const canAddProfessional = (): boolean => {
    if (!plan || plan.max_professionals === null) return true;
    return usage.professionals < plan.max_professionals;
  };

  const canAddClient = (): boolean => {
    if (!plan || plan.max_clients === null) return true;
    return usage.clients < plan.max_clients;
  };

  const canAddPortfolioImage = (): boolean => {
    if (!plan) return false;
    if (plan.max_portfolio_images === null) return true;
    if (plan.max_portfolio_images === 0) return false;
    return usage.portfolioImages < plan.max_portfolio_images;
  };

  const hasPortfolioAccess = (): boolean => {
    if (!plan) return false;
    return plan.max_portfolio_images !== 0;
  };

  const hasFeature = (feature: 'custom_colors' | 'day_blocking' | 'date_filter' | 'whatsapp' | 'advanced_reports'): boolean => {
    if (!plan) return false;
    switch (feature) {
      case 'custom_colors':
        return plan.has_custom_colors;
      case 'day_blocking':
        return plan.has_day_blocking;
      case 'date_filter':
        return plan.has_date_filter;
      case 'whatsapp':
        return plan.has_whatsapp_integration;
      case 'advanced_reports':
        return plan.has_advanced_reports;
      default:
        return false;
    }
  };

  const getProfessionalsLimit = (): { current: number; max: number | null } => {
    return { current: usage.professionals, max: plan?.max_professionals ?? null };
  };

  const getClientsLimit = (): { current: number; max: number | null } => {
    return { current: usage.clients, max: plan?.max_clients ?? null };
  };

  const getPortfolioLimit = (): { current: number; max: number | null } => {
    return { current: usage.portfolioImages, max: plan?.max_portfolio_images ?? null };
  };

  const refreshUsage = () => {
    loadSubscriptionData();
  };

  return {
    subscription,
    plan,
    usage,
    loading,
    barbershopId,
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
