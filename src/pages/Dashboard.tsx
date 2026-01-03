import { Calendar, DollarSign, UserCheck, Users } from "lucide-react";
import { StatCard } from "@/components/Dashboard/StatCard";
import { AppointmentsChart } from "@/components/Dashboard/AppointmentsChart";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type DashboardStats = { todayAppointments: number; monthRevenue: number; activeProfessionals: number; activeClients: number; };

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({ todayAppointments: 0, monthRevenue: 0, activeProfessionals: 0, activeClients: 0 });

  useEffect(() => { loadDashboardData(); }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: clinic } = await supabase.from("barbershops").select("id").eq("owner_id", user.id).single();
      if (!clinic) return;
      setClinicId(clinic.id);
      const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
      const { count: todayCount } = await supabase.from("appointments").select("*", { count: "exact", head: true }).eq("barbershop_id", clinic.id).gte("appointment_date", startOfDay.toISOString()).lte("appointment_date", endOfDay.toISOString());
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
      const { data: monthFinancials } = await supabase.from("financial_records").select("valor_total").eq("barbershop_id", clinic.id).eq("status", "EFETIVADO").gte("created_at", startOfMonth.toISOString());
      const monthRevenue = monthFinancials?.reduce((sum, record) => sum + Number(record.valor_total), 0) || 0;
      const { count: professionalsCount } = await supabase.from("barbers").select("*", { count: "exact", head: true }).eq("barbershop_id", clinic.id).eq("is_active", true);
      const { count: clientsCount } = await supabase.from("clients").select("*", { count: "exact", head: true }).eq("barbershop_id", clinic.id).gte("total_visits", 1);
      setStats({ todayAppointments: todayCount || 0, monthRevenue, activeProfessionals: professionalsCount || 0, activeClients: clientsCount || 0 });
    } catch { } finally { setLoading(false); }
  };

  const statsCards = [
    { title: "Agendamentos Hoje", value: loading ? "..." : stats.todayAppointments, icon: <Calendar className="w-5 h-5 text-primary" />, trend: { value: "Hoje", positive: true } },
    { title: "Receita do Mês", value: loading ? "..." : `R$ ${stats.monthRevenue.toFixed(2)}`, icon: <DollarSign className="w-5 h-5 text-primary" />, trend: { value: "Mês atual", positive: true } },
    { title: "Profissionais Ativos", value: loading ? "..." : stats.activeProfessionals, icon: <UserCheck className="w-5 h-5 text-primary" />, trend: { value: "Ativos", positive: true } },
    { title: "Clientes Ativos", value: loading ? "..." : stats.activeClients, icon: <Users className="w-5 h-5 text-primary" />, trend: { value: "Total", positive: true } },
  ];

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-medium">Dashboard</h1><p className="text-sm text-muted-foreground">Visão geral do seu negócio</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{statsCards.map((stat) => <StatCard key={stat.title} {...stat} />)}</div>
      {clinicId && <AppointmentsChart clinicId={clinicId} />}
    </div>
  );
};

export default Dashboard;
