import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import { Tenant } from "@/types";

interface TenantCardProps {
  tenant: Tenant;
  onClick: () => void;
  onDelete: () => void;
  viewMode?: "grid" | "list";
}

export function TenantCard({ tenant, onClick, onDelete, viewMode = "grid" }: TenantCardProps) {
  const getStatusBadge = (status: Tenant["status"]) => {
    switch (status) {
      case "locatario":
        return <Badge className="bg-blue-500">Locatário</Badge>;
      case "active":
        return <Badge className="bg-green-500">Ativo</Badge>;
      case "inactive":
        return <Badge className="bg-gray-500">Inativo</Badge>;
      default:
        return <Badge className="bg-gray-500">{status}</Badge>;
    }
  };

  if (viewMode === "list") {
    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">{tenant.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{tenant.document}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="text-sm">{tenant.phone || "N/A"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm truncate max-w-[200px]">{tenant.email || "N/A"}</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(tenant.status)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{tenant.name}</CardTitle>
          </div>
          {getStatusBadge(tenant.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">CPF/CNPJ:</span>
            <span className="font-medium">{tenant.document}</span>
          </div>
          {tenant.phone && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Telefone:</span>
              <span className="font-medium">{tenant.phone}</span>
            </div>
          )}
          {tenant.email && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium truncate">{tenant.email}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}