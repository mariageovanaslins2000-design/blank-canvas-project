import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ACTIVATE-ACCOUNT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { token, fullName, phone, password, clinicName } = await req.json();
    logStep("Request data", { token: token?.substring(0, 10) + "...", fullName, clinicName });

    if (!token || !fullName || !phone || !password || !clinicName) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from("activation_tokens")
      .select("*")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData) {
      logStep("Token not found");
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (tokenData.used_at) {
      logStep("Token already used");
      return new Response(
        JSON.stringify({ error: "Este link já foi utilizado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      logStep("Token expired");
      return new Response(
        JSON.stringify({ error: "Este link expirou" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    logStep("Token validated", { email: tokenData.email, planId: tokenData.plan_id });

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === tokenData.email);
    
    if (existingUser) {
      logStep("User already exists");
      return new Response(
        JSON.stringify({ error: "Já existe uma conta com este email. Faça login." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create user with owner role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: tokenData.email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role: "owner",
        barbershop_name: clinicName,
      },
    });

    if (authError) {
      logStep("Error creating user", { error: authError });
      return new Response(
        JSON.stringify({ error: "Erro ao criar usuário: " + authError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const userId = authData.user!.id;
    logStep("User created", { userId });

    // Get barbershop that was created by the trigger
    const { data: barbershop } = await supabase
      .from("barbershops")
      .select("id")
      .eq("owner_id", userId)
      .single();

    if (barbershop) {
      logStep("Barbershop found", { barbershopId: barbershop.id });

      // Create subscription
      const { error: subError } = await supabase
        .from("subscriptions")
        .insert({
          barbershop_id: barbershop.id,
          plan_id: tokenData.plan_id,
          stripe_subscription_id: tokenData.stripe_subscription_id,
          stripe_customer_id: tokenData.stripe_customer_id,
          status: "trialing",
          trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

      if (subError) {
        logStep("Error creating subscription", { error: subError });
      } else {
        logStep("Subscription created");
      }
    }

    // Mark token as used
    await supabase
      .from("activation_tokens")
      .update({ 
        used_at: new Date().toISOString(),
        used_by: userId,
      })
      .eq("id", tokenData.id);

    logStep("Token marked as used");

    return new Response(
      JSON.stringify({ 
        success: true,
        userId,
        email: tokenData.email,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: "Erro ao ativar conta: " + errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
