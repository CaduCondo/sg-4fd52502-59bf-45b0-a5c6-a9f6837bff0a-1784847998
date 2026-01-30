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
  return (
    <Card className={cn("border-l-4 hover:shadow-lg transition-shadow", borderColorClass)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn("h-5 w-5 flex-shrink-0", iconColor)} />
              <p className="text-sm font-medium text-muted-foreground truncate">
                {title}
              </p>
            </div>
            <p className="text-2xl font-bold truncate" title={value.toString()}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate" title={subtitle}>
              {subtitle}
            </p>
          </div>
          <div className={cn("p-3 rounded-lg flex-shrink-0", iconBgClass)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}