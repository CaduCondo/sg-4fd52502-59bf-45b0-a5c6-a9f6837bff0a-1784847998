import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Trash2, Phone, Mail } from "lucide-react";
import { Tenant } from "@/types";

interface TenantCardProps {
  tenant: Tenant;
  onClick: () => void;
  onDelete: () => void;
}

export function TenantCard({ tenant, onClick, onDelete }: TenantCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "locatario":
      case "rented":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "inactive":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "locatario":
      case "rented":
        return "Locatário";
      case "inactive":
        return "Inativo";
      default:
        return status;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer relative" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-blue-600">{tenant.name}</h3>
            </div>
          </div>
          <Badge className={getStatusColor(tenant.status)} variant="outline">
            {getStatusLabel(tenant.status)}
          </Badge>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            <span>{tenant.phone || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span className="truncate max-w-[200px]">{tenant.email || "N/A"}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-2 right-2 h-8 w-8 text-destructive hover:text-destructive/90"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}