import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string | ReactNode;
  secondaryInfo?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgClass: string;
  borderColorClass: string;
  layout?: "vertical" | "horizontal";
  valueClassName?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  secondaryInfo,
  icon: Icon,
  iconColor,
  iconBgClass,
  borderColorClass,
  layout = "vertical",
  valueClassName,
}: MetricCardProps) {
  const displayValue = typeof value === "string" ? value : value.toLocaleString("pt-BR");

  if (layout === "horizontal") {
    return (
      <Card className={cn("border-l-4 hover:shadow-md transition-all duration-200 h-full", borderColorClass)}>
        <CardContent className="p-4 flex items-start gap-3">
          {/* Ícone à esquerda - mais compacto */}
          <div className={cn("p-2 rounded-lg flex-shrink-0 mt-1", iconBgClass)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          
          {/* Conteúdo alinhado à esquerda */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-xs font-medium text-muted-foreground mb-0.5 leading-tight">
              {title}
            </p>
            <p className={cn("text-xl font-bold text-foreground leading-tight tracking-tight", valueClassName)}>
              {displayValue}
            </p>
            {subtitle && (
              <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {subtitle}
              </div>
            )}
            {secondaryInfo && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                {secondaryInfo}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-l-4 hover:shadow-md transition-all duration-200 h-full", borderColorClass)}>
      <CardContent className="p-5">
        <div className="space-y-2">
          {/* Título */}
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>

          {/* Valor com ícone */}
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-md flex-shrink-0", iconBgClass)}>
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
            <p className={cn("text-2xl font-bold text-foreground", valueClassName)}>
              {displayValue}
            </p>
          </div>

          {/* Informações secundárias */}
          <div className="flex flex-col gap-0.5 pt-1">
            {subtitle && (
              <div className="text-xs text-muted-foreground">
                {subtitle}
              </div>
            )}
            {secondaryInfo && (
              <p className="text-xs text-muted-foreground font-medium">
                {secondaryInfo}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}