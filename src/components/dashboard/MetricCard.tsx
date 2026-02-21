import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { memo } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgClass?: string;
  borderColorClass?: string;
  clickable?: boolean;
}

export const MetricCard = memo(function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-blue-600",
  iconBgClass = "bg-blue-50",
  borderColorClass = "border-l-blue-500",
  clickable = false,
}: MetricCardProps) {
  return (
    <Card 
      className={`border-l-4 ${borderColorClass} ${clickable ? "hover:shadow-lg transition-shadow cursor-pointer" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate mb-1">{title}</p>
            <p className="text-2xl font-bold text-foreground truncate">{value}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>
          </div>
          <div className={`${iconBgClass} p-2.5 rounded-lg flex-shrink-0`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});