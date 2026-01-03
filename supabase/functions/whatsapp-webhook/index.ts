import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZapiWebhook {
  instanceId: string;
  messageId: string;
  phone: string;
  fromMe: boolean;
  momment: number;
  status: string;
  chatName: string;
  senderName: string;
  photo: string;
  broadcast: boolean;
  participantPhone?: string;
  text?: {
    message: string;
  };
  image?: { imageUrl: string; caption?: string };
  audio?: { audioUrl: string };
  video?: { videoUrl: string; caption?: string };
  document?: { documentUrl: string; fileName: string };
}

async function sendZapiMessage(phone: string, message: string) {
  const ZAPI_BASE_URL = Deno.env.get('ZAPI_BASE_URL');
  const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
  const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
  const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN');

  const url = `${ZAPI_BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;
  
  console.log('[Z-API] Sending message to:', phone);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': ZAPI_CLIENT_TOKEN!
    },
    body: JSON.stringify({
      phone: phone,
      message: message
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Z-API] Send error:', errorText);
    throw new Error(`Z-API send failed: ${errorText}`);
  }
  
  const result = await response.json();
  console.log('[Z-API] Message sent successfully:', result);
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZAPI_BASE_URL = Deno.env.get('ZAPI_BASE_URL');
    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
    const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    console.log('[WhatsApp] Environment check:', {
      hasZapiBaseUrl: !!ZAPI_BASE_URL,
      hasZapiInstanceId: !!ZAPI_INSTANCE_ID,
      hasZapiToken: !!ZAPI_TOKEN,
      hasZapiClientToken: !!ZAPI_CLIENT_TOKEN,
      hasLovableKey: !!LOVABLE_API_KEY
    });

    if (!ZAPI_BASE_URL || !ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN || !LOVABLE_API_KEY) {
      const missing = [];
      if (!ZAPI_BASE_URL) missing.push('ZAPI_BASE_URL');
      if (!ZAPI_INSTANCE_ID) missing.push('ZAPI_INSTANCE_ID');
      if (!ZAPI_TOKEN) missing.push('ZAPI_TOKEN');
      if (!ZAPI_CLIENT_TOKEN) missing.push('ZAPI_CLIENT_TOKEN');
      if (!LOVABLE_API_KEY) missing.push('LOVABLE_API_KEY');
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const zapiPayload: ZapiWebhook = await req.json();

    console.log('[WhatsApp] Received Z-API webhook:', JSON.stringify(zapiPayload, null, 2));

    // Ignore messages from the bot itself
    if (zapiPayload.fromMe) {
      return new Response(JSON.stringify({ status: 'ignored', reason: 'message from bot' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract phone number and message
    const phoneNumber = zapiPayload.phone.replace(/\D/g, '');
    const userMessage = zapiPayload.text?.message || '';
    const pushName = zapiPayload.senderName || zapiPayload.chatName || 'Cliente';

    console.log('[WhatsApp] Processing message from:', phoneNumber, '- Message:', userMessage);

    // Find or create profile
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phoneNumber)
      .maybeSingle();

    if (!profile) {
      console.log('[WhatsApp] Creating new profile for:', phoneNumber);
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        phone: phoneNumber,
        phone_confirm: true,
        user_metadata: { full_name: pushName }
      });

      if (userError) throw userError;

      profile = { id: newUser.user.id, phone: phoneNumber, full_name: pushName };
    }

    // Get barbershop (assuming first one for now)
    const { data: barbershop } = await supabase
      .from('barbershops')
      .select('*')
      .limit(1)
      .single();

    if (!barbershop) {
      throw new Error('No barbershop found');
    }

    // Find or create conversation
    let { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('barbershop_id', barbershop.id)
      .maybeSingle();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('whatsapp_conversations')
        .insert({
          phone_number: phoneNumber,
          profile_id: profile.id,
          barbershop_id: barbershop.id,
          conversation_state: { messages_history: [] }
        })
        .select()
        .single();
      conversation = newConv;
    }

    // Get conversation history
    const messagesHistory = conversation.conversation_state?.messages_history || [];
    messagesHistory.push({ role: 'user', content: userMessage });

    // Fetch services and barbers for context
    const { data: services } = await supabase
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true);

    const { data: barbers } = await supabase
      .from('barbers')
      .select('id, name, specialty')
      .eq('barbershop_id', barbershop.id)
      .eq('is_active', true);

    // Build AI prompt
    const systemPrompt = `Você é um assistente de agendamentos para a barbearia "${barbershop.name}".

REGRAS IMPORTANTES:
1. Seja cordial, profissional e objetivo
2. Pergunte APENAS um dado por vez
3. Use emojis moderadamente (1-2 por mensagem)
4. Sempre confirme todos os dados antes de criar agendamento
5. Formate datas como DD/MM/YYYY e horários como HH:MM

SERVIÇOS DISPONÍVEIS:
${services?.map(s => `- ${s.name}: R$ ${s.price} (${s.duration_minutes}min)`).join('\n') || 'Nenhum serviço disponível'}

BARBEIROS DISPONÍVEIS:
${barbers?.map(b => `- ${b.name}${b.specialty ? ' - ' + b.specialty : ''}`).join('\n') || 'Nenhum barbeiro disponível'}

FLUXO DE AGENDAMENTO:
1. Cumprimentar e perguntar qual serviço deseja
2. Perguntar qual barbeiro prefere
3. Perguntar data preferida (formato: DD/MM/YYYY)
4. Usar a ferramenta get_available_times para buscar horários
5. Apresentar horários disponíveis
6. Confirmar todos os dados
7. Usar a ferramenta create_appointment para finalizar

COMANDOS ESPECIAIS:
- Se cliente disser "AJUDA" ou "HELP": Liste os comandos disponíveis
- Se cliente disser "MEUS AGENDAMENTOS": Use get_client_appointments
- Se cliente disser "CANCELAR": Pergunte qual agendamento cancelar

Responda de forma natural e humana. Nunca mencione que é uma IA.`;

    // Define tools for AI
    const tools = [
      {
        type: "function",
        name: "get_available_times",
        description: "Busca horários disponíveis para uma data, barbeiro e serviço específicos",
        parameters: {
          type: "object",
          properties: {
            date: { type: "string", description: "Data no formato YYYY-MM-DD" },
            barber_id: { type: "string", description: "ID do barbeiro" },
            service_id: { type: "string", description: "ID do serviço" }
          },
          required: ["date", "barber_id", "service_id"]
        }
      },
      {
        type: "function",
        name: "create_appointment",
        description: "Cria um agendamento após confirmação do cliente",
        parameters: {
          type: "object",
          properties: {
            service_id: { type: "string" },
            barber_id: { type: "string" },
            appointment_date: { type: "string", description: "Data e hora no formato ISO 8601" }
          },
          required: ["service_id", "barber_id", "appointment_date"]
        }
      },
      {
        type: "function",
        name: "get_client_appointments",
        description: "Busca agendamentos futuros do cliente",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    ];

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messagesHistory
        ],
        tools,
        tool_choice: 'auto'
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[WhatsApp] AI Error:', errorText);
      throw new Error(`AI request failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('[WhatsApp] AI Response:', JSON.stringify(aiData, null, 2));

    let responseMessage = aiData.choices[0].message.content || 'Desculpe, não entendi. Pode repetir?';
    const toolCalls = aiData.choices[0].message.tool_calls;

    // Execute tool calls if any
    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log('[WhatsApp] Executing tool:', functionName, args);

        if (functionName === 'get_available_times') {
          // Get service duration and barbershop info
          const [{ data: service }, { data: barbershopData }] = await Promise.all([
            supabase.from('services').select('duration_minutes').eq('id', args.service_id).single(),
            supabase.from('barbershops').select('opening_time, closing_time, working_days').eq('id', barbershop.id).single()
          ]);

          const selectedDate = new Date(args.date + 'T00:00:00');
          const dayOfWeek = selectedDate.getDay();
          
          // Check if it's a working day (0 = Sunday, 1 = Monday, etc.)
          if (!barbershopData?.working_days.includes(dayOfWeek)) {
            responseMessage = `Desculpe, não atendemos aos ${['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'][dayOfWeek]}. Escolha outra data.`;
          } else {
            // Get existing appointments for the barber on this date
            const startOfDay = args.date + 'T00:00:00';
            const endOfDay = args.date + 'T23:59:59';
            
            const { data: existingAppointments } = await supabase
              .from('appointments')
              .select('appointment_date, services(duration_minutes)')
              .eq('barber_id', args.barber_id)
              .gte('appointment_date', startOfDay)
              .lte('appointment_date', endOfDay)
              .neq('status', 'cancelled');

            // Generate available time slots
            const serviceDuration = service?.duration_minutes || 60;
            const [openHour, openMin] = (barbershopData?.opening_time || '09:00:00').split(':').map(Number);
            const [closeHour, closeMin] = (barbershopData?.closing_time || '18:00:00').split(':').map(Number);
            
            const availableTimes: string[] = [];
            let currentTime = new Date(args.date + `T${String(openHour).padStart(2, '0')}:${String(openMin).padStart(2, '0')}:00`);
            const closingTime = new Date(args.date + `T${String(closeHour).padStart(2, '0')}:${String(closeMin).padStart(2, '0')}:00`);
            
            while (currentTime < closingTime) {
              const slotEnd = new Date(currentTime.getTime() + serviceDuration * 60000);
              
              // Check if slot conflicts with existing appointments
              const hasConflict = existingAppointments?.some((apt: any) => {
                const aptStart = new Date(apt.appointment_date);
                const aptEnd = new Date(aptStart.getTime() + (apt.services?.duration_minutes || 60) * 60000);
                return (currentTime < aptEnd && slotEnd > aptStart);
              });
              
              if (!hasConflict && slotEnd <= closingTime) {
                availableTimes.push(currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
              }
              
              currentTime = new Date(currentTime.getTime() + 30 * 60000); // 30-minute intervals
            }
            
            if (availableTimes.length === 0) {
              responseMessage = `Desculpe, não há horários disponíveis para ${selectedDate.toLocaleDateString('pt-BR')}. Tente outra data.`;
            } else {
              responseMessage += `\n\n📅 Horários disponíveis para ${selectedDate.toLocaleDateString('pt-BR')}:\n`;
              availableTimes.slice(0, 10).forEach((time: string, i: number) => {
                responseMessage += `${i + 1}. ${time}\n`;
              });
              responseMessage += '\nDigite o horário desejado (ex: 14:00)';
            }
          }
        }
        
        else if (functionName === 'create_appointment') {
          // Get service and barber details
          const [{ data: service }, { data: barber }] = await Promise.all([
            supabase.from('services').select('name, price, duration_minutes').eq('id', args.service_id).single(),
            supabase.from('barbers').select('name').eq('id', args.barber_id).single()
          ]);

          // Find or create client record
          let { data: client } = await supabase
            .from('clients')
            .select('id')
            .eq('profile_id', profile.id)
            .eq('barbershop_id', barbershop.id)
            .maybeSingle();

          if (!client) {
            const { data: newClient, error: clientError } = await supabase
              .from('clients')
              .insert({
                barbershop_id: barbershop.id,
                profile_id: profile.id,
                name: profile.full_name,
                phone: phoneNumber,
                total_visits: 0
              })
              .select()
              .single();

            if (clientError) {
              console.error('[WhatsApp] Error creating client:', clientError);
              responseMessage = 'Desculpe, houve um erro ao processar seu agendamento. Tente novamente.';
              continue;
            }
            client = newClient;
          }

          // Ensure client exists
          if (!client) {
            responseMessage = 'Desculpe, houve um erro ao identificar seu cadastro. Tente novamente.';
            continue;
          }

          // Check for conflicts
          const appointmentDate = new Date(args.appointment_date);
          const endDate = new Date(appointmentDate.getTime() + (service?.duration_minutes || 60) * 60000);
          
          const { data: conflicts } = await supabase
            .from('appointments')
            .select('id, appointment_date, services(duration_minutes)')
            .eq('barber_id', args.barber_id)
            .gte('appointment_date', appointmentDate.toISOString())
            .lte('appointment_date', endDate.toISOString())
            .neq('status', 'cancelled');

          if (conflicts && conflicts.length > 0) {
            responseMessage = 'Desculpe, este horário já foi ocupado. Por favor, escolha outro horário.';
            continue;
          }

          // Create appointment in database
          const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .insert({
              barbershop_id: barbershop.id,
              barber_id: args.barber_id,
              client_id: client.id,
              service_id: args.service_id,
              appointment_date: appointmentDate.toISOString(),
              status: 'confirmed',
              paid_amount: service?.price
            })
            .select()
            .single();

          if (aptError) {
            console.error('[WhatsApp] Error creating appointment:', aptError);
            responseMessage = 'Desculpe, houve um erro ao criar o agendamento. Tente novamente.';
          } else {
            console.log('[WhatsApp] Appointment created:', appointment.id);
            
            const aptDate = new Date(args.appointment_date);
            responseMessage = `✅ *Agendamento Confirmado!*

📋 Resumo:
• Serviço: ${service?.name}
• Barbeiro: ${barber?.name}
• Data: ${aptDate.toLocaleDateString('pt-BR')}
• Horário: ${aptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
• Valor: R$ ${service?.price}

📍 Local: ${barbershop.name}
${barbershop.address || ''}

Seu agendamento foi adicionado à agenda! 💈

Para ver seus agendamentos, envie: MEUS AGENDAMENTOS
Para cancelar, envie: CANCELAR`;
          }
        }
        
        else if (functionName === 'get_client_appointments') {
          const { data: client } = await supabase
            .from('clients')
            .select('id')
            .eq('profile_id', profile.id)
            .eq('barbershop_id', barbershop.id)
            .maybeSingle();

          if (!client) {
            responseMessage = 'Você ainda não tem agendamentos.';
          } else {
            const { data: appointments } = await supabase
              .from('appointments')
              .select(`
                *,
                services(name, price),
                barbers(name)
              `)
              .eq('client_id', client.id)
              .gte('appointment_date', new Date().toISOString())
              .order('appointment_date');

            if (!appointments || appointments.length === 0) {
              responseMessage = 'Você não tem agendamentos futuros. Quer agendar agora?';
            } else {
              responseMessage = '📅 *Seus Agendamentos*\n\n';
              appointments.forEach((apt, i) => {
                const aptDate = new Date(apt.appointment_date);
                responseMessage += `${i + 1}. ${aptDate.toLocaleDateString('pt-BR')} às ${aptDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n`;
                responseMessage += `   ${apt.services.name} - ${apt.barbers.name}\n`;
                responseMessage += `   Status: ${apt.status === 'pending' ? '⏳ Pendente' : '✅ Confirmado'}\n\n`;
              });
              responseMessage += '\nPara cancelar, envie: CANCELAR [número]';
            }
          }
        }
      }
    }

    // Update conversation history
    messagesHistory.push({ role: 'assistant', content: responseMessage });
    
    await supabase
      .from('whatsapp_conversations')
      .update({
        conversation_state: { messages_history: messagesHistory.slice(-20) }, // Keep last 20 messages
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversation.id);

    // Send response via Z-API
    await sendZapiMessage(phoneNumber, responseMessage);

    console.log('[WhatsApp] Message sent successfully to:', phoneNumber);

    return new Response(
      JSON.stringify({ 
        status: 'success',
        message: 'Message processed and response sent'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[WhatsApp] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});