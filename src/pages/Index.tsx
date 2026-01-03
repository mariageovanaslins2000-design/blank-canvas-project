import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";
import logoDark from "@/assets/logo-dark.png";

const Index = () => {
  const navigate = useNavigate();
  const { user, hasRole, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (hasRole("owner")) {
        navigate("/admin");
      } else if (hasRole("client")) {
        navigate("/client");
      }
    }
  }, [user, hasRole, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={logoDark} alt="iClinic" className="h-24 w-24 object-contain" />
          </div>
          <p className="text-xl text-muted-foreground">Sistema de Gestão de Clínicas</p>
        </div>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Área Administrativa</CardTitle>
            <CardDescription>Gerencie sua clínica</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => navigate("/auth")}
            >
              Fazer Login
            </Button>
            <Button 
              variant="outline"
              className="w-full" 
              size="lg"
              onClick={() => navigate("/vendas")}
            >
              Conhecer Planos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
