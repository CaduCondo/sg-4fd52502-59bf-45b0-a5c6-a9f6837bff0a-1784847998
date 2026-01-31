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
      <Card className={cn(
        "border-l-4 hover:shadow-lg transition-all duration-300 h-full",
        "active:scale-[0.98] sm:hover:scale-[1.01]",
        borderColorClass
      )}>
        <CardContent className="p-4 sm:p-5">
          {/* Mobile: Layout Vertical, Desktop: Layout Horizontal */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            {/* Ícone */}
            <div className={cn(
              "p-2.5 sm:p-3 rounded-xl flex-shrink-0 shadow-sm",
              "w-fit",
              iconBgClass
            )}>
              <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", iconColor)} />
            </div>
            
            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              {/* Título */}
              <div className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {title}
              </div>
              
              {/* Valor */}
              <div className={cn(
                "text-2xl sm:text-3xl font-bold text-foreground leading-tight tracking-tight mb-1",
                "break-words",
                valueClassName
              )}>
                {displayValue}
              </div>
              
              {/* Informações secundárias */}
              {subtitle && (
                <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {subtitle}
                </div>
              )}
              {secondaryInfo && (
                <div className="text-xs sm:text-sm text-muted-foreground font-medium mt-1">
                  {secondaryInfo}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "border-l-4 hover:shadow-lg transition-all duration-300 h-full",
      "active:scale-[0.98] sm:hover:scale-[1.01]",
      borderColorClass
    )}>
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-3">
          {/* Título */}
          <div className="text-xs sm:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </div>

          {/* Valor com ícone */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 sm:p-2.5 rounded-xl flex-shrink-0 shadow-sm",
              iconBgClass
            )}>
              <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", iconColor)} />
            </div>
            <div className={cn(
              "text-2xl sm:text-3xl font-bold text-foreground leading-tight",
              "break-words flex-1 min-w-0",
              valueClassName
            )}>
              {displayValue}
            </div>
          </div>

          {/* Informações secundárias */}
          {(subtitle || secondaryInfo) && (
            <div className="flex flex-col gap-1 pt-1 border-t border-border/50">
              {subtitle && (
                <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {subtitle}
                </div>
              )}
              {secondaryInfo && (
                <div className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {secondaryInfo}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}