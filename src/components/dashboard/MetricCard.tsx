import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { FloatingCard } from "@/components/animations/FloatingCard";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  borderColor: string;
  iconColor: string;
  onClick?: () => void;
  delay?: number;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  borderColor,
  iconColor,
  onClick,
  delay = 0
}: MetricCardProps) {
  return (
    <FloatingCard delay={delay}>
      <Card
        className={`cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${borderColor} h-full`}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        </CardContent>
      </Card>
    </FloatingCard>
  );
}