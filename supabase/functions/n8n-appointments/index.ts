import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Converter datetime UTC para formatos de Brasília
function convertToBrasilia(utcDateStr: string) {
  const utcDate = new Date(utcDateStr);
  // Subtrair 3 horas para converter de UTC para Brasília
  const brasiliaMs = utcDate.getTime() - (3 * 60 * 60 * 1000);
  const brasiliaDate = new Date(brasiliaMs);
  
  const day = String(brasiliaDate.getUTCDate()).padStart(2, '0');
  const month = String(brasiliaDate.getUTCMonth() + 1).padStart(2, '0');
  const year = brasiliaDate.getUTCFullYear();
  const hours = String(brasiliaDate.getUTCHours()).padStart(2, '0');
  const minutes = String(brasiliaDate.getUTCMinutes()).padStart(2, '0');
  
  return {
    original_utc: utcDateStr,
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
    formatted: `${day}/${month}/${year} às ${hours}:${minutes}`,
    datetime_brasilia: `${year}-${month}-${day}T${hours}:${minutes}:00-03:00`
  };
}

interface RequestBody {
  action: 'getInfo' | 'getAvailableTimes' | 'createAppointment' | 'listAppointments' | 'cancelAppointment' | 'confirmAppointment';
  barbershop_id: string;
  barber_id?: string;
  service_id?: string;
  date?: string;
  time?: string;
  client_name?: string;
  client_phone?: string;
  appointment_id?: string;
}

// Map Portuguese field names to English
const fieldNameMap: Record<string, string> = {
  'ação': 'action',
  'Ação': 'action',
  'barbeiro_id': 'barber_id',
  'id_do_serviço': 'service_id',
  'id_servico': 'service_id',
  'data': 'date',
  'horario': 'time',
  'hora': 'time',
  'nome_cliente': 'client_name',
  'telefone_cliente': 'client_phone',
  'telefone_do_cliente': 'client_phone',
  'id_agendamento': 'appointment_id',
};

// Map Portuguese action names to English
const actionMap: Record<string, string> = {
  'obterinfo': 'getInfo',
  'obterinformacoes': 'getInfo',
  'obterhorariosdisnponiveis': 'getAvailableTimes',
  'obterhorariosdisponiveis': 'getAvailableTimes',
  'criaagendamento': 'createAppointment',
  'criaragendamento': 'createAppointment',
  'listaragendamentos': 'listAppointments',
  'listarcompromissos': 'listAppointments',
  'listadecompromissos': 'listAppointments',
  'cancelaragendamento': 'cancelAppointment',
  'cancelarcompromisso': 'cancelAppointment',
  'confirmaragendamento': 'confirmAppointment',
  'confirmar': 'confirmAppointment',
};

