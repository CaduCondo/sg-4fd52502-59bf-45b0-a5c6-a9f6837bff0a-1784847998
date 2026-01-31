import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export interface FinancialMetricCardProps {
  title: string;
  value: string | number | React.ReactNode;
  subtitle?: string | ReactNode;
  icon: LucideIcon;
  iconColor: string;
  iconBgClass: string;
  borderColorClass: string;
  valueClassName?: string;
  clickable?: boolean;
}

export function FinancialMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBgClass,
  borderColorClass,
  valueClassName,
  clickable = false,
}: FinancialMetricCardProps) {
  const displayValue = typeof value === "number" ? value.toLocaleString("pt-BR") : value;

  return (
    <Card className={cn(
      "border-l-4 transition-all duration-200 h-full",
      clickable && "cursor-pointer hover:shadow-md active:scale-[0.98]",
      borderColorClass
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className={cn(
              "p-2 rounded-lg flex-shrink-0 shadow-sm",
              iconBgClass
            )}>
              <Icon className={cn("h-5 w-5", iconColor)} />
            </div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </div>
          </div>

          <div className={cn(
            "text-xl sm:text-2xl font-bold text-foreground leading-tight",
            "whitespace-nowrap overflow-hidden text-ellipsis text-left",
            valueClassName
          )}>
            {displayValue}
          </div>

          {subtitle && (
            <div className="text-xs text-muted-foreground leading-snug">
              {subtitle}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}