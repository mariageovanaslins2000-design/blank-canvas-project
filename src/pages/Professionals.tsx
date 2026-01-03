import { useState, useEffect } from "react";
import { Phone, User, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AddProfessionalDialog } from "@/components/Professionals/AddProfessionalDialog";
import { EditProfessionalDialog } from "@/components/Professionals/EditProfessionalDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { PlanLimitIndicator } from "@/components/Subscription/PlanLimitIndicator";
import { UpgradePrompt } from "@/components/Subscription/UpgradePrompt";

const Professionals = () => {
  const { user } = useAuth();
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [professionalToDelete, setProfessionalToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  const { plan, canAddProfessional, getProfessionalsLimit, refreshUsage, loading: subscriptionLoading } = useSubscription();

  const handleDelete = async () => {
    if (!professionalToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("barbers").delete().eq("id", professionalToDelete.id);
      if (error) { 
        if (error.code === "23503") { 
          toast({ title: "Não é possível excluir", description: "Vinculado a agendamentos.", variant: "destructive" }); 
        } else throw error; 
      } else { 
        toast({ title: "Profissional excluído" }); 
        loadProfessionals(); 
        refreshUsage();
      }
    } catch { 
      toast({ title: "Erro", variant: "destructive" }); 
    } finally { 
      setDeleting(false); 
      setProfessionalToDelete(null); 
    }
  };

  const loadProfessionals = async () => {
    try {
      const { data: clinic } = await supabase.from("barbershops").select("id").eq("owner_id", user?.id).single();
      if (!clinic) return;
      const { data, error } = await supabase.from("barbers").select("*").eq("barbershop_id", clinic.id).order("name");
      if (error) throw error;
      setProfessionals(data || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { if (user) loadProfessionals(); }, [user]);

  const handleAddClick = () => {
    if (!canAddProfessional()) {
      setShowUpgradePrompt(true);
      return false;
    }
    return true;
  };

  const limits = getProfessionalsLimit();

  if (loading || subscriptionLoading) return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium">Profissionais</h1>
          <p className="text-sm text-muted-foreground">Gerencie sua equipe</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <PlanLimitIndicator current={limits.current} max={limits.max} label="Profissionais" />
          <AddProfessionalDialog 
            onProfessionalAdded={() => { loadProfessionals(); refreshUsage(); }}
            disabled={!canAddProfessional()}
            onDisabledClick={() => setShowUpgradePrompt(true)}
          />
        </div>
      </div>
      
      {professionals.length === 0 ? (
        <Card className="p-8 text-center">
          <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-base font-medium mb-1">Nenhum profissional</h3>
          <p className="text-sm text-muted-foreground mb-3">Adicione profissionais para começar</p>
          <AddProfessionalDialog
            onProfessionalAdded={() => { loadProfessionals(); refreshUsage(); }} 
            disabled={!canAddProfessional()}
            onDisabledClick={() => setShowUpgradePrompt(true)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {professionals.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start gap-3">
                  <Avatar className="w-12 h-12 mx-auto sm:mx-0">
                    {p.photo_url && <AvatarImage src={p.photo_url} alt={p.name} />}
                    <AvatarFallback className="bg-secondary text-sm font-medium text-icon">
                      {p.name.split(' ').map((n: string) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center sm:text-left min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                      <h3 className="text-sm font-medium truncate">{p.name}</h3>
                      <div className="flex items-center gap-1 justify-center sm:justify-end">
                        <EditProfessionalDialog professional={p} onProfessionalUpdated={loadProfessionals} />
                        <Button variant="ghost" size="icon" onClick={() => setProfessionalToDelete(p)} className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{p.specialty || "Profissional"}</p>
                    {p.phone && (
                      <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs mb-2">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{p.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-center sm:justify-start gap-4 pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Comissão</p>
                        <p className="text-base font-semibold">{p.commission_percent}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-xs font-medium text-green-600">{p.is_active ? "Ativo" : "Inativo"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      <AlertDialog open={!!professionalToDelete} onOpenChange={() => setProfessionalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Excluir o especialista "{professionalToDelete?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradePrompt 
        open={showUpgradePrompt} 
        onOpenChange={setShowUpgradePrompt}
        feature="professionals"
        currentPlan={plan?.name}
      />
    </div>
  );
};

export default Professionals;
