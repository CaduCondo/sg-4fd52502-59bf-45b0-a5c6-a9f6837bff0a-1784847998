import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number | ReactNode;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgClass?: string;
  borderColorClass?: string;
  secondaryValue?: string | number;
  isCurrency?: boolean;
  layout?: "vertical" | "horizontal";
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-blue-600",
  iconBgClass = "bg-blue-50",
  borderColorClass = "border-l-blue-500",
  secondaryValue,
  isCurrency = false,
  layout = "vertical",
  className,
}: MetricCardProps) {
  const formattedValue = isCurrency && typeof value === "number"
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : value;

  return (
    <Card className={cn(borderColorClass ? `border-l-4 ${borderColorClass}` : "", className)}>
      <CardContent className="p-4">
        {layout === "horizontal" ? (
          <div className="flex items-center gap-4">
            <div className={cn("p-3 rounded-full shrink-0", iconBgClass)}>
              <Icon className={cn("h-6 w-6", iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold truncate">{formattedValue}</div>
                {secondaryValue && (
                  <span className="text-xs text-muted-foreground truncate">
                    {typeof secondaryValue === 'number' 
                      ? secondaryValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : secondaryValue}
                  </span>
                )}
              </div>
              {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn("p-2 rounded-full", iconBgClass)}>
                <Icon className={cn("h-4 w-4", iconColor)} />
              </div>
              <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            </div>
            
            <div className="mt-auto">
              <div className="text-2xl font-bold break-words">{formattedValue}</div>
              {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}