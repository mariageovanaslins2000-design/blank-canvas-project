import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientClinic } from "@/hooks/useClientClinic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, X } from "lucide-react";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
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

export default function ClientAppointments() {
  const { user } = useAuth();
  const { clinicId, loading: clinicLoading } = useClientClinic();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; appointmentId: string | null }>({
    open: false,
    appointmentId: null,
  });

  useEffect(() => {
    if (!clinicLoading && clinicId) {
      loadAppointments();
    } else if (!clinicLoading) {
      setLoading(false);
    }
  }, [user, clinicId, clinicLoading]);

  const loadAppointments = async () => {
    if (!user || !clinicId) return;

    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("profile_id", user.id)
        .eq("barbershop_id", clinicId)
        .maybeSingle();

      if (clientError) throw clientError;

      if (!clientData) {
        setAppointments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          barbers (name, specialty),
          services (name, price, duration_minutes),
          barbershops (name)
        `)
        .eq("client_id", clientData.id)
        .order("appointment_date", { ascending: false });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error loading appointments:", error);
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", appointmentId);

      if (error) throw error;

      toast.success("Agendamento cancelado com sucesso");
      loadAppointments();
      setCancelDialog({ open: false, appointmentId: null });
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.error("Erro ao cancelar agendamento");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      pending: { label: "Pendente", variant: "outline" },
      confirmed: { label: "Confirmado", variant: "default" },
      cancelled: { label: "Cancelado", variant: "destructive" },
      completed: { label: "Concluído", variant: "secondary" },
    };

    const statusInfo = statusMap[status] || statusMap.pending;

    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.label}
      </Badge>
    );
  };

  const canCancel = (appointment: any) => {
    return (
      (appointment.status === "pending" || appointment.status === "confirmed") &&
      !isPast(new Date(appointment.appointment_date))
    );
  };

  if (loading || clinicLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium mb-1">Meus Agendamentos</h1>
        <p className="text-sm text-muted-foreground">
          Visualize e gerencie seus agendamentos
        </p>
      </div>

      {appointments.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Você não tem agendamentos ainda
            </p>
            <Button asChild size="sm">
              <a href="/client/booking">Fazer Agendamento</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {appointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">{appointment.services.name}</CardTitle>
                    <CardDescription className="text-sm">{appointment.barbershops.name}</CardDescription>
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{appointment.barbers.name}</span>
                      {appointment.barbers.specialty && (
                        <span className="text-xs text-muted-foreground">
                          • {appointment.barbers.specialty}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(appointment.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{format(new Date(appointment.appointment_date), "HH:mm")}</span>
                    </div>
                  </div>

                  {appointment.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Observações: </span>
                      <span>{appointment.notes}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <span className="text-xs text-muted-foreground">Valor: </span>
                      <span className="font-semibold text-sm">
                        R$ {Number(appointment.services.price).toFixed(2)}
                      </span>
                    </div>

                    {canCancel(appointment) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setCancelDialog({ open: true, appointmentId: appointment.id })}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog
        open={cancelDialog.open}
        onOpenChange={(open) => setCancelDialog({ open, appointmentId: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-medium">Cancelar Agendamento</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelDialog.appointmentId && handleCancelAppointment(cancelDialog.appointmentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
