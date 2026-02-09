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
        return <Badge className="bg-green-500 text-white text-xs">Pago</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500 text-white text-xs">Parcial</Badge>;
      case "overdue":
        return <Badge className="bg-red-500 text-white text-xs">Atrasado</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white text-xs">Pendente</Badge>;
    }
  };

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
        className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 ${colors.border} active:scale-[0.98] touch-target`}
        onClick={() => onCardClick(payment.id)}
      >
        <CardHeader className="pb-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Home className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className={`font-semibold text-sm sm:text-base ${!isPaid ? colors.icon : ''} block truncate`}>
                  {property?.location || "Imóvel não encontrado"}
                </span>
                {property?.complement && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {property.complement}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {getMonthName(payment.referenceMonth)}/{payment.referenceYear}
              </span>
              {getStatusBadge(payment.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4 pt-0">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <span className="font-medium block">{tenant?.name || "Inquilino não identificado"}</span>
              {tenant?.phone && (
                <span className="text-xs text-muted-foreground block">{tenant.phone}</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                {isPaid ? "Pago em: " : "Vencimento: "}
                {isPaid 
                  ? (payment.paymentDate ? new Date(payment.paymentDate + "T12:00:00").toLocaleDateString("pt-BR") : "N/A")
                  : new Date(new Date(payment.dueDate).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")
                }
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Parcela {installment}
            </span>
          </div>

          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1.5">
              {isPaid ? "Valor Pago" : (isPartial ? "Valor Restante" : "Valor Esperado")}
            </p>
            <p className={`text-2xl sm:text-3xl font-bold ${colors.amount}`}>
              {formatCurrency(displayAmount)}
            </p>
          </div>

          {isPartial && payment.paidAmount > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Valor Já Pago</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(payment.paidAmount)}
              </p>
            </div>
          )}

          {!isPaid && !isPartial && payment.paidAmount > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Valor Pago</p>
              <p className="text-lg font-semibold text-yellow-600">
                {formatCurrency(payment.paidAmount)}
              </p>
            </div>
          )}

          {isPaid && onCancelPayment && (
            <div className="pt-3 space-y-2">
              {onViewReceipt && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 h-11 sm:h-9 touch-target"
                  onClick={(e) => onViewReceipt(payment.id, e)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Recibo
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-11 sm:h-9 touch-target"
                onClick={(e) => onCancelPayment(payment.id, e)}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar Pagamento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // List view - otimizado para mobile
  return (
    <Card
      className={`hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 ${colors.border} active:scale-[0.98]`}
      onClick={() => onCardClick(payment.id)}
    >
      <CardContent className="py-3 px-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Mobile: Stack vertical */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Home className={`h-6 w-6 ${colors.icon} flex-shrink-0 mt-1`} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs text-muted-foreground">
                  {getMonthName(payment.referenceMonth)}/{payment.referenceYear}
                </span>
                {getStatusBadge(payment.status)}
                <span className="text-xs font-semibold text-muted-foreground">
                  Parcela {installment}
                </span>
              </div>
              {property ? (
                <div className="space-y-0.5">
                  <span className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 block">
                    {property.location || "Local não informado"}
                  </span>
                  {property.complement && (
                    <span className="text-sm text-muted-foreground block">
                      {property.complement}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-base sm:text-lg font-semibold">Imóvel não encontrado</span>
              )}
            </div>
          </div>
          
          {/* Desktop: lado a lado */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="grid grid-cols-2 sm:flex sm:gap-4">
              <div className="text-left sm:text-right">
                <p className="text-xs text-muted-foreground">Inquilino</p>
                <p className="text-sm font-medium truncate">{tenant?.name || "N/A"}</p>
                {tenant?.phone && (
                  <p className="text-xs text-muted-foreground">{tenant.phone}</p>
                )}
              </div>
              
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {isPaid ? "Pago em" : "Vencimento"}
                </p>
                <p className="text-sm font-medium">
                  {isPaid 
                    ? (payment.paymentDate ? new Date(payment.paymentDate + "T12:00:00").toLocaleDateString("pt-BR") : "N/A")
                    : new Date(new Date(payment.dueDate).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")
                  }
                </p>
                {isPaid && payment.paymentMethod && (
                  <p className="text-xs text-muted-foreground capitalize">{payment.paymentMethod}</p>
                )}
              </div>
            </div>
            
            <div className="text-left sm:text-right sm:min-w-[120px]">
              <p className="text-xs text-muted-foreground mb-1">
                {isPaid ? "Valor Pago" : (isPartial ? "Valor Restante" : "Valor Esperado")}
              </p>
              <p className={`text-xl sm:text-2xl font-bold ${colors.amount}`}>
                {formatCurrency(displayAmount)}
              </p>
              {isPartial && payment.paidAmount > 0 && (
                <p className="text-xs text-green-600 font-semibold mt-1">
                  Já pago: {formatCurrency(payment.paidAmount)}
                </p>
              )}
              {!isPaid && !isPartial && payment.paidAmount > 0 && (
                <p className="text-xs text-yellow-600 font-semibold mt-1">
                  Pago: {formatCurrency(payment.paidAmount)}
                </p>
              )}
            </div>
            
            {isPaid && onCancelPayment && (
              <div className="flex flex-col gap-2 sm:flex-shrink-0">
                {onViewReceipt && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 h-11 sm:h-9 touch-target"
                    onClick={(e) => onViewReceipt(payment.id, e)}
                  >
                    <FileText className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Ver Recibo</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-11 sm:h-9 touch-target"
                  onClick={(e) => onCancelPayment(payment.id, e)}
                >
                  <X className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Cancelar</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}