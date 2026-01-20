import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, FileText, CreditCard, Mail, Phone, Trash2 } from "lucide-react";
import { Tenant } from "@/types";

interface TenantCardProps {
  tenant: Tenant;
  onClick: () => void;
  onDelete: () => void;
}

export function TenantCard({ tenant, onClick, onDelete }: TenantCardProps) {
  const statusConfig = {
    active: { label: "Ativo", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
    inactive: { label: "Inativo", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100" },
    rented: { label: "Alugado", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  }[tenant.status] || { label: "Ativo", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" };

  const formatDocument = (tenant: Tenant) => {
    if (tenant.document_type === "cpf" && tenant.cpf) {
      return `CPF: ${tenant.cpf}`;
    }
    if (tenant.document_type === "cnpj" && (tenant.cnpj || tenant.document)) {
      return `CNPJ: ${tenant.cnpj || tenant.document}`;
    }
    return "";
  };

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer relative" onClick={onClick}>
      <CardContent className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-blue-600 hover:text-blue-700">{tenant.name}</span>
          </div>
          <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
        </div>

        {(tenant.cpf || tenant.cnpj) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{formatDocument(tenant)}</span>
          </div>
        )}

        {tenant.rg && tenant.document_type === "cpf" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>RG: {tenant.rg}</span>
          </div>
        )}

        {tenant.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span className="truncate">{tenant.email}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{tenant.phone}</span>
        </div>

        <div className="absolute bottom-4 right-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}