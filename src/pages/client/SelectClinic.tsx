import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, Store } from "lucide-react";
import { toast } from "sonner";

export default function SelectBarbershop() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [barbershops, setBarbershops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    loadBarbershops();
  }, []);

  const loadBarbershops = async () => {
    try {
      const { data, error } = await supabase
        .from("barbershops")
        .select("*")
        .order("name");

      if (error) throw error;
      setBarbershops(data || []);
    } catch (error) {
      console.error("Error loading barbershops:", error);
      toast.error("Erro ao carregar barbearias");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBarbershop = async (barbershopId: string) => {
    if (!user) return;
    
    setSelecting(true);
    try {
      const { error } = await supabase
        .from("client_barbershop")
        .insert({
          profile_id: user.id,
          barbershop_id: barbershopId
        });

      if (error) throw error;

      toast.success("Barbearia selecionada com sucesso!");
      navigate("/client");
    } catch (error) {
      console.error("Error selecting barbershop:", error);
      toast.error("Erro ao selecionar barbearia");
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Bem-vindo!</h1>
        <p className="text-xl text-muted-foreground">
          Selecione uma barbearia para começar
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {barbershops.map((barbershop) => (
          <Card key={barbershop.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Store className="h-5 w-5 text-primary" />
                <CardTitle className="text-xl">{barbershop.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {barbershop.address && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{barbershop.address}</span>
                </div>
              )}
              
              {barbershop.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{barbershop.phone}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {barbershop.opening_time?.slice(0, 5)} - {barbershop.closing_time?.slice(0, 5)}
                </span>
              </div>

              <Button
                className="w-full"
                onClick={() => handleSelectBarbershop(barbershop.id)}
                disabled={selecting}
              >
                {selecting ? "Selecionando..." : "Selecionar"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
