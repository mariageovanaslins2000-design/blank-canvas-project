import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://n8n-n8n.knceh1.easypanel.host/webhook/lembrete';

// Helper: Converter datetime UTC para formatos de Brasília
function convertToBrasilia(utcDateStr: string) {
  const utcDate = new Date(utcDateStr);
  const brasiliaMs = utcDate.getTime() - (3 * 60 * 60 * 1000);
  const brasiliaDate = new Date(brasiliaMs);
  
  const day = String(brasiliaDate.getUTCDate()).padStart(2, '0');
  const month = String(brasiliaDate.getUTCMonth() + 1).padStart(2, '0');
  const year = brasiliaDate.getUTCFullYear();
  const hours = String(brasiliaDate.getUTCHours()).padStart(2, '0');
  const minutes = String(brasiliaDate.getUTCMinutes()).padStart(2, '0');
  
  return {
    date: `${day}/${month}/${year}`,
    time: `${hours}:${minutes}`,
    formatted: `${day}/${month}/${year} às ${hours}:${minutes}`,
  };
}

// Obter hora atual em Brasília
function getNowBrasilia(): Date {
  const now = new Date();
  // Retorna a data atual ajustada para comparação com Brasília
  return now;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = getNowBrasilia();
    console.log(`[notification-scheduler] Iniciando verificação às ${now.toISOString()}`);

    // Calcular janelas de tempo para as notificações
    // 24h antes: entre 23h e 25h no futuro
    const hours24From = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const hours24To = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // 3h antes: entre 2.5h e 3.5h no futuro
    const hours3From = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);
    const hours3To = new Date(now.getTime() + 3.5 * 60 * 60 * 1000);

    console.log(`[notification-scheduler] Janela 24h: ${hours24From.toISOString()} - ${hours24To.toISOString()}`);
    console.log(`[notification-scheduler] Janela 3h: ${hours3From.toISOString()} - ${hours3To.toISOString()}`);

    // Buscar agendamentos que precisam de notificação 24h antes
    const { data: appointments24h, error: error24h } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        status,
        client_name,
        confirmation_24h_sent_at,
        notification_3h_sent_at,
        client:clients(phone, name),
        barber:barbers(name),
        service:services(name)
      `)
      .gte('appointment_date', hours24From.toISOString())
      .lte('appointment_date', hours24To.toISOString())
      .neq('status', 'cancelled')
      .is('confirmation_24h_sent_at', null);

    if (error24h) {
      console.error('[notification-scheduler] Erro ao buscar agendamentos 24h:', error24h);
      throw error24h;
    }

    console.log(`[notification-scheduler] Encontrados ${appointments24h?.length || 0} agendamentos para notificação 24h`);

    // Buscar agendamentos que precisam de notificação 3h antes
    const { data: appointments3h, error: error3h } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        status,
        client_name,
        confirmation_24h_sent_at,
        notification_3h_sent_at,
        client:clients(phone, name),
        barber:barbers(name),
        service:services(name)
      `)
      .gte('appointment_date', hours3From.toISOString())
      .lte('appointment_date', hours3To.toISOString())
      .neq('status', 'cancelled')
      .is('notification_3h_sent_at', null);

    if (error3h) {
      console.error('[notification-scheduler] Erro ao buscar agendamentos 3h:', error3h);
      throw error3h;
    }

    console.log(`[notification-scheduler] Encontrados ${appointments3h?.length || 0} agendamentos para notificação 3h`);

    const notifications: Array<{
      appointment_id: string;
      nome: string;
      telefone: string;
      horario: string;
      tipo: 'confirmacao' | 'lembrete';
      profissional: string;
      servico: string;
      notification_field: 'confirmation_24h_sent_at' | 'notification_3h_sent_at';
    }> = [];

    // Processar notificações de 24h (sempre confirmação)
    for (const apt of appointments24h || []) {
      const client = apt.client as { phone?: string; name?: string } | null;
      const barber = apt.barber as { name?: string } | null;
      const service = apt.service as { name?: string } | null;
      
      if (!client?.phone) {
        console.log(`[notification-scheduler] Agendamento ${apt.id} sem telefone do cliente, ignorando`);
        continue;
      }

      const brasiliaTime = convertToBrasilia(apt.appointment_date);
      
      notifications.push({
        appointment_id: apt.id,
        nome: apt.client_name || client.name || 'Cliente',
        telefone: client.phone,
        horario: brasiliaTime.formatted,
        tipo: 'confirmacao',
        profissional: barber?.name || 'Profissional',
        servico: service?.name || 'Serviço',
        notification_field: 'confirmation_24h_sent_at',
      });
    }

    // Processar notificações de 3h (confirmação se pending, lembrete se confirmed)
    for (const apt of appointments3h || []) {
      const client = apt.client as { phone?: string; name?: string } | null;
      const barber = apt.barber as { name?: string } | null;
      const service = apt.service as { name?: string } | null;
      
      if (!client?.phone) {
        console.log(`[notification-scheduler] Agendamento ${apt.id} sem telefone do cliente, ignorando`);
        continue;
      }

      const brasiliaTime = convertToBrasilia(apt.appointment_date);
      
      // Se status é confirmed, envia lembrete. Se pending, envia confirmação
      const tipo = apt.status === 'confirmed' ? 'lembrete' : 'confirmacao';
      
      notifications.push({
        appointment_id: apt.id,
        nome: apt.client_name || client.name || 'Cliente',
        telefone: client.phone,
        horario: brasiliaTime.formatted,
        tipo,
        profissional: barber?.name || 'Profissional',
        servico: service?.name || 'Serviço',
        notification_field: 'notification_3h_sent_at',
      });
    }

    console.log(`[notification-scheduler] Total de ${notifications.length} notificações para enviar`);

    // Enviar notificações para o webhook
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const notification of notifications) {
      try {
        console.log(`[notification-scheduler] Enviando notificação para ${notification.telefone}: ${notification.tipo}`);
        
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome: notification.nome,
            telefone: notification.telefone,
            horario: notification.horario,
            tipo: notification.tipo,
            appointment_id: notification.appointment_id,
            profissional: notification.profissional,
            servico: notification.servico,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        // Marcar como enviado
        const updateData = {
          [notification.notification_field]: new Date().toISOString(),
        };
        
        const { error: updateError } = await supabase
          .from('appointments')
          .update(updateData)
          .eq('id', notification.appointment_id);

        if (updateError) {
          console.error(`[notification-scheduler] Erro ao atualizar ${notification.appointment_id}:`, updateError);
        } else {
          console.log(`[notification-scheduler] Notificação enviada e marcada: ${notification.appointment_id}`);
          results.sent++;
        }
      } catch (error) {
        console.error(`[notification-scheduler] Erro ao enviar notificação ${notification.appointment_id}:`, error);
        results.failed++;
        results.errors.push(`${notification.appointment_id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log(`[notification-scheduler] Concluído: ${results.sent} enviadas, ${results.failed} falharam`);

    return new Response(
      JSON.stringify({
        success: true,
        processed_at: now.toISOString(),
        notifications_sent: results.sent,
        notifications_failed: results.failed,
        errors: results.errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[notification-scheduler] Erro geral:', error);
    return new Response(
      JSON.stringify({
        error: 'Erro ao processar notificações',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
