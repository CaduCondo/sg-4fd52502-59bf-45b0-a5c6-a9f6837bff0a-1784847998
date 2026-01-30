import { Rental, Property, Tenant } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, User, Calendar, DollarSign, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/masks";
import { formatDateLocal } from "@/lib/rentalCalculations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RentalDetailsCardProps {
  rental: Rental;
  property: Property | null;
  tenant: Tenant | null;
}

export function RentalDetailsCard({ rental, property, tenant }: RentalDetailsCardProps) {
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      terminated: "destructive",
      pending: "secondary",
    };

    const labels: Record<string, string> = {
      active: "Ativa",
      terminated: "Encerrada",
      pending: "Pendente",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <span>
              {rental.properties?.locations?.name} - {rental.properties?.complement || "S/N"}
            </span>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(rental.status)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Propriedade */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MapPin className="h-4 w-4" />
            Propriedade
          </div>
          {property && (
            <div className="ml-6 space-y-1">
              <p className="text-sm">{property.address}</p>
              {property.neighborhood && (
                <p className="text-sm text-muted-foreground">{property.neighborhood}</p>
              )}
              {property.city && property.state && (
                <p className="text-sm text-muted-foreground">
                  {property.city} - {property.state}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Inquilino */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <User className="h-4 w-4" />
            Inquilino
          </div>
          {tenant && (
            <div className="ml-6 space-y-1">
              <p className="text-sm">{tenant.name}</p>
              {tenant.email && (
                <p className="text-sm text-muted-foreground">{tenant.email}</p>
              )}
              {tenant.phone && (
                <p className="text-sm text-muted-foreground">{tenant.phone}</p>
              )}
            </div>
          )}
        </div>

        {/* Datas */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calendar className="h-4 w-4" />
            Período
          </div>
          <div className="ml-6 space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Início:</span>{" "}
              {rental.startDate
                ? format(formatDateLocal(rental.startDate), "dd/MM/yyyy", { locale: ptBR })
                : "N/A"}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">Término:</span>{" "}
              {rental.endDate
                ? format(formatDateLocal(rental.endDate), "dd/MM/yyyy", { locale: ptBR })
                : "Indeterminado"}
            </p>
            {rental.status === "terminated" && rental.endDate && (
              <p className="text-sm">
                <span className="text-muted-foreground">Encerrado em:</span>{" "}
                {format(formatDateLocal(rental.endDate), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
        </div>

        {/* Valores */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4" />
            Valores
          </div>
          <div className="ml-6 space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Aluguel:</span>{" "}
              {formatCurrency(rental.rentAmount)}
            </p>
            {rental.condominiumFee && rental.condominiumFee > 0 && (
              <p className="text-sm">
                <span className="text-muted-foreground">Condomínio:</span>{" "}
                {formatCurrency(rental.condominiumFee)}
              </p>
            )}
            {rental.iptuFee && rental.iptuFee > 0 && (
              <p className="text-sm">
                <span className="text-muted-foreground">IPTU:</span>{" "}
                {formatCurrency(rental.iptuFee)}
              </p>
            )}
            <p className="text-sm font-medium">
              <span className="text-muted-foreground">Total:</span>{" "}
              {formatCurrency(
                rental.rentAmount +
                  (rental.condominiumFee || 0) +
                  (rental.iptuFee || 0)
              )}
            </p>
          </div>
        </div>

        {/* Parcelas */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Parcelamento</div>
          <div className="ml-6">
            <p className="text-sm">
              <span className="text-muted-foreground">Número de parcelas:</span>{" "}
              {rental.installments}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}