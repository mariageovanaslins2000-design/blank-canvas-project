import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";

export default function ClientBarbers() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      const { data, error } = await supabase
        .from("barbers")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setBarbers(data || []);
    } catch (error) {
      console.error("Error loading barbers:", error);
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-medium mb-1">Nossos Profissionais</h1>
        <p className="text-sm text-muted-foreground">
          Conheça nossa equipe de profissionais
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {barbers.map((barber) => (
          <Card key={barber.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
            <CardHeader className="text-center p-4 pb-2">
              <div className="relative w-16 h-16 mx-auto mb-2">
                <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-primary/20">
                  {barber.photo_url ? (
                    <img 
                      src={barber.photo_url} 
                      alt={barber.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
              <CardTitle className="text-base font-medium">{barber.name}</CardTitle>
              {barber.specialty && (
                <CardDescription className="text-sm">{barber.specialty}</CardDescription>
              )}
            </CardHeader>
            {barber.phone && (
              <CardContent className="text-center p-4 pt-0">
                <p className="text-xs text-muted-foreground">{barber.phone}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
