import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Mail, Share2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Payment, Rental, Property, Tenant } from "@/types";
import { formatCurrency } from "@/lib/masks";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PaymentReceiptProps {
  payment: Payment;
  rental: Rental;
  property: Property;
  tenant: Tenant;
  onClose: () => void;
}

export function PaymentReceipt({
  payment,
  rental,
  property,
  tenant,
  onClose,
}: PaymentReceiptProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePrint = () => {
    setLoading(true);
    setTimeout(() => {
      window.print();
      setLoading(false);
    }, 100);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Recibo de Pagamento - ${property.location}`);
    const body = encodeURIComponent(
      `Prezado(a) ${tenant.name},\n\n` +
      `Segue recibo de pagamento referente ao aluguel:\n\n` +
      `Imóvel: ${property.location}\n` +
      `Valor: ${formatCurrency(payment.paidAmount || 0)}\n` +
      `Data: ${payment.paymentDate ? format(new Date(payment.paymentDate), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}\n` +
      `Referência: ${payment.referenceMonth}/${payment.referenceYear}\n\n` +
      `Atenciosamente.`
    );
    
    window.location.href = `mailto:${tenant.email || ""}?subject=${subject}&body=${body}`;
    
    toast({
      title: "Email preparado",
      description: "O cliente de email foi aberto com o recibo.",
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: `Recibo de Pagamento - ${property.location}`,
      text: 
        `Recibo de Pagamento\n\n` +
        `Inquilino: ${tenant.name}\n` +
        `Imóvel: ${property.location}\n` +
        `Valor: ${formatCurrency(payment.paidAmount || 0)}\n` +
        `Data: ${payment.paymentDate ? format(new Date(payment.paymentDate), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}\n` +
        `Referência: ${payment.referenceMonth}/${payment.referenceYear}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast({
          title: "Compartilhado",
          description: "Recibo compartilhado com sucesso!",
        });
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          toast({
            title: "Erro ao compartilhar",
            description: "Não foi possível compartilhar o recibo.",
            variant: "destructive",
          });
        }
      }
    } else {
      // Fallback: copiar para clipboard
      try {
        await navigator.clipboard.writeText(shareData.text);
        toast({
          title: "Copiado!",
          description: "Recibo copiado para a área de transferência.",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Seu navegador não suporta compartilhamento.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recibo de Pagamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 print:p-8">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold">Recibo de Pagamento de Aluguel</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Comprovante de Recebimento - {format(new Date(), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-3 text-primary">Dados do Imóvel</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Endereço:</span>
                        <p className="font-medium">{property.location}</p>
                        {property.complement && (
                          <p className="text-muted-foreground text-xs">{property.complement}</p>
                        )}
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
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-3 text-primary">Dados do Pagamento</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Referência:</span>
                    <p className="font-medium">
                      {payment.referenceMonth}/{payment.referenceYear}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data de Vencimento:</span>
                    <p className="font-medium">
                      {payment.dueDate
                        ? format(new Date(payment.dueDate + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data do Pagamento:</span>
                    <p className="font-medium">
                      {payment.paymentDate
                        ? format(new Date(payment.paymentDate + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Método de Pagamento:</span>
                    <p className="font-medium capitalize">{payment.paymentMethod || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-lg mb-3 text-primary">Valores</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor do Aluguel:</span>
                    <span className="font-medium">{formatCurrency(payment.expectedAmount || 0)}</span>
                  </div>
                  {payment.lateFee && payment.lateFee > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>Multa:</span>
                      <span className="font-medium">{formatCurrency(payment.lateFee)}</span>
                    </div>
                  )}
                  {payment.interest && payment.interest > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Juros:</span>
                      <span className="font-medium">{formatCurrency(payment.interest)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t text-lg font-bold text-primary">
                    <span>Valor Pago:</span>
                    <span>{formatCurrency(payment.paidAmount || 0)}</span>
                  </div>
                </div>
              </div>

              {payment.notes && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-lg mb-3 text-primary">Observações</h3>
                  <p className="text-sm text-muted-foreground">{payment.notes}</p>
                </div>
              )}

              <div className="border-t pt-4 text-xs text-muted-foreground text-center">
                <p>
                  Este é um comprovante de recebimento de pagamento de aluguel.
                </p>
                <p>
                  Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap justify-end gap-2 print:hidden">
            <Button variant="outline" onClick={onClose}>
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar
            </Button>
            <Button variant="outline" onClick={handleEmail}>
              <Mail className="mr-2 h-4 w-4" />
              Enviar por Email
            </Button>
            <Button onClick={handlePrint} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              {loading ? "Gerando..." : "Gerar PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}