// Normalize the request body
function normalizeBody(rawBody: Record<string, unknown>): RequestBody {
  const normalized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(rawBody)) {
    // Remove tabs, spaces, and special characters from key
    const cleanKey = key.replace(/[\t\s]/g, '').toLowerCase();
    
    // Map Portuguese field names to English
    let englishKey = cleanKey;
    for (const [ptKey, enKey] of Object.entries(fieldNameMap)) {
      if (cleanKey === ptKey.toLowerCase().replace(/[\t\s]/g, '')) {
        englishKey = enKey;
        break;
      }
    }
    
    // If no mapping found, use original key (cleaned)
    if (englishKey === cleanKey) {
      // Try to find partial match
      const originalKey = key.replace(/[\t\s]/g, '');
      englishKey = originalKey;
    }
    
    // Trim string values to remove leading/trailing spaces
    const cleanValue = typeof value === 'string' ? value.trim() : value;
    normalized[englishKey] = cleanValue;
  }
  
  // Normalize the action value
  if (normalized.action && typeof normalized.action === 'string') {
    const cleanAction = (normalized.action as string).toLowerCase().replace(/[\t\s]/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mappedAction = actionMap[cleanAction];
    if (mappedAction) {
      normalized.action = mappedAction;
    }
  }
  
  // Normalize date format (convert 2025/12/02 to 2025-12-02)
  if (normalized.date && typeof normalized.date === 'string') {
    normalized.date = (normalized.date as string).replace(/\//g, '-');
  }
  
  // Se time estiver no formato ISO (contém 'T'), extrair data e hora
  if (normalized.time && typeof normalized.time === 'string') {
    const timeStr = normalized.time as string;
    
    // Verificar se é formato ISO: "2025-12-04T09:30:00" ou "2025-12-04T09:30:00.000Z"
    if (timeStr.includes('T')) {
      const [datePart, timePart] = timeStr.split('T');
      
      // Se date estiver vazio, usar a data do time
      if (!normalized.date || (normalized.date as string).trim() === '') {
        normalized.date = datePart;
      }
      
      // Extrair apenas HH:MM do time (remover segundos e timezone)
      normalized.time = timePart.substring(0, 5); // "09:30"
      
      console.log(`[normalizeBody] ISO time detectado - date: ${normalized.date}, time: ${normalized.time}`);
    }
  }
  
  return normalized as unknown as RequestBody;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawBody = await req.json();
    console.log('n8n-appointments raw request:', rawBody);
    
    const body = normalizeBody(rawBody);
    console.log('n8n-appointments normalized request:', body);

    const { action, barbershop_id } = body;

    // Validar barbershop_id
    if (!barbershop_id) {
      throw new Error('barbershop_id é obrigatório');
    }

    switch (action) {
      case 'getInfo': {
        // Buscar informações da barbearia, barbeiros e serviços
        const [barbershopResult, barbersResult, servicesResult] = await Promise.all([
          supabase.from('barbershops').select('*').eq('id', barbershop_id).single(),
          supabase.from('barbers').select('*').eq('barbershop_id', barbershop_id).eq('is_active', true),
          supabase.from('services').select('*').eq('barbershop_id', barbershop_id).eq('is_active', true),
        ]);

        if (barbershopResult.error) throw barbershopResult.error;
        if (barbersResult.error) throw barbersResult.error;
        if (servicesResult.error) throw servicesResult.error;

        return new Response(
          JSON.stringify({
            barbershop: barbershopResult.data,
            barbers: barbersResult.data,
            services: servicesResult.data,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getAvailableTimes': {
        const { barber_id, service_id, date } = body;
        
        // service_id agora é opcional - disponibilidade é por barbeiro
        if (!barber_id || !date) {
          throw new Error('barber_id e date são obrigatórios para getAvailableTimes');
        }

        console.log(`[getAvailableTimes] Buscando horários para barbeiro ${barber_id} na data ${date}`);

        // Validar que barbeiro pertence à barbearia
        const { data: barber, error: barberError } = await supabase
          .from('barbers')
          .select('*')
          .eq('id', barber_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (barberError || !barber) {
          throw new Error('Barbeiro não encontrado ou não pertence a esta barbearia');
        }

        // Duração padrão de 30 minutos se service_id não for fornecido
        let serviceDuration = 30;
        
        if (service_id) {
          // Validar que serviço pertence à barbearia
          const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('*')
            .eq('id', service_id)
            .eq('barbershop_id', barbershop_id)
            .single();

          if (serviceError || !service) {
            console.log(`[getAvailableTimes] Serviço ${service_id} não encontrado, usando duração padrão de 30 min`);
          } else {
            serviceDuration = service.duration_minutes;
          }
        }

        console.log(`[getAvailableTimes] Usando duração de ${serviceDuration} minutos`);

        // Buscar horários da barbearia
        const { data: barbershop, error: barbershopError } = await supabase
          .from('barbershops')
          .select('opening_time, closing_time, working_days')
          .eq('id', barbershop_id)
          .single();

        if (barbershopError || !barbershop) {
          throw new Error('Barbearia não encontrada');
        }

        // VERIFICAR SE O DIA ESTÁ BLOQUEADO PARA ESTE PROFISSIONAL
        const { data: blockedDay, error: blockedError } = await supabase
          .from('blocked_days')
          .select('id, reason')
          .eq('barbershop_id', barbershop_id)
          .eq('barber_id', barber_id)
          .eq('blocked_date', date)
          .maybeSingle();

        if (blockedDay) {
          console.log(`[getAvailableTimes] Dia ${date} bloqueado para barbeiro ${barber_id}: ${blockedDay.reason || 'sem motivo'}`);
          return new Response(
            JSON.stringify({ 
              available_times: [], 
              message: 'Todos os horários estão ocupados',
              blocked: true,
              reason: blockedDay.reason
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Verificar se a data é um dia de trabalho
        const dateObj = new Date(date + 'T00:00:00-03:00');
        const dayOfWeek = dateObj.getDay();
        
        console.log(`[getAvailableTimes] Dia da semana: ${dayOfWeek}, Dias de trabalho: ${barbershop.working_days}`);
        
        if (!barbershop.working_days.includes(dayOfWeek)) {
          console.log(`[getAvailableTimes] Dia ${dayOfWeek} não é dia de trabalho`);
          return new Response(
            JSON.stringify({ available_times: [], message: 'Dia não é dia de trabalho' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar agendamentos existentes para este barbeiro nesta data
        // IMPORTANTE: Usar timezone de Brasília (-03:00) e ignorar agendamentos cancelados
        const startOfDay = `${date}T00:00:00-03:00`;
        const endOfDay = `${date}T23:59:59-03:00`;

        console.log(`[getAvailableTimes] Buscando agendamentos entre ${startOfDay} e ${endOfDay}`);

        const { data: existingAppointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select('appointment_date, service_id, status')
          .eq('barber_id', barber_id)
          .gte('appointment_date', startOfDay)
          .lte('appointment_date', endOfDay)
          .neq('status', 'cancelled'); // IGNORAR AGENDAMENTOS CANCELADOS

        if (appointmentsError) throw appointmentsError;

        console.log(`[getAvailableTimes] Agendamentos encontrados (excluindo cancelados):`, 
          existingAppointments?.map(a => ({
            date: a.appointment_date,
            status: a.status
          }))
        );

        // Buscar duração dos serviços dos agendamentos existentes
        const serviceIds = [...new Set(existingAppointments?.map(a => a.service_id) || [])];
        let serviceDurations = new Map<string, number>();
        
        if (serviceIds.length > 0) {
          const { data: services, error: servicesError } = await supabase
            .from('services')
            .select('id, duration_minutes')
            .in('id', serviceIds);

          if (servicesError) throw servicesError;

          serviceDurations = new Map(services?.map(s => [s.id, s.duration_minutes]) || []);
        }

        // Gerar slots de tempo
        const [openHour, openMinute] = barbershop.opening_time.split(':').map(Number);
        const [closeHour, closeMinute] = barbershop.closing_time.split(':').map(Number);
        
        console.log(`[getAvailableTimes] Horário de funcionamento: ${openHour}:${openMinute} - ${closeHour}:${closeMinute}`);
        
        const slots: string[] = [];
        let currentHour = openHour;
        let currentMinute = openMinute;

        while (currentHour < closeHour || (currentHour === closeHour && currentMinute < closeMinute)) {
          const timeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          // Criar datetime com timezone de Brasília
          const slotDateTime = new Date(`${date}T${timeString}:00-03:00`);
          
          // Verificar se este slot conflita com algum agendamento existente
          const hasConflict = existingAppointments?.some(appointment => {
            const appointmentStart = new Date(appointment.appointment_date);
            const appointmentDuration = serviceDurations.get(appointment.service_id) || 30;
            const appointmentEnd = new Date(appointmentStart.getTime() + appointmentDuration * 60000);
            const slotEnd = new Date(slotDateTime.getTime() + serviceDuration * 60000);

            // Verifica se há sobreposição
            const overlaps = slotDateTime < appointmentEnd && slotEnd > appointmentStart;
            
            if (overlaps) {
              console.log(`[getAvailableTimes] Conflito detectado: slot ${timeString} conflita com agendamento às ${appointmentStart.toISOString()}`);
            }
            
            return overlaps;
          });

          if (!hasConflict) {
            // Verificar se o slot + duração do serviço cabe antes do horário de fechamento
            const slotEndHour = Math.floor((currentHour * 60 + currentMinute + serviceDuration) / 60);
            const slotEndMinute = (currentHour * 60 + currentMinute + serviceDuration) % 60;
            
            if (slotEndHour < closeHour || (slotEndHour === closeHour && slotEndMinute <= closeMinute)) {
              // NOVO: Verificar se o horário ainda não passou
              const now = new Date();
              
              if (slotDateTime > now) {
                slots.push(timeString);
              } else {
                console.log(`[getAvailableTimes] Slot ${timeString} ignorado - horário já passou`);
              }
            }
          }

          // Avançar 30 minutos
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentHour += 1;
            currentMinute = 0;
          }
        }

        console.log(`[getAvailableTimes] Slots disponíveis:`, slots);

        return new Response(
          JSON.stringify({ available_times: slots }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createAppointment': {
        const { barber_id, service_id, date, time, client_name, client_phone } = body;
        
        console.log('[createAppointment] Dados recebidos:', { barber_id, service_id, date, time, client_name, client_phone });
        
        if (!barber_id || !service_id || !date || !time || !client_name || !client_phone) {
          throw new Error('barber_id, service_id, date, time, client_name e client_phone são obrigatórios');
        }

        // Validar barbeiro
        const { data: barber, error: barberError } = await supabase
          .from('barbers')
          .select('*')
          .eq('id', barber_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (barberError || !barber) {
          throw new Error('Barbeiro não encontrado ou não pertence a esta barbearia');
        }

        // Validar serviço
        const { data: service, error: serviceError } = await supabase
          .from('services')
          .select('*')
          .eq('id', service_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (serviceError || !service) {
          throw new Error('Serviço não encontrado ou não pertence a esta barbearia');
        }

        // Buscar informações da barbearia para validações
        const { data: barbershop, error: barbershopError } = await supabase
          .from('barbershops')
          .select('opening_time, closing_time, working_days')
          .eq('id', barbershop_id)
          .single();

        if (barbershopError || !barbershop) {
          throw new Error('Barbearia não encontrada');
        }

        // VALIDAÇÃO 1: Data/horário passado
        const now = new Date();
        const appointmentDateTime = `${date}T${time}:00-03:00`;
        const appointmentStart = new Date(appointmentDateTime);
        
        if (appointmentStart < now) {
          throw new Error('Não é possível agendar em datas/horários passados');
        }

        // VALIDAÇÃO 2: Dia de trabalho
        const dateObj = new Date(date + 'T00:00:00-03:00');
        const dayOfWeek = dateObj.getDay();
        
        if (!barbershop.working_days.includes(dayOfWeek)) {
          const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
          throw new Error(`Barbearia não funciona ${diasSemana[dayOfWeek]}`);
        }

        // VALIDAÇÃO 3: Horário de expediente
        const [openHour, openMinute] = barbershop.opening_time.split(':').map(Number);
        const [closeHour, closeMinute] = barbershop.closing_time.split(':').map(Number);
        const [timeHour, timeMinute] = time.split(':').map(Number);

        const timeInMinutes = timeHour * 60 + timeMinute;
        const openInMinutes = openHour * 60 + openMinute;
        const closeInMinutes = closeHour * 60 + closeMinute;
        const serviceEndInMinutes = timeInMinutes + service.duration_minutes;

        if (timeInMinutes < openInMinutes || serviceEndInMinutes > closeInMinutes) {
          throw new Error(`Horário fora do expediente (${barbershop.opening_time} - ${barbershop.closing_time})`);
        }

        // Buscar ou criar cliente
        let client_id: string;

        const { data: existingClient, error: clientSearchError } = await supabase
          .from('clients')
          .select('id')
          .eq('barbershop_id', barbershop_id)
          .eq('phone', client_phone)
          .maybeSingle();

        if (clientSearchError) {
          console.error('[createAppointment] Erro ao buscar cliente:', clientSearchError);
          throw clientSearchError;
        }

        if (existingClient) {
          console.log('[createAppointment] Cliente existente encontrado:', existingClient.id);
          client_id = existingClient.id;
        } else {
          console.log('[createAppointment] Criando novo cliente...');
          // Criar novo cliente
          const { data: newClient, error: clientCreateError } = await supabase
            .from('clients')
            .insert({
              barbershop_id,
              name: client_name,
              phone: client_phone,
              total_visits: 0
            })
            .select('id')
            .single();

          if (clientCreateError) {
            console.error('[createAppointment] Erro ao criar cliente:', clientCreateError);
            throw clientCreateError;
          }
          console.log('[createAppointment] Cliente criado:', newClient.id);
          client_id = newClient.id;
        }

        // Verificar conflito de horário
        const appointmentEnd = new Date(appointmentStart.getTime() + service.duration_minutes * 60000);

        console.log(`[createAppointment] Verificando conflitos para ${appointmentDateTime}`);

        // IMPORTANTE: Usar timezone de Brasília e ignorar agendamentos cancelados
        const startOfDay = `${date}T00:00:00-03:00`;
        const endOfDay = `${date}T23:59:59-03:00`;

        const { data: conflicts, error: conflictError } = await supabase
          .from('appointments')
          .select('id, appointment_date, service_id, status')
          .eq('barber_id', barber_id)
          .gte('appointment_date', startOfDay)
          .lte('appointment_date', endOfDay)
          .neq('status', 'cancelled'); // IGNORAR AGENDAMENTOS CANCELADOS

        if (conflictError) throw conflictError;

        console.log(`[createAppointment] Agendamentos existentes (excluindo cancelados):`, 
          conflicts?.map(c => ({
            id: c.id,
            date: c.appointment_date,
            status: c.status
          }))
        );

        // Buscar durações dos serviços dos conflitos
        if (conflicts && conflicts.length > 0) {
          const serviceIds = [...new Set(conflicts.map(c => c.service_id))];
          const { data: services, error: servicesError } = await supabase
            .from('services')
            .select('id, duration_minutes')
            .in('id', serviceIds);

          if (servicesError) throw servicesError;

          const serviceDurations = new Map(services?.map(s => [s.id, s.duration_minutes]) || []);

          const hasConflict = conflicts.some(conflict => {
            const conflictStart = new Date(conflict.appointment_date);
            const conflictDuration = serviceDurations.get(conflict.service_id) || 30;
            const conflictEnd = new Date(conflictStart.getTime() + conflictDuration * 60000);

            const overlaps = appointmentStart < conflictEnd && appointmentEnd > conflictStart;
            
            if (overlaps) {
              console.log(`[createAppointment] Conflito detectado com agendamento ${conflict.id} às ${conflict.appointment_date}`);
            }
            
            return overlaps;
          });

          if (hasConflict) {
            throw new Error('Horário não disponível - já existe um agendamento neste horário');
          }
        }

        // Criar agendamento COM o nome do cliente específico para este agendamento
        console.log('[createAppointment] Criando agendamento com client_id:', client_id);
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .insert({
            barbershop_id,
            barber_id,
            client_id,
            service_id,
            appointment_date: appointmentDateTime,
            status: 'pending',
            client_name: client_name,
          })
          .select('*')
          .single();

        if (appointmentError) {
          console.error('[createAppointment] Erro ao criar agendamento:', appointmentError);
          throw appointmentError;
        }

        console.log('[createAppointment] Agendamento criado:', appointment);

        // Agendar envio do lembrete para 5 minutos depois (em background)
        const reminderData = {
          client_name,
          client_phone,
          date,
          time,
        };
        
        const sendDelayedReminder = async () => {
          try {
            // Esperar 5 minutos (300000 ms)
            await new Promise(resolve => setTimeout(resolve, 300000));
            
            const [year, month, day] = reminderData.date.split('-');
            await fetch('https://n8n-n8n.knceh1.easypanel.host/webhook/lembrete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                nome: reminderData.client_name,
                telefone: reminderData.client_phone,
                horario: `${day}/${month}/${year} às ${reminderData.time}`,
              }),
            });
            console.log('[createAppointment] Lembrete enviado após 5 minutos');
          } catch (webhookError) {
            console.error('[createAppointment] Erro ao enviar lembrete:', webhookError);
          }
        };
        
        // @ts-ignore - EdgeRuntime.waitUntil é disponível em Supabase Edge Functions
        EdgeRuntime.waitUntil(sendDelayedReminder());
        console.log('[createAppointment] Lembrete agendado para 5 minutos');

        // Converter horário do agendamento criado para Brasília
        const brasiliaTime = convertToBrasilia(appointment.appointment_date);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            appointment: {
              ...appointment,
              appointment_date_utc: appointment.appointment_date,
              appointment_date: brasiliaTime.formatted,
              appointment_time: brasiliaTime.time,
              appointment_date_iso: brasiliaTime.date
            },
            message: 'Agendamento criado com sucesso'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listAppointments': {
        const { client_phone } = body;
        
        if (!client_phone) {
          throw new Error('client_phone é obrigatório para listAppointments');
        }

        // Buscar cliente pelo telefone
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('barbershop_id', barbershop_id)
          .eq('phone', client_phone)
          .maybeSingle();

        if (clientError) throw clientError;

        if (!client) {
          return new Response(
            JSON.stringify({ appointments: [] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Buscar agendamentos do cliente
        const { data: appointments, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            barber:barbers(name),
            service:services(name, price, duration_minutes)
          `)
          .eq('client_id', client.id)
          .eq('barbershop_id', barbershop_id)
          .order('appointment_date', { ascending: true });

        if (appointmentsError) throw appointmentsError;

        // Converter horários UTC para Brasília usando helper
        const appointmentsWithBrasiliaTime = (appointments || []).map(apt => {
          const brasilia = convertToBrasilia(apt.appointment_date);
          
          return {
            ...apt,
            appointment_date_utc: apt.appointment_date,
            appointment_date: brasilia.formatted,
            appointment_date_brasilia: brasilia.formatted,
            appointment_time: brasilia.time,
            appointment_date_formatted: brasilia.date.split('-').reverse().join('/')
          };
        });

        return new Response(
          JSON.stringify({ appointments: appointmentsWithBrasiliaTime }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancelAppointment': {
        const { appointment_id } = body;
        
        if (!appointment_id) {
          throw new Error('appointment_id é obrigatório para cancelAppointment');
        }

        // Verificar se o agendamento existe e pertence à barbearia
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointment_id)
          .eq('barbershop_id', barbershop_id)
          .single();

        if (appointmentError || !appointment) {
          throw new Error('Agendamento não encontrado');
        }

        // Atualizar status para cancelled
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointment_id);

        if (updateError) throw updateError;

        console.log('[cancelAppointment] Agendamento cancelado:', appointment_id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Agendamento cancelado com sucesso'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'confirmAppointment': {
        const { appointment_id, client_phone, date, time } = body;
        
        console.log('[confirmAppointment] Dados recebidos:', { appointment_id, client_phone, date, time });

        let appointmentToConfirm;

        if (appointment_id) {
          // Buscar por appointment_id
          const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', appointment_id)
            .eq('barbershop_id', barbershop_id)
            .single();

          if (error || !data) {
            throw new Error('Agendamento não encontrado');
          }
          appointmentToConfirm = data;
        } else if (client_phone && date && time) {
          // Buscar por client_phone + date + time
          const appointmentDateTime = `${date}T${time}:00-03:00`;
          
          // Primeiro buscar o cliente pelo telefone
          const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('id')
            .eq('barbershop_id', barbershop_id)
            .eq('phone', client_phone)
            .maybeSingle();

          if (clientError) throw clientError;
          
          if (!client) {
            throw new Error('Cliente não encontrado com este telefone');
          }

          // Buscar agendamento do cliente nesta data/hora
          const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('client_id', client.id)
            .eq('barbershop_id', barbershop_id)
            .eq('appointment_date', appointmentDateTime)
            .single();

          if (error || !data) {
            throw new Error('Agendamento não encontrado para este cliente nesta data/hora');
          }
          appointmentToConfirm = data;
        } else {
          throw new Error('appointment_id OU (client_phone + date + time) são obrigatórios');
        }

        // Verificar se já não está confirmado
        if (appointmentToConfirm.status === 'confirmed') {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Agendamento já estava confirmado',
              appointment: appointmentToConfirm
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Atualizar status para confirmed
        const { data: updatedAppointment, error: updateError } = await supabase
          .from('appointments')
          .update({ status: 'confirmed' })
          .eq('id', appointmentToConfirm.id)
          .select('*')
          .single();

        if (updateError) throw updateError;

        console.log('[confirmAppointment] Agendamento confirmado:', appointmentToConfirm.id);

        // Converter horário para Brasília
        const brasiliaTime = convertToBrasilia(updatedAppointment.appointment_date);

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Agendamento confirmado com sucesso',
            appointment: {
              ...updatedAppointment,
              appointment_date_formatted: brasiliaTime.formatted,
              appointment_time: brasiliaTime.time,
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Ação não reconhecida: ${action || 'indefinida'}`);
    }
  } catch (error) {
    console.error('n8n-appointments error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: 'Solicitação inválida - verifique seus parâmetros.',
        details: errorMessage 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
