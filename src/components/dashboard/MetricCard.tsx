import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export interface MetricCardProps {
  title: string;
  value: string | number | React.ReactNode;
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
  const displayValue = typeof value === "number" ? value.toLocaleString("pt-BR") : value;

  if (layout === "horizontal") {
    return (
      <Card className={cn("border-l-4 hover:shadow-md transition-all duration-200 h-full", borderColorClass)}>
        <CardContent className="p-4">
          {/* Linha 1: Ícone + Título */}
          <div className="flex items-start gap-3 mb-2">
            <div className={cn("p-2 rounded-lg flex-shrink-0", iconBgClass)}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
            <div className="text-xs font-medium text-muted-foreground leading-tight pt-1">
              {title}
            </div>
          </div>
          
          {/* Linha 2: Valor grande alinhado à esquerda */}
          <div className="pl-0">
            <div className={cn("text-2xl font-bold text-foreground leading-tight tracking-tight", valueClassName)}>
              {displayValue}
            </div>
            {subtitle && (
              <div className="text-xs text-muted-foreground mt-1 leading-tight">
                {subtitle}
              </div>
            )}
            {secondaryInfo && (
              <div className="text-xs text-muted-foreground mt-1 leading-tight">
                {secondaryInfo}
              </div>
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
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </div>

          {/* Valor com ícone */}
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-md flex-shrink-0", iconBgClass)}>
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
            <div className={cn("text-2xl font-bold text-foreground", valueClassName)}>
              {displayValue}
            </div>
          </div>

          {/* Informações secundárias */}
          <div className="flex flex-col gap-0.5 pt-1">
            {subtitle && (
              <div className="text-xs text-muted-foreground">
                {subtitle}
              </div>
            )}
            {secondaryInfo && (
              <div className="text-xs text-muted-foreground font-medium">
                {secondaryInfo}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}