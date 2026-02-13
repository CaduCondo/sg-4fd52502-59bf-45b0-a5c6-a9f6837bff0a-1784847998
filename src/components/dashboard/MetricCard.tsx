import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, memo } from "react";

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
  clickable?: boolean;
}

export const MetricCard = memo(function MetricCard({
  title,
  value,
  subtitle,
  secondaryInfo,
  icon: Icon,
  iconColor,
  iconBgClass,
  borderColorClass,
  layout = "horizontal",
  valueClassName,
  clickable = false,
}: MetricCardProps) {
  const displayValue = typeof value === "number" ? value.toLocaleString("pt-BR") : value;

  return (
    <Card className={cn(
      "border-l-4 transition-all duration-200 h-full",
      clickable && "cursor-pointer hover:shadow-md active:scale-[0.98]",
      borderColorClass
    )}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </div>
          
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-lg flex-shrink-0 shadow-sm",
              iconBgClass
            )}>
              <Icon className={cn("h-6 w-6", iconColor)} />
            </div>
            
            <div className={cn(
              "text-3xl font-bold text-foreground",
              valueClassName
            )}>
              {displayValue}
            </div>
          </div>
          
          {(subtitle || secondaryInfo) && (
            <div className="flex flex-col gap-0.5">
              {subtitle && (
                <div className="text-xs text-muted-foreground leading-snug">
                  {subtitle}
                </div>
              )}
              {secondaryInfo && (
                <div className="text-xs text-muted-foreground font-medium">
                  {secondaryInfo}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});