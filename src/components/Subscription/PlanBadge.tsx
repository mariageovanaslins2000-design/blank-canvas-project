import { Crown, Star, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlanBadgeProps {
  planName: string | null;
  className?: string;
}

export function PlanBadge({ planName, className }: PlanBadgeProps) {
  if (!planName) {
    return (
      <Badge variant="outline" className={cn("text-xs", className)}>
        Sem plano
      </Badge>
    );
  }

  const planLower = planName.toLowerCase();

  if (planLower.includes("premium")) {
    return (
      <Badge className={cn("bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0", className)}>
        <Crown className="w-3 h-3 mr-1" />
        Premium
      </Badge>
    );
  }

  if (planLower.includes("profissional")) {
    return (
      <Badge className={cn("bg-gradient-to-r from-blue-500 to-cyan-400 text-white border-0", className)}>
        <Star className="w-3 h-3 mr-1" />
        Profissional
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className={cn("", className)}>
      <Zap className="w-3 h-3 mr-1" />
      Básico
    </Badge>
  );
}
