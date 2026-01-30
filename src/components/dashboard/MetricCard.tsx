import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  iconBgClass: string;
  borderColorClass: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgClass,
  borderColorClass,
}: MetricCardProps) {
  const displayValue = typeof value === "string" ? value : value.toLocaleString("pt-BR");

  return (
    <Card className={cn("border-l-4 hover:shadow-lg transition-all duration-200", borderColorClass)}>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          {/* Header com ícone */}
          <div className="flex items-center justify-between">
            <div className={cn("p-2.5 rounded-lg", iconBgClass)}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
          </div>

          {/* Conteúdo */}
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p className="text-3xl font-bold text-foreground">
              {displayValue}
            </p>
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}