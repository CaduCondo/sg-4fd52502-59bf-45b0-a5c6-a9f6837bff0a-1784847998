import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  secondaryValue?: number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgClass?: string;
  borderColorClass?: string;
  isCurrency?: boolean;
  layout?: "horizontal" | "vertical";
}

export function MetricCard({
  title,
  value,
  subtitle,
  secondaryValue,
  icon: Icon,
  iconColor = "text-blue-600",
  iconBgClass = "bg-blue-50",
  borderColorClass = "border-l-blue-500",
  isCurrency = false,
  layout = "horizontal",
}: MetricCardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === "string") return val;
    
    if (isCurrency) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(val);
    }
    
    return val.toString();
  };

  const formatSecondaryValue = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  return (
    <Card className={cn("border-l-4 hover:shadow-md transition-shadow", borderColorClass)}>
      <CardContent className="p-6">
        <div className={cn(
          "flex gap-4",
          layout === "vertical" ? "flex-col" : "items-start"
        )}>
          {/* Ícone */}
          <div className={cn("rounded-lg p-3 shrink-0", iconBgClass)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground mb-1 truncate">
              {title}
            </p>
            
            {layout === "vertical" ? (
              // Layout vertical: valor embaixo, alinhado à esquerda
              <div className="space-y-1">
                <p className="text-2xl font-bold text-left break-words">
                  {formatValue(value)}
                </p>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
            ) : (
              // Layout horizontal: valor e subtítulo inline
              <div className="flex items-baseline gap-2 flex-wrap">
                <p className="text-3xl font-bold">
                  {formatValue(value)}
                </p>
                
                {/* Secondary value (small, same line) */}
                {secondaryValue !== undefined && (
                  <span className="text-xs text-muted-foreground font-normal">
                    {formatSecondaryValue(secondaryValue)}
                  </span>
                )}
                
                {/* Subtitle (separator + text) */}
                {subtitle && (
                  <>
                    {secondaryValue !== undefined && (
                      <span className="text-xs text-muted-foreground">•</span>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {subtitle}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}