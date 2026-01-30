import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  secondaryInfo?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgClass: string;
  borderColorClass: string;
  layout?: "vertical" | "horizontal";
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
}: MetricCardProps) {
  const displayValue = typeof value === "string" ? value : value.toLocaleString("pt-BR");

  if (layout === "horizontal") {
    return (
      <Card className={cn("border-l-4 hover:shadow-md transition-all duration-200", borderColorClass)}>
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            {/* Ícone à esquerda */}
            <div className={cn("p-2.5 rounded-lg flex-shrink-0", iconBgClass)}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
            
            {/* Conteúdo alinhado à esquerda */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-1 leading-tight">
                {title}
              </p>
              <p className="text-2xl font-bold text-foreground leading-tight">
                {displayValue}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1 leading-tight">
                  {subtitle}
                </p>
              )}
              {secondaryInfo && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-tight">
                  {secondaryInfo}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-l-4 hover:shadow-md transition-all duration-200", borderColorClass)}>
      <CardContent className="p-6">
        <div className="space-y-3">
          {/* Título */}
          <p className="text-sm font-medium text-muted-foreground">
            {title}
          </p>

          {/* Valor com ícone */}
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg flex-shrink-0", iconBgClass)}>
              <Icon className={cn("h-4 w-4", iconColor)} />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {displayValue}
            </p>
          </div>

          {/* Informações secundárias */}
          {subtitle && (
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
          {secondaryInfo && (
            <p className="text-xs text-muted-foreground font-medium">
              {secondaryInfo}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}