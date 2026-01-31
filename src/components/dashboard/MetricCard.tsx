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
  clickable?: boolean;
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
  clickable = false,
}: MetricCardProps) {
  const displayValue = typeof value === "number" ? value.toLocaleString("pt-BR") : value;

  if (layout === "horizontal") {
    return (
      <Card className={cn(
        "border-l-4 transition-all duration-200 h-full",
        clickable && "cursor-pointer hover:shadow-md active:scale-[0.98]",
        borderColorClass
      )}>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row sm:items-start gap-2.5">
            <div className={cn(
              "p-2 rounded-lg flex-shrink-0 shadow-sm w-fit",
              iconBgClass
            )}>
              <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {title}
              </div>
              
              <div className={cn(
                "text-xl sm:text-2xl font-bold text-foreground leading-tight tracking-tight mb-0.5",
                "break-words",
                valueClassName
              )}>
                {displayValue}
              </div>
              
              {subtitle && (
                <div className="text-[10px] sm:text-xs text-muted-foreground leading-snug">
                  {subtitle}
                </div>
              )}
              {secondaryInfo && (
                <div className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5">
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
      "border-l-4 transition-all duration-200 h-full",
      clickable && "cursor-pointer hover:shadow-md active:scale-[0.98]",
      borderColorClass
    )}>
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </div>

          <div className="flex items-center gap-2.5">
            <div className={cn(
              "p-2 rounded-lg flex-shrink-0 shadow-sm",
              iconBgClass
            )}>
              <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
            </div>
            <div className={cn(
              "text-xl sm:text-2xl font-bold text-foreground leading-tight",
              "break-words flex-1 min-w-0",
              valueClassName
            )}>
              {displayValue}
            </div>
          </div>

          {(subtitle || secondaryInfo) && (
            <div className="flex flex-col gap-0.5 pt-1 border-t border-border/50">
              {subtitle && (
                <div className="text-[10px] sm:text-xs text-muted-foreground leading-snug">
                  {subtitle}
                </div>
              )}
              {secondaryInfo && (
                <div className="text-[10px] sm:text-xs text-muted-foreground font-medium">
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