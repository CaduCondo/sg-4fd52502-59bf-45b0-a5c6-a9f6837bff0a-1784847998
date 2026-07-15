import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, X } from "lucide-react";
import type { Rental, Property, Tenant, Location } from "@/types";
import { formatCurrency } from "@/lib/masks";
import { formatDateLocal } from "@/lib/rentalCalculations";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RentalContractProps {
  rental: Rental;
  property: Property;
  tenant: Tenant;
  location?: Location;
  onClose: () => void;
}

export function RentalContract({
  rental,
  property,
  tenant,
  location,
  onClose,
}: RentalContractProps) {
  const [loading, setLoading] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    setLoading(true);
    setTimeout(() => {
      window.print();
      setLoading(false);
    }, 100);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Comprovante de Contrato de Locação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 print:p-8">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">Contrato de Locação</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Comprovante de Registro - {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-primary">Dados do Imóvel</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Endereço:</span>
                        <p className="font-medium">{location?.name || property.location}</p>
                        {property.complement && (
                          <p className="text-muted-foreground text-xs">{property.complement}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor do Aluguel:</span>
                        <p className="font-medium">{formatCurrency(rental.value)}</p>
                      </div>
                      {rental.hasGarage && (
                        <div>
                          <span className="text-muted-foreground">Valor da Garagem:</span>
                          <p className="font-medium">{formatCurrency(rental.garageValue || 0)}</p>
                        </div>
                      )}
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground">Valor Total:</span>
                        <p className="font-bold text-lg text-primary">
                          {formatCurrency((rental.value || 0) + (rental.hasGarage && rental.garageValue ? rental.garageValue : 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-primary">Dados do Inquilino</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nome:</span>
                        <p className="font-medium">{tenant.name}</p>
                      </div>
                      {tenant.cpf && (
                        <div>
                          <span className="text-muted-foreground">CPF:</span>
                          <p className="font-medium">{tenant.cpf}</p>
                        </div>
                      )}
                      {tenant.phone && (
                        <div>
                          <span className="text-muted-foreground">Telefone:</span>
                          <p className="font-medium">{tenant.phone}</p>
                        </div>
                      )}
                      {tenant.email && (
                        <div>
                          <span className="text-muted-foreground">E-mail:</span>
                          <p className="font-medium">{tenant.email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-3 text-primary">Dados do Contrato</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Data de Início:</span>
                    <p className="font-medium">
                      {rental.startDate
                        ? format(formatDateLocal(rental.startDate), "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data de Término:</span>
                    <p className="font-medium">
                      {rental.endDate
                        ? format(formatDateLocal(rental.endDate), "dd/MM/yyyy", {
                            locale: ptBR,
                          })
                        : "Indeterminado"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dia de Pagamento:</span>
                    <p className="font-medium">Dia {rental.paymentDay}</p>
                  </div>
                </div>
              </div>

              {rental.contractAttachments && rental.contractAttachments.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-3 text-primary">Anexos</h3>
                  <div className="text-sm text-muted-foreground">
                    {rental.contractAttachments.length} arquivo(s) anexado(s)
                  </div>
                </div>
              )}

              <div className="border-t pt-4 text-xs text-muted-foreground text-center">
                <p>
                  Este é um comprovante de registro do contrato de locação no sistema.
                </p>
                <p>
                  Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 print:hidden">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
            <Button onClick={handleDownload} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              {loading ? "Gerando..." : "Baixar/Imprimir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}