import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { CalendarIcon, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AppointmentsChartProps {
  clinicId: string;
}

type ChartDataPoint = {
  date: string;
  agendamentos: number;
};

type Professional = { id: string; name: string };
type Service = { id: string; name: string };

export function AppointmentsChart({ clinicId }: AppointmentsChartProps) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState("all");
  const [selectedService, setSelectedService] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("7days");
  const [customRange, setCustomRange] = useState<{ from: Date | undefined; to: Date | undefined }>({ from: undefined, to: undefined });
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<{ text: string; positive: boolean } | null>(null);

  useEffect(() => {
    loadFilters();
  }, [clinicId]);

  useEffect(() => {
    loadChartData();
  }, [clinicId, selectedProfessional, selectedService, selectedPeriod, customRange]);

  const loadFilters = async () => {
    const [{ data: barbers }, { data: servicesData }] = await Promise.all([
      supabase.from("barbers").select("id, name").eq("barbershop_id", clinicId).eq("is_active", true),
      supabase.from("services").select("id, name").eq("barbershop_id", clinicId).eq("is_active", true)
    ]);
    setProfessionals(barbers || []);
    setServices(servicesData || []);
  };

  const calculatePeriodDates = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = endOfDay(now);

    switch (selectedPeriod) {
      case "today":
        startDate = startOfDay(now);
        break;
      case "7days":
        startDate = startOfDay(subDays(now, 6));
        break;
      case "30days":
        startDate = startOfDay(subDays(now, 29));
        break;
      case "custom":
        startDate = customRange.from ? startOfDay(customRange.from) : startOfDay(subDays(now, 6));
        endDate = customRange.to ? endOfDay(customRange.to) : endOfDay(now);
        break;
      default:
        startDate = startOfDay(subDays(now, 6));
    }

    return { startDate, endDate };
  };

  const loadChartData = async () => {
    if (!clinicId) return;
    setLoading(true);

    try {
      const { startDate, endDate } = calculatePeriodDates();
      const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      let query = supabase
        .from("appointments")
        .select("id, appointment_date, barber_id, service_id")
        .eq("barbershop_id", clinicId)
        .in("status", ["confirmed", "completed"])
        .gte("appointment_date", startDate.toISOString())
        .lte("appointment_date", endDate.toISOString());

      if (selectedProfessional !== "all") {
        query = query.eq("barber_id", selectedProfessional);
      }
      if (selectedService !== "all") {
        query = query.eq("service_id", selectedService);
      }

      const { data: appointments } = await query;

      // Group by date
      const grouped: Record<string, number> = {};
      
      // Initialize all dates in range with 0
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateKey = format(d, "dd/MM", { locale: ptBR });
        grouped[dateKey] = 0;
      }

      // Count appointments per day
      appointments?.forEach(apt => {
        const dateKey = format(new Date(apt.appointment_date), "dd/MM", { locale: ptBR });
        grouped[dateKey] = (grouped[dateKey] || 0) + 1;
      });

      const data = Object.entries(grouped).map(([date, count]) => ({
        date,
        agendamentos: count
      }));

      setChartData(data);

      // Calculate insight
      const currentTotal = appointments?.length || 0;
      await calculateInsight(currentTotal, periodDays, startDate);
    } catch (error) {
      console.error("Error loading chart data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateInsight = async (currentTotal: number, periodDays: number, currentStart: Date) => {
    const previousStart = subDays(currentStart, periodDays);
    const previousEnd = subDays(currentStart, 1);

    let query = supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("barbershop_id", clinicId)
      .in("status", ["confirmed", "completed"])
      .gte("appointment_date", previousStart.toISOString())
      .lte("appointment_date", previousEnd.toISOString());

    if (selectedProfessional !== "all") {
      query = query.eq("barber_id", selectedProfessional);
    }
    if (selectedService !== "all") {
      query = query.eq("service_id", selectedService);
    }

    const { count: previousTotal } = await query;

    if (!previousTotal || previousTotal === 0) {
      if (currentTotal > 0) {
        setInsight({ text: `${currentTotal} agendamento${currentTotal > 1 ? 's' : ''} no período`, positive: true });
      } else {
        setInsight(null);
      }
      return;
    }

    const variation = ((currentTotal - previousTotal) / previousTotal) * 100;
    const isPositive = variation >= 0;

    setInsight({
      text: isPositive
        ? `A agenda cresceu ${variation.toFixed(0)}% em relação ao período anterior`
        : `Queda de ${Math.abs(variation).toFixed(0)}% comparado ao período anterior`,
      positive: isPositive
    });
  };

  const chartConfig = {
    agendamentos: {
      label: "Agendamentos",
      color: "hsl(var(--primary))"
    }
  };

  return (
    <Card className="shadow-elegant border-border/50">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="font-display flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução de Agendamentos
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7days">7 dias</SelectItem>
                <SelectItem value="30days">30 dias</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {selectedPeriod === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customRange.from && customRange.to
                      ? `${format(customRange.from, "dd/MM")} - ${format(customRange.to, "dd/MM")}`
                      : "Datas"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={customRange.from ? customRange : undefined}
                    onSelect={(range) => setCustomRange({ from: range?.from, to: range?.to })}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            )}

            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {professionals.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Serviço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[250px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum agendamento no período</p>
            </div>
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="agendamentos"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            {insight && (
              <div className={cn(
                "mt-4 flex items-center gap-2 text-sm",
                insight.positive ? "text-primary" : "text-destructive"
              )}>
                {insight.positive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>{insight.text}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
