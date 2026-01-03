import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format, addMinutes, parse, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";

export default function ClientBooking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [barbershop, setBarbershop] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedBarber, setSelectedBarber] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedDate && selectedBarber && selectedService) {
      generateAvailableTimes();
    }
  }, [selectedDate, selectedBarber, selectedService]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Get user's barbershop link
      const { data: linkData } = await supabase
        .from("client_barbershop")
        .select("barbershop_id")
        .eq("profile_id", user.id)
        .single();

      if (!linkData) {
        toast.error("Você não está vinculado a nenhuma clínica");
        return;
      }

      // Load barbershop details
      const { data: barbershopData } = await supabase
        .from("barbershops")
        .select("*")
        .eq("id", linkData.barbershop_id)
        .single();
      
      setBarbershop(barbershopData);

      if (barbershopData) {
        // Load services - filter explicitly by barbershop_id
        const { data: servicesData, error: servicesError } = await supabase
          .from("services")
          .select("*")
          .eq("barbershop_id", linkData.barbershop_id)
          .eq("is_active", true)
          .order("name");

        if (servicesError) {
          console.error("Error loading services:", servicesError);
          toast.error("Erro ao carregar procedimentos");
        } else {
          console.log("Services loaded:", servicesData?.length || 0);
          setServices(servicesData || []);
        }

        // Load specialists - filter explicitly by barbershop_id
        const { data: barbersData, error: barbersError } = await supabase
          .from("barbers")
          .select("*")
          .eq("barbershop_id", linkData.barbershop_id)
          .eq("is_active", true)
          .order("name");

        if (barbersError) {
          console.error("Error loading specialists:", barbersError);
          toast.error("Erro ao carregar especialistas");
        } else {
          console.log("Specialists loaded:", barbersData?.length || 0);
          setBarbers(barbersData || []);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar dados");
    }
  };

  const generateAvailableTimes = async () => {
    if (!selectedDate || !selectedBarber || !selectedService || !barbershop) return;

    const dayOfWeek = selectedDate.getDay();
    
    // Check if barbershop is open on this day
    if (!barbershop.working_days.includes(dayOfWeek)) {
      setAvailableTimes([]);
      return;
    }

    // VERIFICAR SE O DIA ESTÁ BLOQUEADO PARA ESTE PROFISSIONAL
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data: blockedDay } = await supabase
      .from("blocked_days")
      .select("id, reason")
      .eq("barbershop_id", barbershop.id)
      .eq("barber_id", selectedBarber.id)
      .eq("blocked_date", dateStr)
      .maybeSingle();

    if (blockedDay) {
      setAvailableTimes([]);
      toast.info(`Profissional indisponível neste dia${blockedDay.reason ? `: ${blockedDay.reason}` : ''}`);
      return;
    }

    // Parse opening and closing times
    // Sábado (6) pode ter horário especial configurado
    const isSaturday = dayOfWeek === 6;
    const openingTimeStr = isSaturday && barbershop.saturday_opening_time 
      ? barbershop.saturday_opening_time 
      : barbershop.opening_time;
    const closingTimeStr = isSaturday && barbershop.saturday_closing_time 
      ? barbershop.saturday_closing_time 
      : barbershop.closing_time;
    
    const openingTime = parse(openingTimeStr, "HH:mm:ss", selectedDate);
    const closingTime = parse(closingTimeStr, "HH:mm:ss", selectedDate);

    // Get existing appointments for this barber on this date
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: existingAppointments } = await supabase
      .from("appointments")
      .select("appointment_date, services(duration_minutes)")
      .eq("barber_id", selectedBarber.id)
      .gte("appointment_date", startOfDay.toISOString())
      .lte("appointment_date", endOfDay.toISOString())
      .neq("status", "cancelled");

    // Generate time slots
    const slots: string[] = [];
    let currentTime = openingTime;

    while (currentTime < closingTime) {
      const timeStr = format(currentTime, "HH:mm");
      
      // Check if this slot is available
      const isAvailable = !existingAppointments?.some((apt) => {
        const aptTime = new Date(apt.appointment_date);
        const aptEndTime = addMinutes(aptTime, apt.services.duration_minutes);
        const slotEndTime = addMinutes(currentTime, selectedService.duration_minutes);
        
        return (
          (currentTime >= aptTime && currentTime < aptEndTime) ||
          (slotEndTime > aptTime && slotEndTime <= aptEndTime)
        );
      });

      if (isAvailable) {
        // Don't show past times for today
        const now = new Date();
        const slotDateTime = setHours(setMinutes(selectedDate, parseInt(timeStr.split(':')[1])), parseInt(timeStr.split(':')[0]));
        
        if (slotDateTime > now) {
          slots.push(timeStr);
        }
      }

      currentTime = addMinutes(currentTime, 30); // 30-minute intervals
    }

    setAvailableTimes(slots);
  };

  const handleCreateAppointment = async () => {
    if (isSubmitting) return;
    
    if (!user || !selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      // Buscar o client_id, nome e telefone da tabela clients
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name, phone")
        .eq("profile_id", user.id)
        .eq("barbershop_id", barbershop.id)
        .maybeSingle();

      if (clientError) throw clientError;

      if (!clientData) {
        toast.error("Você não está cadastrado como paciente nesta clínica");
        return;
      }

      const [hours, minutes] = selectedTime.split(':');
      const appointmentDateTime = setHours(setMinutes(selectedDate, parseInt(minutes)), parseInt(hours));
      
      // Formatar com timezone de Brasília
      const year = appointmentDateTime.getFullYear();
      const month = String(appointmentDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(appointmentDateTime.getDate()).padStart(2, '0');
      const hour = String(appointmentDateTime.getHours()).padStart(2, '0');
      const minute = String(appointmentDateTime.getMinutes()).padStart(2, '0');
      const appointmentDateTimeString = `${year}-${month}-${day}T${hour}:${minute}:00-03:00`;

      // Verificar se já existe agendamento no mesmo horário (não cancelado)
      // Usar intervalo de 1 minuto em UTC para garantir comparação correta de timezone
      const startRange = appointmentDateTime.toISOString();
      const endRange = addMinutes(appointmentDateTime, 1).toISOString();

      const { data: conflictingAppointment } = await supabase
        .from("appointments")
        .select("id")
        .eq("barber_id", selectedBarber.id)
        .gte("appointment_date", startRange)
        .lt("appointment_date", endRange)
        .neq("status", "cancelled")
        .maybeSingle();

      if (conflictingAppointment) {
        toast.error("Este horário já foi reservado. Por favor, escolha outro horário.");
        setSelectedTime("");
        setStep(3);
        generateAvailableTimes();
        setLoading(false);
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("appointments").insert({
        barbershop_id: barbershop.id,
        barber_id: selectedBarber.id,
        client_id: clientData.id,
        service_id: selectedService.id,
        appointment_date: appointmentDateTimeString,
        notes,
        status: "pending",
        client_name: clientData.name,
      });

      if (error) throw error;

      // Agendar envio do lembrete para 5 minutos depois
      const reminderData = {
        nome: clientData.name,
        telefone: clientData.phone,
        horario: `${day}/${month}/${year} às ${hour}:${minute}`,
      };
      
      setTimeout(async () => {
        try {
          await fetch('https://n8n-n8n.knceh1.easypanel.host/webhook/lembrete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(reminderData),
          });
          console.log('Lembrete enviado após 5 minutos');
        } catch (webhookError) {
          console.error('Erro ao enviar lembrete:', webhookError);
        }
      }, 300000); // 5 minutos em milissegundos
      
      console.log('Lembrete agendado para 5 minutos');

      toast.success("Consulta agendada com sucesso!");
      navigate("/client/appointments");
    } catch (error) {
      console.error("Error creating appointment:", error);
      toast.error("Erro ao criar consulta");
    } finally {
      setLoading(false);
      setTimeout(() => setIsSubmitting(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-medium mb-1">Novo Agendamento</h1>
        <p className="text-sm text-muted-foreground">Siga os passos para agendar seu horário</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center w-8 h-8 text-sm rounded-full ${
                step >= s ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 4 && (
              <div className={`flex-1 h-0.5 mx-2 ${step > s ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Service */}
      {step === 1 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Escolha o Serviço</h2>
          {services.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                <p>Nenhum serviço disponível no momento.</p>
                <p className="mt-1">Entre em contato conosco.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className={`cursor-pointer transition-all hover:shadow-md p-0 ${
                    selectedService?.id === service.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => {
                    setSelectedService(service);
                    setStep(2);
                  }}
                >
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm font-medium">{service.name}</CardTitle>
                    <CardDescription className="text-xs">{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold">R$ {Number(service.price).toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground">{service.duration_minutes} min</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select Specialist */}
      {step === 2 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Escolha o Profissional</h2>
          {barbers.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                <p>Nenhum profissional disponível no momento.</p>
                <p className="mt-1">Entre em contato conosco.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
              {barbers.map((barber) => (
                <Card
                  key={barber.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedBarber?.id === barber.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => {
                    setSelectedBarber(barber);
                    setStep(3);
                  }}
                >
                <CardHeader className="text-center p-3">
                    {barber.photo_url ? (
                      <img 
                        src={barber.photo_url} 
                        alt={barber.name}
                        className="w-14 h-14 mx-auto mb-2 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center text-lg font-medium">
                        {barber.name.charAt(0)}
                      </div>
                    )}
                    <CardTitle className="text-sm font-medium">{barber.name}</CardTitle>
                    {barber.specialty && <CardDescription className="text-xs">{barber.specialty}</CardDescription>}
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => setStep(1)}>
            Voltar
          </Button>
        </div>
      )}

      {/* Step 3: Select Date and Time */}
      {step === 3 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Escolha Data e Horário</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm font-medium">Selecione a Data</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const day = date.getDay();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return !barbershop?.working_days?.includes(day) || date < today;
                  }}
                  locale={ptBR}
                  className="rounded-md border text-sm"
                />
              </CardContent>
            </Card>

            {selectedDate && (
              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm font-medium">Horários Disponíveis</CardTitle>
                  <CardDescription className="text-xs">
                    {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {availableTimes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-3 text-sm">
                      Nenhum horário disponível
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                      {availableTimes.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            setSelectedTime(time);
                            setStep(4);
                          }}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => setStep(2)}>
            Voltar
          </Button>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Confirmação</h2>
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm font-medium">Detalhes do Agendamento</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              <div className="grid gap-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serviço:</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profissional:</span>
                  <span className="font-medium">{selectedBarber?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium">
                    {selectedDate && format(selectedDate, "dd/MM/yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário:</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="font-medium">{selectedService?.duration_minutes} min</span>
                </div>
                <div className="flex justify-between text-base font-semibold pt-2 border-t">
                  <span>Total:</span>
                  <span>R$ {Number(selectedService?.price).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Observações (opcional)</label>
                <Textarea
                  placeholder="Alguma observação?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStep(3)} className="flex-1" disabled={isSubmitting}>
                  Voltar
                </Button>
                <Button size="sm" onClick={handleCreateAppointment} disabled={loading || isSubmitting} className="flex-1">
                  {loading ? "Confirmando..." : "Confirmar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
