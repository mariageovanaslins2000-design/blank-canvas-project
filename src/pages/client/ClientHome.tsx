import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClientClinic } from "@/hooks/useClientClinic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, Store } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { clinicId, loading: clinicLoading } = useClientClinic();
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicLoading && clinicId) {
      loadUpcomingAppointments();
    } else if (!clinicLoading) {
      setLoading(false);
    }
  }, [user, clinicId, clinicLoading]);

  const loadUpcomingAppointments = async () => {
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
        setUpcomingAppointments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          barbers (name),
          services (name, price),
          barbershops (name)
        `)
        .eq("client_id", clientData.id)
        .gte("appointment_date", new Date().toISOString())
        .order("appointment_date", { ascending: true })
        .limit(3);

      if (error) throw error;
      setUpcomingAppointments(data || []);
    } catch (error) {
      console.error("Error loading appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || clinicLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!clinicId) {
    return (
      <div className="max-w-md mx-auto space-y-6 text-center">
        <div className="space-y-2">
          <Store className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-xl font-medium">Bem-vindo!</h1>
          <p className="text-sm text-muted-foreground">
            Para começar a usar o sistema, você precisa selecionar um estabelecimento
          </p>
        </div>

        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-medium">Próximos Passos</CardTitle>
            <CardDescription className="text-sm">
              Escolha um estabelecimento para acessar todos os recursos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <Button onClick={() => navigate("/client/select-clinic")} size="sm" className="w-full">
              Selecionar Estabelecimento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium mb-1">Bem-vindo!</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie seus agendamentos e explore nossos serviços
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-medium">Novo Agendamento</CardTitle>
            <CardDescription className="text-sm">
              Agende um horário com nossos profissionais
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <Button asChild size="sm" className="w-full">
              <Link to="/client/booking">
                <Calendar className="mr-2 h-4 w-4" />
                Agendar Agora
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-medium">Meus Agendamentos</CardTitle>
            <CardDescription className="text-sm">
              Visualize e gerencie seus agendamentos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/client/appointments">
                Ver Todos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-3">Próximos Agendamentos</h2>
        {upcomingAppointments.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Você não tem agendamentos futuros
              </p>
              <Button asChild size="sm">
                <Link to="/client/booking">Fazer Agendamento</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {upcomingAppointments.map((appointment) => (
              <Card key={appointment.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-medium">{appointment.services.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {appointment.barbers.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(appointment.appointment_date), "dd 'de' MMMM", { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(appointment.appointment_date), "HH:mm")}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        R$ {Number(appointment.services.price).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {appointment.status === "pending" && "Pendente"}
                        {appointment.status === "confirmed" && "Confirmado"}
                        {appointment.status === "cancelled" && "Cancelado"}
                        {appointment.status === "completed" && "Concluído"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
