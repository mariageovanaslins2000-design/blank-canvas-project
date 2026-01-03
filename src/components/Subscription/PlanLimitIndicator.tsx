import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanLimitIndicatorProps {
  current: number;
  max: number | null;
  label: string;
  className?: string;
  showIcon?: boolean;
}

export function PlanLimitIndicator({ 
  current, 
  max, 
  label, 
  className,
  showIcon = true 
}: PlanLimitIndicatorProps) {
  if (max === null) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        {showIcon && <Check className="w-4 h-4 text-green-500" />}
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium">{current}</span>
        <span className="text-muted-foreground">/ Ilimitado</span>
      </div>
    );
  }

  const isAtLimit = current >= max;
  const isNearLimit = current >= max * 0.8;

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {showIcon && (
        isAtLimit ? (
          <AlertTriangle className="w-4 h-4 text-destructive" />
        ) : isNearLimit ? (
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
        ) : (
          <Check className="w-4 h-4 text-green-500" />
        )
      )}
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn(
        "font-medium",
        isAtLimit && "text-destructive",
        isNearLimit && !isAtLimit && "text-yellow-600"
      )}>
        {current}
      </span>
      <span className="text-muted-foreground">/ {max}</span>
      {isAtLimit && (
        <span className="text-xs text-destructive font-medium">(Limite atingido)</span>
      )}
    </div>
  );
}
