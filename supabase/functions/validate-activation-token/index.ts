import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VALIDATE-TOKEN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { token } = await req.json();
    logStep("Token received", { token: token?.substring(0, 10) + "..." });

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token não fornecido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find token
    const { data: tokenData, error: tokenError } = await supabase
      .from("activation_tokens")
      .select(`
        id,
        email,
        phone,
        plan_id,
        stripe_customer_id,
        stripe_subscription_id,
        expires_at,
        used_at,
        subscription_plans (
          name,
          description
        )
      `)
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      logStep("Token not found");
      return new Response(
        JSON.stringify({ error: "Token inválido ou não encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Token found", { tokenId: tokenData.id, email: tokenData.email });

    // Check if already used
    if (tokenData.used_at) {
      logStep("Token already used");
      return new Response(
        JSON.stringify({ error: "Este link de ativação já foi utilizado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      logStep("Token expired");
      return new Response(
        JSON.stringify({ error: "Este link de ativação expirou. Solicite um novo." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Token is valid");

    return new Response(
      JSON.stringify({
        tokenInfo: {
          id: tokenData.id,
          email: tokenData.email,
          phone: tokenData.phone,
          plan_id: tokenData.plan_id,
          stripe_customer_id: tokenData.stripe_customer_id,
          stripe_subscription_id: tokenData.stripe_subscription_id,
          expires_at: tokenData.expires_at,
          used_at: tokenData.used_at,
          plan: tokenData.subscription_plans,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: "Erro ao validar token" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
