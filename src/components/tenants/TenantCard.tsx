import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Trash2, Phone, Mail, FileText, CreditCard } from "lucide-react";
import { Tenant } from "@/types";

interface TenantCardProps {
  tenant: Tenant;
  onClick: () => void;
  onDelete: () => void;
  viewMode?: "grid" | "list";
}

export function TenantCard({ tenant, onClick, onDelete, viewMode = "grid" }: TenantCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500 hover:bg-green-600";
      case "rented":
        return "bg-blue-500 hover:bg-blue-600";
      case "inactive":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "rented":
        return "Locatário";
      case "inactive":
        return "Inativo";
      default:
        return status;
    }
  };

  if (viewMode === "list") {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-800" onClick={onClick}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 flex-1">
              <User className="h-10 w-10 text-gray-400" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-xl font-medium text-blue-600">{tenant.name}</h3>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span>CPF: {tenant.document || tenant.cpf || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate max-w-[200px]">{tenant.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{tenant.phone || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`${getStatusColor(tenant.status)} text-white px-4 py-1.5 text-sm font-medium rounded-md`}>
                {getStatusLabel(tenant.status)}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 bg-red-500 hover:bg-red-600 text-white rounded-md"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-800 relative" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
            <h3 className="text-base font-medium text-blue-600">{tenant.name}</h3>
          </div>
          <Badge className={`${getStatusColor(tenant.status)} text-white px-3 py-1 text-xs font-medium rounded-md`}>
            {getStatusLabel(tenant.status)}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
            <span>CPF: {tenant.document || tenant.cpf || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
            <span>RG: {tenant.rg || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
            <span className="truncate">{tenant.email || "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-gray-400" strokeWidth={1.5} />
            <span>{tenant.phone || "N/A"}</span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-3 right-3 h-10 w-10 bg-red-500 hover:bg-red-600 text-white rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </Button>
      </CardContent>
    </Card>
  );
}