import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Trash2, Phone, Mail, FileText } from "lucide-react";
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
        return "bg-blue-500 text-white hover:bg-blue-600";
      case "rented":
      case "locatario":
        return "bg-blue-500 text-white hover:bg-blue-600";
      case "inactive":
        return "bg-red-500 text-white hover:bg-red-600";
      default:
        return "bg-gray-500 text-white hover:bg-gray-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "rented":
      case "locatario":
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
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 flex-1">
              <User className="h-12 w-12 text-gray-400" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <h3 className="text-2xl font-normal text-blue-600 mb-4">{tenant.name}</h3>
                <div className="flex items-center gap-8 text-gray-500">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
                    <span className="text-base">CPF: {tenant.document || tenant.cpf || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
                    <span className="text-base truncate max-w-[250px]">{tenant.email || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
                    <span className="text-base">{tenant.phone || "N/A"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className={`${getStatusColor(tenant.status)} px-6 py-2 text-base font-medium rounded-lg`}>
                {getStatusLabel(tenant.status)}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-5 w-5" strokeWidth={2} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer bg-white dark:bg-gray-800 relative" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <User className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
            <h3 className="text-2xl font-normal text-blue-600">{tenant.name}</h3>
          </div>
          <Badge className={`${getStatusColor(tenant.status)} px-4 py-1.5 text-sm font-medium rounded-lg`}>
            {getStatusLabel(tenant.status)}
          </Badge>
        </div>
        
        <div className="space-y-4 text-gray-500">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
            <span className="text-base">CPF: {tenant.document || tenant.cpf || "N/A"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
            <span className="text-base truncate">{tenant.email || "N/A"}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-400" strokeWidth={1.5} />
            <span className="text-base">{tenant.phone || "N/A"}</span>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-4 right-4 h-12 w-12 bg-red-500 hover:bg-red-600 text-white rounded-lg"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-5 w-5" strokeWidth={2} />
        </Button>
      </CardContent>
    </Card>
  );
}