import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, X, Trash2, Lock, Unlock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/Subscription/UpgradePrompt";

type Appointment = {
  id: string;
  appointment_date: string;
  status: string;
  barber: { name: string; id: string };
  client: { full_name: string };
  service: { name: string; duration_minutes: number; price: number };
};

type Barber = {
  id: string;
  name: string;
};

type BlockedDay = {
  id: string;
  barber_id: string;
  barber_name?: string;
  blocked_date: string;
  reason: string | null;
};

const Appointments = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  
  // Block day state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [blockBarber, setBlockBarber] = useState<string>("");
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [blockedDays, setBlockedDays] = useState<BlockedDay[]>([]);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);

  const { plan, hasFeature, loading: subscriptionLoading } = useSubscription();
  const canBlockDays = hasFeature('day_blocking');

  const handleDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    
    setDeleting(true);
    try {
      // Primeiro deletar registros financeiros vinculados
      await supabase
        .from("financial_records")
        .delete()
        .eq("appointment_id", appointmentToDelete.id);

      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", appointmentToDelete.id);

      if (error) throw error;

      toast({
        title: "Agendamento excluído",
        description: "O agendamento foi excluído com sucesso.",
      });
      loadData();
    } catch (error) {
      console.error("Error deleting appointment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o agendamento.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setAppointmentToDelete(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, date, startDate, endDate]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get barbershop
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!barbershop) return;
      
      setBarbershopId(barbershop.id);

      // Load barbers
      const { data: barbersData } = await supabase
        .from("barbers")
        .select("id, name")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true);

      setBarbers(barbersData || []);

      // Load blocked days for the selected date
      if (date) {
        const dateStr = format(date, "yyyy-MM-dd");
        const { data: blockedData } = await supabase
          .from("blocked_days")
          .select("id, barber_id, blocked_date, reason")
          .eq("barbershop_id", barbershop.id)
          .eq("blocked_date", dateStr);

        const blockedWithNames = (blockedData || []).map(b => ({
          ...b,
          barber_name: barbersData?.find(barber => barber.id === b.barber_id)?.name || "Profissional"
        }));
        setBlockedDays(blockedWithNames);
      }

      // Determine date range
      let startTime: string, endTime: string;
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        startTime = start.toISOString();
        endTime = end.toISOString();
      } else if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        startTime = startOfDay.toISOString();
        endTime = endOfDay.toISOString();
      } else {
        setAppointments([]);
        return;
      }

      // Fetch appointments from database
      const { data: appointmentsData, error } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          status,
          client_name,
          barbers (id, name),
          clients (id, name),
          services (name, duration_minutes, price)
        `)
        .eq("barbershop_id", barbershop.id)
        .gte("appointment_date", startTime)
        .lte("appointment_date", endTime)
        .order("appointment_date", { ascending: true });

      if (error) throw error;

      // Map to expected format - prioriza client_name do agendamento, fallback para clients.name
      const mappedAppointments: Appointment[] = (appointmentsData || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        status: apt.status,
        barber: {
          id: apt.barbers.id,
          name: apt.barbers.name
        },
        client: {
          full_name: apt.client_name || apt.clients.name
        },
        service: {
          name: apt.services.name,
          duration_minutes: apt.services.duration_minutes,
          price: apt.services.price
        }
      }));

      setAppointments(mappedAppointments);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os agendamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      // 1. Buscar dados do agendamento
      const { data: appointment, error: appointmentError } = await supabase
        .from("appointments")
        .select(`
          id,
          barbershop_id,
          barber_id,
          client_id,
          appointment_date,
          service_id,
          services (price)
        `)
        .eq("id", appointmentId)
        .single();

      if (appointmentError || !appointment) {
        throw new Error("Agendamento não encontrado");
      }

      // 2. Buscar comissão do barbeiro
      const { data: barber, error: barberError } = await supabase
        .from("barbers")
        .select("commission_percent")
        .eq("id", appointment.barber_id)
        .single();

      if (barberError || !barber) {
        throw new Error("Barbeiro não encontrado");
      }

      // 3. Calcular valores financeiros
      const valorTotal = (appointment.services as any)?.price || 0;
      const comissaoPercent = barber.commission_percent || 50;
      const comissaoValor = (valorTotal * comissaoPercent) / 100;
      const valorLiquidoBarbearia = valorTotal - comissaoValor;

      // 4. Criar registro financeiro
      const { error: financialError } = await supabase.from("financial_records").insert({
        barbershop_id: appointment.barbershop_id,
        appointment_id: appointmentId,
        barber_id: appointment.barber_id,
        valor_total: valorTotal,
        comissao_percent: comissaoPercent,
        comissao_valor: comissaoValor,
        valor_liquido_barbearia: valorLiquidoBarbearia,
        status: "EFETIVADO"
      });

      if (financialError) {
        console.error("Error creating financial record:", financialError);
        throw new Error("Erro ao criar registro financeiro");
      }

      // 5. Atualizar dados do cliente (total_visits e last_appointment_at)
      const { data: clientData } = await supabase
        .from("clients")
        .select("total_visits")
        .eq("id", appointment.client_id)
        .single();

      if (clientData) {
        const { error: clientUpdateError } = await supabase
          .from("clients")
          .update({
            total_visits: (clientData.total_visits || 0) + 1,
            last_appointment_at: appointment.appointment_date
          })
          .eq("id", appointment.client_id);

        if (clientUpdateError) {
          console.error("Error updating client:", clientUpdateError);
        }
      }

      // 6. Atualizar status do agendamento
      const { error: updateError } = await supabase
        .from("appointments")
        .update({ status: "confirmed" })
        .eq("id", appointmentId);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: "Agendamento confirmado e financeiro atualizado!",
      });

      // Recarregar dados
      loadData();
    } catch (error) {
      console.error("Error confirming appointment:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível confirmar o agendamento",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (appointmentId: string, status: string) => {
    if (status === "pending") {
      return (
        <Button
          size="sm"
          onClick={() => handleConfirmAppointment(appointmentId)}
          className="bg-green-500 hover:bg-green-600 text-white font-medium"
        >
          Confirmar
        </Button>
      );
    }

    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      confirmed: { label: "Confirmado", variant: "default" },
      completed: { label: "Concluído", variant: "default" },
      cancelled: { label: "Cancelado", variant: "destructive" }
    };
    
    const statusInfo = statusMap[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  const filteredAppointments = selectedBarber === "all" 
    ? appointments 
    : appointments.filter(apt => apt.barber.id === selectedBarber);

  const handleClearPeriodFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setDate(new Date());
  };

  const handleBlockDay = async () => {
    if (!blockBarber || !date || !barbershopId) {
      toast({
        title: "Erro",
        description: "Selecione um profissional para bloquear",
        variant: "destructive",
      });
      return;
    }

    setBlocking(true);
    try {
      const { error } = await supabase.from("blocked_days").insert({
        barbershop_id: barbershopId,
        barber_id: blockBarber,
        blocked_date: format(date, "yyyy-MM-dd"),
        reason: blockReason || null,
        created_by: user?.id,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Este dia já está bloqueado para este profissional");
        }
        throw error;
      }

      toast({
        title: "Dia bloqueado",
        description: `O dia ${format(date, "dd/MM/yyyy")} foi bloqueado com sucesso.`,
      });
      
      setShowBlockModal(false);
      setBlockBarber("");
      setBlockReason("");
      loadData();
    } catch (error) {
      console.error("Error blocking day:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível bloquear o dia",
        variant: "destructive",
      });
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblockDay = async (blockedDayId: string) => {
    try {
      const { error } = await supabase
        .from("blocked_days")
        .delete()
        .eq("id", blockedDayId);

      if (error) throw error;

      toast({
        title: "Dia desbloqueado",
        description: "O bloqueio foi removido com sucesso.",
      });
      
      loadData();
    } catch (error) {
      console.error("Error unblocking day:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o bloqueio",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-medium">Agenda</h1>
        <p className="text-sm text-muted-foreground">Gerencie todos os agendamentos por profissional</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Calendar */}
        <Card>
          <CardHeader className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <CalendarIcon className="w-4 h-4" />
                Calendário
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (!canBlockDays) {
                    setShowUpgradePrompt(true);
                  } else {
                    setShowBlockModal(true);
                  }
                }}
                className="gap-1.5 h-8 text-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                Bloquear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 overflow-x-auto space-y-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
            
            {/* Blocked days for selected date */}
            {blockedDays.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  Bloqueios neste dia:
                </p>
                {blockedDays.map((block) => (
                  <div 
                    key={block.id} 
                    className="flex items-center justify-between p-2 bg-destructive/10 rounded-md text-xs"
                  >
                    <div>
                      <span className="font-medium">{block.barber_name}</span>
                      {block.reason && (
                        <span className="text-muted-foreground"> - {block.reason}</span>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleUnblockDay(block.id)}
                    >
                      <Unlock className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card>
          <CardHeader className="p-4 pb-3">
            <div className="flex flex-col gap-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium whitespace-nowrap">
                <Clock className="w-4 h-4" />
                {startDate && endDate ? "Agendamentos do Período" : "Agendamentos do Dia"}
              </CardTitle>
              <Select value={selectedBarber} onValueChange={setSelectedBarber}>
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue placeholder="Todos os profissionais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os profissionais</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {loading ? (
              <div className="text-center py-6 text-sm text-muted-foreground">Carregando...</div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhum agendamento encontrado para este dia
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className={cn(
                      "flex flex-col lg:flex-row lg:items-center gap-3 p-3 rounded-lg transition-colors border border-border",
                      appointment.status === "confirmed" 
                        ? "bg-secondary/10 hover:bg-secondary/20" 
                        : "bg-muted/50 hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-14 text-center flex-shrink-0">
                        <p className="text-sm font-semibold">
                          {new Date(appointment.appointment_date).toLocaleTimeString('pt-BR', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            timeZone: 'America/Sao_Paulo'
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {appointment.service.duration_minutes}min
                        </p>
                      </div>
                      <div className="h-10 w-px bg-border hidden lg:block" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{appointment.client.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{appointment.service.name}</p>
                        <p className="text-xs font-medium text-secondary">R$ {appointment.service.price}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between lg:justify-end gap-3 flex-wrap">
                      <div className="text-left lg:text-right">
                        <p className="text-xs font-medium">{appointment.barber.name}</p>
                        <p className="text-xs text-muted-foreground">Profissional</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(appointment.id, appointment.status)}
                        {appointment.status === "cancelled" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAppointmentToDelete(appointment)}
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Appointment Dialog */}
      <AlertDialog open={!!appointmentToDelete} onOpenChange={(open) => !open && setAppointmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAppointment}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Day Modal */}
      <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Bloquear Dia
            </DialogTitle>
            <DialogDescription>
              Bloquear a agenda de um profissional para {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "a data selecionada"}.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="barber">Profissional *</Label>
              <Select value={blockBarber} onValueChange={setBlockBarber}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Input
                id="reason"
                placeholder="Ex: Férias, Consulta médica..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockModal(false)} disabled={blocking}>
              Cancelar
            </Button>
            <Button onClick={handleBlockDay} disabled={blocking || !blockBarber}>
              {blocking ? "Bloqueando..." : "Bloquear Dia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradePrompt 
        open={showUpgradePrompt} 
        onOpenChange={setShowUpgradePrompt}
        feature="day_blocking"
        currentPlan={plan?.name}
      />
    </div>
  );
};

export default Appointments;
