import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Wallet, Users, CalendarIcon, X, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/Subscription/UpgradePrompt";

type BarberFinancial = {
  id: string;
  name: string;
  commission_percent: number;
  totalServices: number;
  totalRevenue: number;
  totalCommission: number;
  barbershopProfit: number;
};

type Transaction = {
  id: string;
  date: string;
  client: string;
  service: string;
  barber: string;
  value: number;
  commission: number;
};

const Financial = () => {
  const [loading, setLoading] = useState(true);
  const [barberFinancials, setBarberFinancials] = useState<BarberFinancial[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalServices, setTotalServices] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const { user } = useAuth();
  const { plan, hasFeature, loading: subscriptionLoading } = useSubscription();
  const canUseDateFilter = hasFeature('date_filter');

  useEffect(() => {
    loadFinancialData();
  }, [user, startDate, endDate]);

  const loadFinancialData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get empresa from funcao_usuario
      const { data: roleData } = await supabase
        .from("funcao_usuario")
        .select("empresa_id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!roleData?.empresa_id) return;

      // Get all financial records with date filter
      let query = supabase
        .from("registro_financeiros")
        .select(`
          id,
          agendamento_id,
          valor,
          status,
          created_at,
          descricao
        `)
        .eq("empresa_id", roleData.empresa_id)
        .eq("status", "paid");

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query = query.gte("created_at", start.toISOString());
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query = query.lte("created_at", end.toISOString());
      }

      const { data: financialRecords } = await query.order("created_at", { ascending: false });

      if (!financialRecords || financialRecords.length === 0) {
        setBarberFinancials([]);
        setTransactions([]);
        setTotalRevenue(0);
        setTotalCommissions(0);
        setTotalProfit(0);
        setTotalServices(0);
        setLoading(false);
        return;
      }

      // Get profissionais
      const { data: profissionais } = await supabase
        .from("profissionais")
        .select("id, nome, percentual_comissao")
        .eq("empresa_id", roleData.empresa_id)
        .eq("ativo", true);

      if (!profissionais) return;

      // Get appointment details for transactions
      const appointmentIds = financialRecords.map(r => r.agendamento_id).filter(Boolean);
      const { data: appointments } = await supabase
        .from("agendamentos")
        .select(`
          id,
          data_hora,
          cliente_id,
          servico_id,
          profissional_id
        `)
        .in("id", appointmentIds);

      // Get clients and services for display
      const clientIds = [...new Set(appointments?.map(a => a.cliente_id) || [])];
      const serviceIds = [...new Set(appointments?.map(a => a.servico_id) || [])];

      const [{ data: clientes }, { data: servicos }] = await Promise.all([
        supabase.from("clientes").select("id, nome").in("id", clientIds),
        supabase.from("servicos").select("id, nome").in("id", serviceIds),
      ]);

      // Calculate financial data for each profissional
      const barberFinancialsData: BarberFinancial[] = profissionais.map((prof) => {
        const profAppointments = appointments?.filter(a => a.profissional_id === prof.id) || [];
        const profRecords = financialRecords.filter(r => 
          profAppointments.some(a => a.id === r.agendamento_id)
        );

        const totalRevenue = profRecords.reduce(
          (sum, record) => sum + Number(record.valor),
          0
        );

        const commissionPercent = Number(prof.percentual_comissao) || 50;
        const totalCommission = (totalRevenue * commissionPercent) / 100;
        const barbershopProfit = totalRevenue - totalCommission;

        return {
          id: prof.id,
          name: prof.nome,
          commission_percent: commissionPercent,
          totalServices: profRecords.length,
          totalRevenue,
          totalCommission,
          barbershopProfit,
        };
      });

      setBarberFinancials(barberFinancialsData);

      // Calculate totals
      const revenue = barberFinancialsData.reduce((sum, b) => sum + b.totalRevenue, 0);
      const commissions = barberFinancialsData.reduce((sum, b) => sum + b.totalCommission, 0);
      const profit = barberFinancialsData.reduce((sum, b) => sum + b.barbershopProfit, 0);
      const totalServicesCount = barberFinancialsData.reduce((sum, b) => sum + b.totalServices, 0);

      setTotalRevenue(revenue);
      setTotalCommissions(commissions);
      setTotalProfit(profit);
      setTotalServices(totalServicesCount);

      // Format transactions (last 10)
      const transactionsData: Transaction[] = financialRecords.slice(0, 10).map((record) => {
        const appointment = appointments?.find(a => a.id === record.agendamento_id);
        const client = clientes?.find(c => c.id === appointment?.cliente_id);
        const service = servicos?.find(s => s.id === appointment?.servico_id);
        const prof = profissionais.find(p => p.id === appointment?.profissional_id);

        const commissionPercent = Number(prof?.percentual_comissao) || 50;
        const valor = Number(record.valor);

        return {
          id: record.id,
          date: appointment?.data_hora || record.created_at,
          client: client?.nome || "N/A",
          service: service?.nome || "N/A",
          barber: prof?.nome || "N/A",
          value: valor,
          commission: (valor * commissionPercent) / 100,
        };
      });

      setTransactions(transactionsData);

      // Calculate pending revenue (appointments not yet completed)
      const { data: pendingAppointments } = await supabase
        .from("agendamentos")
        .select(`servico_id`)
        .eq("empresa_id", roleData.empresa_id)
        .eq("status", "scheduled");

      if (pendingAppointments && pendingAppointments.length > 0) {
        const pendingServiceIds = [...new Set(pendingAppointments.map(a => a.servico_id))];
        const { data: pendingServices } = await supabase
          .from("servicos")
          .select("id, preco")
          .in("id", pendingServiceIds);

        const pendingTotal = pendingAppointments.reduce((sum, apt) => {
          const service = pendingServices?.find(s => s.id === apt.servico_id);
          return sum + (Number(service?.preco) || 0);
        }, 0);

        setPendingRevenue(pendingTotal);
      }

    } catch (error) {
      console.error("Error loading financial data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados financeiros",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const summary = [
    { 
      label: "Receita Concluída", 
      value: `R$ ${totalRevenue.toFixed(2)}`, 
      icon: DollarSign,
      description: "Serviços confirmados"
    },
    { 
      label: "Receita Pendente", 
      value: `R$ ${pendingRevenue.toFixed(2)}`, 
      icon: DollarSign,
      description: "Aguardando confirmação"
    },
    { 
      label: "Comissões", 
      value: `R$ ${totalCommissions.toFixed(2)}`, 
      icon: Wallet,
      description: "Total de comissões"
    },
    { 
      label: "Lucro Líquido", 
      value: `R$ ${totalProfit.toFixed(2)}`, 
      icon: TrendingUp,
      description: "Receita - comissões"
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Carregando dados financeiros...</p>
      </div>
    );
  }

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-medium">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Acompanhe receitas, comissões e lucros por profissional</p>
      </div>

      {/* Date Filter */}
      {canUseDateFilter ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium">Filtrar:</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal h-8 text-xs",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <span className="text-xs text-muted-foreground">até</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal h-8 text-xs",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="h-8 text-xs"
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-xs">Filtro por período disponível no plano Premium</span>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowUpgradePrompt(true)}>
                Ver Planos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <UpgradePrompt 
        open={showUpgradePrompt} 
        onOpenChange={setShowUpgradePrompt}
        feature="date_filter"
        currentPlan={plan?.name}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {summary.map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className="text-lg font-semibold">{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                </div>
                <item.icon className="w-5 h-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for General and By Specialist */}
      <Tabs defaultValue="general" className="space-y-3">
        <TabsList className="h-9">
          <TabsTrigger value="general" className="text-xs">Geral</TabsTrigger>
          <TabsTrigger value="by-barber" className="text-xs">Por Profissional</TabsTrigger>
        </TabsList>

        {/* General Financial Tab */}
        <TabsContent value="general" className="space-y-3">
          <Card>
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-base font-medium">Transações Recentes</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Serviço</TableHead>
                    <TableHead className="text-xs">Profissional</TableHead>
                    <TableHead className="text-xs text-right">Valor</TableHead>
                    <TableHead className="text-xs text-right">Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-xs">
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{transaction.client}</TableCell>
                        <TableCell className="text-xs">{transaction.service}</TableCell>
                        <TableCell className="text-xs">{transaction.barber}</TableCell>
                        <TableCell className="text-xs text-right font-medium">
                          R$ {transaction.value.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-right text-accent">
                          R$ {transaction.commission.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Specialist Financial Tab */}
        <TabsContent value="by-barber" className="space-y-3">
          <Card>
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-base font-medium">Desempenho por Profissional</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Profissional</TableHead>
                    <TableHead className="text-xs text-center">Serviços</TableHead>
                    <TableHead className="text-xs text-right">Faturado</TableHead>
                    <TableHead className="text-xs text-center">%</TableHead>
                    <TableHead className="text-xs text-right">Comissão</TableHead>
                    <TableHead className="text-xs text-right">Lucro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {barberFinancials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                        Nenhum profissional com dados financeiros
                      </TableCell>
                    </TableRow>
                  ) : (
                    barberFinancials.map((barber) => (
                      <TableRow key={barber.id}>
                        <TableCell className="text-xs font-medium">{barber.name}</TableCell>
                        <TableCell className="text-xs text-center">{barber.totalServices}</TableCell>
                        <TableCell className="text-xs text-right">R$ {barber.totalRevenue.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-center">{barber.commission_percent}%</TableCell>
                        <TableCell className="text-xs text-right text-accent">R$ {barber.totalCommission.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right font-medium text-green-600">R$ {barber.barbershopProfit.toFixed(2)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Financial;
