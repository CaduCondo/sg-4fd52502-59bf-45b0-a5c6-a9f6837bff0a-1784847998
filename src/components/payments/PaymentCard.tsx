import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Home, User, Calendar, X, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/masks";
import type { Payment, Property, Tenant } from "@/types";

interface PaymentCardProps {
  payment: Payment;
  property: Property | null;
  tenant: Tenant | null;
  isPaid: boolean;
  viewMode: "grid" | "list";
  installment: string;
  expectedAmount: number;
  onCardClick: (paymentId: string) => void;
  onCancelPayment?: (paymentId: string, e: React.MouseEvent) => void;
  onViewReceipt?: (paymentId: string, e: React.MouseEvent) => void;
  getMonthName: (month: number) => string;
}

export function PaymentCard({
  payment,
  property,
  tenant,
  isPaid,
  viewMode,
  installment,
  expectedAmount,
  onCardClick,
  onCancelPayment,
  onViewReceipt,
  getMonthName,
}: PaymentCardProps) {
  const getStatusBadge = (status: Payment["status"]) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Pago</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500">Parcial</Badge>;
      case "overdue":
        return <Badge className="bg-red-500">Atrasado</Badge>;
      default:
        return <Badge className="bg-gray-500">Pendente</Badge>;
    }
  };

  // Calcular valor restante para pagamentos parciais
  const isPartial = payment.status === "partial";
  const remainingAmount = isPartial ? expectedAmount - payment.paidAmount : expectedAmount;
  const displayAmount = isPaid ? payment.paidAmount : remainingAmount;

  const getDueDateColor = (dueDate: string): { border: string; icon: string; amount: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dueDate + "T00:00:00");
    due.setHours(0, 0, 0, 0);
    
    if (due < today) {
      return { 
        border: "border-l-red-500", 
        icon: "text-red-600", 
        amount: "text-red-600" 
      };
    } else if (due.getTime() === today.getTime()) {
      return { 
        border: "border-l-yellow-500", 
        icon: "text-yellow-600", 
        amount: "text-yellow-600" 
      };
    } else {
      return { 
        border: "border-l-blue-500", 
        icon: "text-blue-600", 
        amount: "text-blue-600" 
      };
    }
  };

  const colors = isPaid 
    ? { border: "border-l-green-500", icon: "text-green-600", amount: "text-green-600" }
    : getDueDateColor(payment.dueDate);

  if (viewMode === "grid") {
    return (
      <Card
        className={`hover:shadow-lg transition-shadow cursor-pointer border-l-4 ${colors.border}`}
        onClick={() => onCardClick(payment.id)}
      >
        <CardHeader className="pb-2 p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className={`font-medium text-sm ${!isPaid ? colors.icon : ''}`}>
                  {property?.location || "Imóvel não encontrado"}
                </span>
                {property?.complement && (
                  <p className="text-xs text-muted-foreground">
                    {property.complement}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs text-muted-foreground">
                {getMonthName(payment.referenceMonth)}/{payment.referenceYear}
              </span>
              {getStatusBadge(payment.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-0">
          <div className="flex items-start gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-xs font-medium">{tenant?.name || "N/A"}</p>
              <p className="text-[10px] text-muted-foreground">
                {tenant?.document || "N/A"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs">
              {isPaid ? "Pago em: " : "Vencimento: "}
              {isPaid 
                ? (payment.paymentDate ? new Date(payment.paymentDate + "T12:00:00").toLocaleDateString("pt-BR") : "N/A")
                : new Date(new Date(payment.dueDate).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")
              }
            </p>
            <span className="ml-auto text-xs font-semibold text-muted-foreground">
              Parcela {installment}
            </span>
          </div>

          <div className="pt-2 border-t">
            <p className="text-[10px] text-muted-foreground mb-1">
              {isPaid ? "Valor Pago" : (isPartial ? "Valor Restante" : "Valor Esperado")}
            </p>
            <p className={`text-lg font-bold ${colors.amount}`}>
              {formatCurrency(displayAmount)}
            </p>
          </div>

          {isPartial && payment.paidAmount > 0 && (
            <div className="pt-1 border-t">
              <p className="text-[10px] text-muted-foreground mb-1">Valor Já Pago</p>
              <p className="text-base font-semibold text-green-600">
                {formatCurrency(payment.paidAmount)}
              </p>
            </div>
          )}

          {!isPaid && !isPartial && payment.paidAmount > 0 && (
            <div className="pt-1 border-t">
              <p className="text-[10px] text-muted-foreground mb-1">Valor Pago</p>
              <p className="text-base font-semibold text-yellow-600">
                {formatCurrency(payment.paidAmount)}
              </p>
            </div>
          )}

          {isPaid && onCancelPayment && (
            <div className="pt-2">
              {onViewReceipt && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 text-xs mb-2"
                  onClick={(e) => onViewReceipt(payment.id, e)}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Ver Recibo
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                onClick={(e) => onCancelPayment(payment.id, e)}
              >
                <X className="h-3 w-3 mr-1" />
                Cancelar Pagamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // List view
  return (
    <Card
      className={`hover:shadow-lg transition-shadow cursor-pointer border-l-4 ${colors.border}`}
      onClick={() => onCardClick(payment.id)}
    >
      <CardContent className="py-2 px-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Home className={`h-5 w-5 ${colors.icon} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">
                  {getMonthName(payment.referenceMonth)}/{payment.referenceYear}
                </span>
                {getStatusBadge(payment.status)}
                <span className="text-xs font-semibold text-muted-foreground">
                  {installment}
                </span>
              </div>
              <h3 className={`text-sm font-semibold truncate ${!isPaid ? colors.icon : ''}`}>
                {property?.location || "N/A"}
              </h3>
              {property?.complement && (
                <p className="text-xs text-muted-foreground truncate">{property.complement}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Inquilino</p>
              <p className="text-sm font-medium">{tenant?.name || "N/A"}</p>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {isPaid ? "Pago em" : "Vencimento"}
              </p>
              <p className="text-sm">
                {isPaid 
                  ? (payment.paymentDate ? new Date(payment.paymentDate + "T12:00:00").toLocaleDateString("pt-BR") : "N/A")
                  : new Date(new Date(payment.dueDate).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")
                }
              </p>
              {isPaid && payment.paymentMethod && (
                <p className="text-xs text-muted-foreground capitalize">{payment.paymentMethod}</p>
              )}
            </div>
            
            <div className="text-right min-w-[100px]">
              <p className="text-xs text-muted-foreground">
                {isPaid ? "Valor Pago" : (isPartial ? "Valor Restante" : "Valor Esperado")}
              </p>
              <p className={`text-base font-bold ${colors.amount}`}>
                {formatCurrency(displayAmount)}
              </p>
              {isPartial && payment.paidAmount > 0 && (
                <p className="text-xs text-green-600 font-semibold">
                  Já pago: {formatCurrency(payment.paidAmount)}
                </p>
              )}
              {!isPaid && !isPartial && payment.paidAmount > 0 && (
                <p className="text-xs text-yellow-600 font-semibold">
                  Pago: {formatCurrency(payment.paidAmount)}
                </p>
              )}
            </div>
            
            {isPaid && onCancelPayment && (
              <>
                {onViewReceipt && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 text-xs"
                    onClick={(e) => onViewReceipt(payment.id, e)}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Ver Recibo
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 text-xs"
                  onClick={(e) => onCancelPayment(payment.id, e)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}