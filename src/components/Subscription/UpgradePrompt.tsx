import { ArrowUpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface UpgradePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: string;
  currentPlan?: string;
  description?: string;
}

export function UpgradePrompt({ 
  open, 
  onOpenChange, 
  feature, 
  currentPlan = "Básico",
  description 
}: UpgradePromptProps) {
  const navigate = useNavigate();

  const defaultDescriptions: Record<string, string> = {
    professionals: "Você atingiu o limite de profissionais do seu plano.",
    clients: "Você atingiu o limite de clientes do seu plano.",
    portfolio: "O portfólio não está disponível no seu plano atual.",
    portfolio_images: "Você atingiu o limite de imagens do portfólio.",
    custom_colors: "Cores personalizadas não estão disponíveis no seu plano.",
    day_blocking: "O bloqueio de dias não está disponível no seu plano.",
    date_filter: "O filtro de período não está disponível no seu plano."
  };

  const handleUpgrade = () => {
    onOpenChange(false);
    navigate("/vendas");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ArrowUpCircle className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Faça um Upgrade</DialogTitle>
          <DialogDescription className="text-center">
            {description || defaultDescriptions[feature] || "Este recurso requer um plano superior."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">Seu plano atual</p>
          <p className="font-semibold">{currentPlan}</p>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleUpgrade} className="w-full">
            <ArrowUpCircle className="w-4 h-4 mr-2" />
            Ver Planos
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
