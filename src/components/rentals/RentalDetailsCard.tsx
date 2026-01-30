import { Rental, Property, Tenant } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, User, Calendar, DollarSign, FileText, Car, UserCheck, Coins } from "lucide-react";
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
              {rental.properties?.locations?.name || property?.location || "N/A"} - {rental.properties?.complement || property?.complement || "S/N"}
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
            <p className="text-sm">
              <span className="text-muted-foreground">Dia do Pagamento:</span> {rental.paymentDay}
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
              <span className="text-muted-foreground">Aluguel Base:</span>{" "}
              {formatCurrency(rental.rentAmount || rental.value || 0)}
            </p>
            {rental.hasGarage && rental.garageValue && rental.garageValue > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <Car className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Vaga Garagem:</span>
                <span>{formatCurrency(rental.garageValue)}</span>
              </div>
            )}
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
            <p className="text-sm font-medium pt-1 border-t">
              <span className="text-muted-foreground">Total Mensal:</span>{" "}
              {formatCurrency(rental.value || 0)}
            </p>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <UserCheck className="h-4 w-4" />
            Informações Adicionais
          </div>
          <div className="ml-6 space-y-1">
            {rental.hasGarage && (
              <div className="flex items-center gap-2 text-sm">
                <Car className="h-3 w-3 text-green-600" />
                <span className="text-green-600 font-medium">Possui Vaga de Garagem</span>
                {rental.garageValue && rental.garageValue > 0 && (
                  <span className="text-muted-foreground">- {formatCurrency(rental.garageValue)}</span>
                )}
              </div>
            )}
            {rental.hasPartnerBroker && (
              <div className="flex items-center gap-2 text-sm">
                <UserCheck className="h-3 w-3 text-blue-600" />
                <span className="text-blue-600 font-medium">Possui Corretor Parceiro</span>
              </div>
            )}
          </div>
        </div>

        {/* Informações da Caução */}
        {rental.depositAmount && rental.depositAmount > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Coins className="h-4 w-4" />
              Informações da Caução
            </div>
            <div className="ml-6 space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Valor Total:</span>{" "}
                {formatCurrency(rental.depositAmount)}
              </p>
              
              {rental.depositInstallments && rental.depositInstallments > 1 ? (
                <>
                  <p className="text-sm font-medium text-blue-600">
                    Caução Parcelado em {rental.depositInstallments}x
                  </p>
                  
                  {/* 1ª Parcela */}
                  {rental.depositInstallment1 && (
                    <div className="pl-4 border-l-2 border-blue-200 space-y-1">
                      <p className="text-sm font-medium">1ª Parcela:</p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Valor:</span>{" "}
                        {formatCurrency(rental.depositInstallment1)}
                      </p>
                      {rental.depositPaymentDate && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Data Pagamento:</span>{" "}
                          {format(formatDateLocal(rental.depositPaymentDate), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                      {rental.depositPixCode && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Código PIX:</span>{" "}
                          {rental.depositPixCode}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 2ª Parcela */}
                  {rental.depositInstallment2 && (
                    <div className="pl-4 border-l-2 border-blue-200 space-y-1">
                      <p className="text-sm font-medium">2ª Parcela:</p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Valor:</span>{" "}
                        {formatCurrency(rental.depositInstallment2)}
                      </p>
                      {rental.depositInstallment2PaymentDate && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Data Pagamento:</span>{" "}
                          {format(formatDateLocal(rental.depositInstallment2PaymentDate), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                      {rental.depositInstallment2PixCode && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Código PIX:</span>{" "}
                          {rental.depositInstallment2PixCode}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 3ª Parcela */}
                  {rental.depositInstallment3 && (
                    <div className="pl-4 border-l-2 border-blue-200 space-y-1">
                      <p className="text-sm font-medium">3ª Parcela:</p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Valor:</span>{" "}
                        {formatCurrency(rental.depositInstallment3)}
                      </p>
                      {rental.depositInstallment3PaymentDate && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Data Pagamento:</span>{" "}
                          {format(formatDateLocal(rental.depositInstallment3PaymentDate), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                      {rental.depositInstallment3PixCode && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Código PIX:</span>{" "}
                          {rental.depositInstallment3PixCode}
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-green-600">Caução à Vista</p>
                  {rental.depositPaymentDate && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Data Pagamento:</span>{" "}
                      {format(formatDateLocal(rental.depositPaymentDate), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                  {rental.depositPixCode && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Código PIX:</span>{" "}
                      {rental.depositPixCode}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}