import { Calendar, DollarSign, UserCheck, Users } from "lucide-react";
import { StatCard } from "@/components/Dashboard/StatCard";
import { AppointmentsChart } from "@/components/Dashboard/AppointmentsChart";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type DashboardStats = { 
  todayAppointments: number; 
  monthRevenue: number; 
  activeProfessionals: number; 
  activeClients: number; 
};

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ 
    todayAppointments: 0, 
    monthRevenue: 0, 
    activeProfessionals: 0, 
    activeClients: 0 
  });

  useEffect(() => { 
    loadDashboardData(); 
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // Get empresa do usuário através da funcao_usuario
      const { data: funcaoData } = await supabase
        .from("funcao_usuario")
        .select("empresa_id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      if (!funcaoData?.empresa_id) return;
      setEmpresaId(funcaoData.empresa_id);
      
      const startOfDay = new Date(); 
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(); 
      endOfDay.setHours(23, 59, 59, 999);
      
      // Agendamentos de hoje
      const { count: todayCount } = await supabase
        .from("agendamentos")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", funcaoData.empresa_id)
        .gte("data_hora", startOfDay.toISOString())
        .lte("data_hora", endOfDay.toISOString());
      
      const startOfMonth = new Date(); 
      startOfMonth.setDate(1); 
      startOfMonth.setHours(0, 0, 0, 0);
      
      // Receita do mês (registros financeiros com status paid)
      const { data: monthFinancials } = await supabase
        .from("registro_financeiros")
        .select("valor")
        .eq("empresa_id", funcaoData.empresa_id)
        .eq("status", "paid")
        .gte("created_at", startOfMonth.toISOString());
      
      const monthRevenue = monthFinancials?.reduce((sum, record) => sum + Number(record.valor), 0) || 0;
      
      // Profissionais ativos
      const { count: professionalsCount } = await supabase
        .from("profissionais")
        .select("*", { count: "exact", head: true })
        .eq("empresa_id", funcaoData.empresa_id)
        .eq("ativo", true);
      
      // Clientes ativos (com pelo menos uma visita)
      const { data: clientLinks } = await supabase
        .from("cliente_empresa")
        .select("cliente_id")
        .eq("empresa_id", funcaoData.empresa_id);
      
      const clientIds = clientLinks?.map(c => c.cliente_id) || [];
      let clientsCount = 0;
      
      if (clientIds.length > 0) {
        const { count } = await supabase
          .from("clientes")
          .select("*", { count: "exact", head: true })
          .in("id", clientIds)
          .gte("total_visitas", 1);
        clientsCount = count || 0;
      }
      
      setStats({ 
        todayAppointments: todayCount || 0, 
        monthRevenue, 
        activeProfessionals: professionalsCount || 0, 
        activeClients: clientsCount 
      });
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally { 
      setLoading(false); 
    }
  };

  const statsCards = [
    { 
      title: "Agendamentos Hoje", 
      value: loading ? "..." : stats.todayAppointments, 
      icon: <Calendar className="w-5 h-5 text-primary" />, 
      trend: { value: "Hoje", positive: true } 
    },
    { 
      title: "Receita do Mês", 
      value: loading ? "..." : `R$ ${stats.monthRevenue.toFixed(2)}`, 
      icon: <DollarSign className="w-5 h-5 text-primary" />, 
      trend: { value: "Mês atual", positive: true } 
    },
    { 
      title: "Profissionais Ativos", 
      value: loading ? "..." : stats.activeProfessionals, 
      icon: <UserCheck className="w-5 h-5 text-primary" />, 
      trend: { value: "Ativos", positive: true } 
    },
    { 
      title: "Clientes Ativos", 
      value: loading ? "..." : stats.activeClients, 
      icon: <Users className="w-5 h-5 text-primary" />, 
      trend: { value: "Total", positive: true } 
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-medium">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral do seu negócio</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => <StatCard key={stat.title} {...stat} />)}
      </div>
      {empresaId && <AppointmentsChart clinicId={empresaId} />}
    </div>
  );
};

export default Dashboard;