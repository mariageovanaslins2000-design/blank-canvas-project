import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Phone, Calendar, Search, UserX, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { PlanLimitIndicator } from "@/components/Subscription/PlanLimitIndicator";

interface Client {
  id: string;
  profile_id: string | null;
  full_name: string;
  phone: string;
  total_appointments: number;
  last_appointment_date: string | null;
  last_service: string | null;
  created_at: string;
}

interface AppointmentHistory {
  id: string;
  appointment_date: string;
  service_name: string;
  barber_name: string;
  status: string;
  paid_amount: number;
}

const Clients = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [appointmentHistory, setAppointmentHistory] = useState<AppointmentHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState("todos");
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { getClientsLimit, loading: subscriptionLoading } = useSubscription();

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientToDelete.id);

      if (error) {
        if (error.code === "23503") {
          toast({
            title: "Não é possível excluir",
            description: "Este cliente está vinculado a agendamentos. Exclua os agendamentos primeiro.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Cliente excluído",
          description: `O cliente "${clientToDelete.full_name}" foi excluído com sucesso.`,
        });
        loadClients();
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cliente.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setClientToDelete(null);
    }
  };

  useEffect(() => {
    loadClients();
    
    // Set up realtime subscription for clients changes
    const channel = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        () => {
          loadClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadClients = async () => {
    if (!user) return;

    try {
      // Get barbershop
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!barbershop) return;

      // Get clients from the new clients table
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("last_appointment_at", { ascending: false });

      if (clientsData) {
        // Map to match the existing Client interface
        const mappedClients: Client[] = clientsData.map(c => ({
          id: c.id,
          profile_id: c.profile_id,
          full_name: c.name,
          phone: c.phone || "Não informado",
          total_appointments: c.total_visits,
          last_appointment_date: c.last_appointment_at,
          last_service: null,
          created_at: c.created_at,
        }));

        setClients(mappedClients);
      }
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientHistory = async (clientId: string) => {
    if (!user) return;

    try {
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!barbershop) return;

      const { data: appointments } = await supabase
        .from("appointments")
        .select(`
          id,
          appointment_date,
          status,
          paid_amount,
          services (
            name
          ),
          barbers (
            name
          )
        `)
        .eq("barbershop_id", barbershop.id)
        .eq("client_id", clientId)
        .order("appointment_date", { ascending: false });

      if (appointments) {
        setAppointmentHistory(
          appointments.map((apt: any) => ({
            id: apt.id,
            appointment_date: apt.appointment_date,
            service_name: apt.services?.name || "Não especificado",
            barber_name: apt.barbers?.name || "Não especificado",
            status: apt.status,
            paid_amount: apt.paid_amount || 0,
          }))
        );
      }
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500";
      case "confirmed":
        return "bg-blue-500/10 text-blue-500";
      case "completed":
        return "bg-green-500/10 text-green-500";
      case "cancelled":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendente";
      case "confirmed":
        return "Confirmado";
      case "completed":
        return "Concluído";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  // Filter clients based on search and active filter
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery);
    
    const isActive = client.total_appointments > 0;
    
    if (filterTab === "ativos") return matchesSearch && isActive;
    if (filterTab === "inativos") return matchesSearch && !isActive;
    return matchesSearch; // "todos"
  });

  const activeClients = clients.filter(c => c.total_appointments > 0).length;
  const inactiveClients = clients.length - activeClients;

  const limits = getClientsLimit();

  if (loading || subscriptionLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Clientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie sua base de clientes cadastrados</p>
        </div>
        <PlanLimitIndicator current={limits.current} max={limits.max} label="Clientes" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <CardTitle className="text-xs font-medium">Total de Clientes</CardTitle>
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-semibold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <CardTitle className="text-xs font-medium">Clientes Ativos</CardTitle>
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-semibold">{activeClients}</div>
            <p className="text-xs text-muted-foreground">Com atendimentos realizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <CardTitle className="text-xs font-medium">Clientes Inativos</CardTitle>
            <UserX className="w-3.5 h-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-semibold">{inactiveClients}</div>
            <p className="text-xs text-muted-foreground">Cadastrados sem atendimentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-base font-medium">Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3.5 h-3.5" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Filter Tabs */}
          <Tabs value={filterTab} onValueChange={setFilterTab}>
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="todos" className="text-xs">
                Todos ({clients.length})
              </TabsTrigger>
              <TabsTrigger value="ativos" className="text-xs">
                Ativos ({activeClients})
              </TabsTrigger>
              <TabsTrigger value="inativos" className="text-xs">
                Inativos ({inactiveClients})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filterTab} className="mt-3 space-y-2">
              {filteredClients.map((client) => (
              <div
                key={client.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors gap-3"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-icon">
                      {client.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{client.full_name}</h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span className="truncate">{client.phone}</span>
                      </div>
                      <span className="hidden sm:inline">•</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{client.total_appointments} atendimentos</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {client.last_appointment_date ? (
                        <span>Último: {format(new Date(client.last_appointment_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                      ) : (
                        <span className="text-yellow-600">Sem atendimentos ainda</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedClient(client);
                          loadClientHistory(client.id);
                        }}
                        className="flex-1 sm:flex-none"
                        disabled={client.total_appointments === 0}
                      >
                        Ver Histórico
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Histórico de {selectedClient?.full_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      {appointmentHistory.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Nenhum agendamento encontrado</p>
                      ) : (
                        appointmentHistory.map((apt) => (
                          <div key={apt.id} className="p-4 rounded-lg border bg-card">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {format(new Date(apt.appointment_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </span>
                              </div>
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}
                              >
                                {getStatusLabel(apt.status)}
                              </span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <p>
                                <span className="text-muted-foreground">Serviço:</span> {apt.service_name}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Profissional:</span> {apt.barber_name}
                              </p>
                              {apt.paid_amount > 0 && (
                                <p>
                                  <span className="text-muted-foreground">Valor:</span> R${" "}
                                  {apt.paid_amount.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setClientToDelete(client)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            {filteredClients.length === 0 && clients.length > 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum cliente encontrado</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Tente ajustar os filtros ou a busca
                </p>
              </div>
            )}

            {clients.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum cliente cadastrado ainda</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Compartilhe o link de cadastro para seus clientes se cadastrarem
                </p>
              </div>
            )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!clientToDelete} onOpenChange={() => setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente "{clientToDelete?.full_name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;
