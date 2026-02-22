import { useMemo, memo, useCallback } from "react";
import { Rental, Property, Tenant } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, User, DollarSign, FileText, Car, Coins, Banknote } from "lucide-react";
import { formatCurrency } from "@/lib/masks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RentalAttachmentsDialog } from "./RentalAttachmentsDialog";

interface RentalDetailsCardProps {
  rental: Rental;
  property: Property | null;
  tenant: Tenant | null;
}

// Helper para formatar data de forma segura
const safeDate = (dateString?: string) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
};

// Componente de seção de informação
const InfoSection = memo(({ icon: Icon, title, children }: { 
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      <Icon className="h-4 w-4" />
      {title}
    </div>
    {children}
  </div>
));
InfoSection.displayName = "InfoSection";

// Componente de parcela de caução
const DepositInstallment = memo(({ 
  label, 
  value, 
  date, 
  pixCode 
}: { 
  label: string;
  value: number;
  date?: string;
  pixCode?: string;
}) => (
  <div className="p-3 bg-white rounded border border-slate-200 text-sm">
    <div className="flex justify-between items-center mb-1">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="font-bold text-green-600">{formatCurrency(value)}</span>
    </div>
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      {date && <span>Vencimento: {safeDate(date)}</span>}
      {pixCode && <span className="truncate block">PIX: {pixCode}</span>}
    </div>
  </div>
));
DepositInstallment.displayName = "DepositInstallment";

export const RentalDetailsCard = memo(function RentalDetailsCard({ rental, property, tenant }: RentalDetailsCardProps) {
  // Badge de status
  const getStatusBadge = useCallback((status: string) => {
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
  }, []);

  // Verifica se o contrato está expirado
  const isExpired = useMemo(() => {
    if (!rental.endDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(rental.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  }, [rental.endDate]);

  // Status efetivo
  const effectiveStatus = useMemo(() => 
    isExpired || !rental.isActive ? "terminated" : "active",
    [isExpired, rental.isActive]
  );

  // Determinar se tem caução
  const hasDeposit = useMemo(() => 
    (rental.depositAmount && rental.depositAmount > 0) || 
    (rental.depositInstallments && rental.depositInstallments > 0) ||
    (rental.depositInstallment1 && rental.depositInstallment1 > 0),
    [rental.depositAmount, rental.depositInstallments, rental.depositInstallment1]
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>Detalhes da Locação</span>
          </div>
          <div className="flex gap-2">
            <Badge variant={effectiveStatus === "active" ? "default" : "secondary"}>
              {effectiveStatus === "active" ? "Ativo" : "Encerrado"}
            </Badge>
            {rental.endDate && getStatusBadge(effectiveStatus)}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Propriedade */}
        <InfoSection icon={MapPin} title="Propriedade">
          {property ? (
            <div className="ml-6 space-y-1 text-sm text-slate-600">
              <p className="font-medium text-slate-900">
                {property.location} {property.complement ? `- ${property.complement}` : ''}
              </p>
              <p>{property.address}, {property.number}</p>
              <p>{property.neighborhood} - {property.city}/{property.state}</p>
              <p>CEP: {property.zipCode}</p>
            </div>
          ) : (
            <p className="ml-6 text-sm text-muted-foreground">Informações indisponíveis</p>
          )}
        </InfoSection>

        {/* Inquilino */}
        <InfoSection icon={User} title="Inquilino">
          {tenant ? (
            <div className="ml-6 space-y-1 text-sm text-slate-600">
              <p className="font-medium text-slate-900">{tenant.name}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <p>CPF: {tenant.cpf}</p>
                <p>RG: {tenant.rg}</p>
                <p>Tel: {tenant.phone}</p>
                <p>Email: {tenant.email}</p>
              </div>
            </div>
          ) : (
            <p className="ml-6 text-sm text-muted-foreground">Informações indisponíveis</p>
          )}
        </InfoSection>

        {/* Valores e Prazos */}
        <InfoSection icon={DollarSign} title="Valores e Prazos">
          <div className="ml-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Valor do Aluguel</p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(rental.value || 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Dia do Vencimento</p>
              <p className="font-medium text-slate-900">Dia {rental.paymentDay}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Início do Contrato</p>
              <p className="font-medium text-slate-900">{safeDate(rental.startDate)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fim do Contrato</p>
              <p className="font-medium text-slate-900">
                {rental.endDate ? safeDate(rental.endDate) : "Indeterminado"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Renovação Automática</p>
              <p className="font-medium text-slate-900">
                {rental.autoRenew ? "Sim" : "Não"}
              </p>
            </div>
          </div>
        </InfoSection>

        {/* Adicionais */}
        <InfoSection icon={Car} title="Adicionais">
          <div className="ml-6 space-y-2">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={rental.hasGarage} readOnly className="rounded border-gray-300 pointer-events-none" />
              <span className="text-sm">Possui vaga de garagem</span>
              {rental.hasGarage && rental.garageValue && (
                <span className="text-sm font-semibold text-green-600 ml-2">
                  (+ {formatCurrency(rental.garageValue)})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={rental.hasPartnerBroker} readOnly className="rounded border-gray-300 pointer-events-none" />
              <span className="text-sm">Corretor Parceiro</span>
            </div>
          </div>
        </InfoSection>

        {/* Caução */}
        {hasDeposit && (
          <InfoSection icon={Coins} title="Garantia (Caução)">
            <div className="ml-6 space-y-4">
              {rental.depositInstallments && rental.depositInstallments > 1 ? (
                <div className="space-y-3">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Parcelado em {rental.depositInstallments}x
                  </Badge>

                  <div className="grid grid-cols-1 gap-3">
                    {rental.depositInstallment1 && rental.depositInstallment1 > 0 && (
                      <DepositInstallment
                        label="1ª Parcela"
                        value={rental.depositInstallment1}
                        date={rental.depositPaymentDate}
                        pixCode={rental.depositPixCode}
                      />
                    )}
                    {rental.depositInstallment2 && rental.depositInstallment2 > 0 && (
                      <DepositInstallment
                        label="2ª Parcela"
                        value={rental.depositInstallment2}
                        date={rental.depositInstallment2PaymentDate}
                        pixCode={rental.depositInstallment2PixCode}
                      />
                    )}
                    {rental.depositInstallment3 && rental.depositInstallment3 > 0 && (
                      <DepositInstallment
                        label="3ª Parcela"
                        value={rental.depositInstallment3}
                        date={rental.depositInstallment3PaymentDate}
                        pixCode={rental.depositInstallment3PixCode}
                      />
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white rounded border border-slate-200 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-slate-900">Pagamento à Vista</span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex justify-between">
                      <span>Valor:</span>
                      <span className="font-medium">{formatCurrency(rental.depositAmount || 0)}</span>
                    </p>
                    {rental.depositPaymentDate && (
                      <p className="flex justify-between">
                        <span>Data Pagamento:</span>
                        <span>{safeDate(rental.depositPaymentDate)}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </InfoSection>
        )}

        {/* Anexos */}
        <div className="pt-4 border-t">
          <RentalAttachmentsDialog
            rentalId={rental.id}
            attachments={rental.attachments || []}
            onAttachmentsUpdate={() => {
              // Força atualização da página de locações
              window.location.reload();
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
});