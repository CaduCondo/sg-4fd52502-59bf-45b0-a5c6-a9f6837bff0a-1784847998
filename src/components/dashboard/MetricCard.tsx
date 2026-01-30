import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  isCurrency?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  iconBgClass = "bg-primary/10",
  borderColorClass = "border-l-primary",
  isCurrency = false,
}: MetricCardProps) {
  return (
    <Card className={cn("border-l-4 shadow-sm hover:shadow-md transition-shadow", borderColorClass)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-full", iconBgClass)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {isCurrency && typeof value === "number"
            ? value.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })
            : value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}