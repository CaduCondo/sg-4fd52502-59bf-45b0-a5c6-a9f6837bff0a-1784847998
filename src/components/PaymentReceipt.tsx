import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download, Mail, Share2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { Payment, Rental, Property, Tenant } from "@/types";
import { formatCurrency } from "@/lib/masks";
import { format, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import Image from "next/image";

interface PaymentReceiptProps {
  payment: Payment;
  rental: Rental;
  property: Property;
  tenant: Tenant;
  onClose: () => void;
}

const numberToWords = (value: number): string => {
  const units = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
  const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  const hundreds = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

  if (value === 0) return "zero reais";
  if (value === 100) return "cem reais";

  let result = "";
  const intValue = Math.floor(value);
  const cents = Math.round((value - intValue) * 100);

  if (intValue >= 1000000) {
    const millions = Math.floor(intValue / 1000000);
    result += millions === 1 ? "um milhão" : `${numberToWords(millions).replace(" reais", "")} milhões`;
    const remainder = intValue % 1000000;
    if (remainder > 0) result += " e ";
  }

  const thousands = Math.floor((intValue % 1000000) / 1000);
  if (thousands > 0) {
    result += thousands === 1 ? "mil" : `${numberToWords(thousands).replace(" reais", "")} mil`;
    const remainder = intValue % 1000;
    if (remainder > 0) result += " e ";
  }

  const remainder = intValue % 1000;
  if (remainder > 0) {
    if (remainder >= 100) {
      const h = Math.floor(remainder / 100);
      result += hundreds[h];
      const r = remainder % 100;
      if (r > 0) result += " e ";
      
      if (r >= 20) {
        const t = Math.floor(r / 10);
        result += tens[t];
        const u = r % 10;
        if (u > 0) result += ` e ${units[u]}`;
      } else if (r >= 10) {
        result += teens[r - 10];
      } else if (r > 0) {
        result += units[r];
      }
    } else if (remainder >= 20) {
      const t = Math.floor(remainder / 10);
      result += tens[t];
      const u = remainder % 10;
      if (u > 0) result += ` e ${units[u]}`;
    } else if (remainder >= 10) {
      result += teens[remainder - 10];
    } else {
      result += units[remainder];
    }
  }

  result += intValue === 1 ? " real" : " reais";

  if (cents > 0) {
    result += " e ";
    if (cents >= 20) {
      const t = Math.floor(cents / 10);
      result += tens[t];
      const u = cents % 10;
      if (u > 0) result += ` e ${units[u]}`;
    } else if (cents >= 10) {
      result += teens[cents - 10];
    } else {
      result += units[cents];
    }
    result += cents === 1 ? " centavo" : " centavos";
  }

  return result;
};

export function PaymentReceipt({
  payment,
  rental,
  property,
  tenant,
  onClose,
}: PaymentReceiptProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  console.log("📄 PaymentReceipt renderizado com dados:", { payment, rental, property, tenant });

  const totalAmount = payment.paidAmount || 0;
  const baseAmount = payment.expectedAmount || 0;
  const lateFee = payment.lateFee || 0;
  const interest = payment.interest || 0;
  const totalCharges = lateFee + interest;

  const monthNames = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];

  const referenceMonthName = monthNames[(payment.referenceMonth || 1) - 1];
  const dueDate = payment.dueDate ? new Date(payment.dueDate + "T00:00:00") : new Date();

  const contractStartDate = new Date(rental.startDate + "T00:00:00");
  const contractEndDate = new Date(rental.endDate + "T00:00:00");
  const totalMonths = differenceInMonths(contractEndDate, contractStartDate) + 1;
  
  const referenceDate = new Date(payment.referenceYear || 0, (payment.referenceMonth || 1) - 1, 1);
  const currentPaymentNumber = differenceInMonths(referenceDate, contractStartDate) + 1;

  const handleDownloadPDF = () => {
    setLoading(true);
    setTimeout(() => {
      window.print();
      setLoading(false);
    }, 100);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Recibo de Pagamento - ${property.address || property.location}`);
    const body = encodeURIComponent(
      `Prezado(a) ${tenant.name},\n\n` +
      `Segue recibo de pagamento referente ao aluguel.\n\n` +
      `Atenciosamente.`
    );
    
    window.location.href = `mailto:${tenant.email || ""}?subject=${subject}&body=${body}`;
    
    toast({
      title: "Email preparado",
      description: "O cliente de email foi aberto.",
    });
  };

  const handleShare = async () => {
    const addressParts = [
      property.address,
      property.number,
      property.complement,
      property.neighborhood,
      property.city,
      property.state,
      property.zipCode ? `CEP ${property.zipCode}` : ""
    ].filter(Boolean);

    const shareText = 
      `RECIBO DE ALUGUEL\n\n` +
      `Recebi dos Srs. ${tenant.name.toUpperCase()}, a importância de: ${numberToWords(totalAmount).toUpperCase()}\n\n` +
      `Referente ao mês de ${referenceMonthName}/${payment.referenceYear}, tendo seu vencimento em ${format(dueDate, "dd/MM/yyyy", { locale: ptBR })}\n` +
      `Imóvel: ${addressParts.join(", ").toUpperCase()}\n\n` +
      `Valor: ${formatCurrency(baseAmount)}\n` +
      (totalCharges > 0 ? `Multa/Juros: ${formatCurrency(totalCharges)}\n` : "") +
      `Total: ${formatCurrency(totalAmount)}\n\n` +
      `SÃO PAULO, ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;

    const shareData = {
      title: `Recibo de Pagamento - ${property.address || property.location}`,
      text: shareText,
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

  const addressParts = [
    property.address,
    property.number,
    property.complement,
    property.neighborhood,
    property.city,
    property.state ? `${property.state}` : "",
    property.zipCode ? `CEP ${property.zipCode}` : ""
  ].filter(Boolean);

  const fullAddress = addressParts.join(", ");

  console.log("✅ Renderizando Dialog do PaymentReceipt");

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
            <CardContent className="pt-6 space-y-6">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-bold uppercase">Recibo de Aluguel</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  ({currentPaymentNumber}/{totalMonths})
                </p>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-justify">
                <p>
                  Recebi dos Srs. <span className="font-semibold uppercase">{tenant.name}</span>, a importância de <span className="font-semibold uppercase">{numberToWords(totalAmount)}</span>, proveniente ao depósito de aluguel referente ao mês de <span className="font-semibold">{referenceMonthName} de {payment.referenceYear}</span>, tendo seu vencimento em <span className="font-semibold">{format(dueDate, "dd/MM/yyyy", { locale: ptBR })}</span>, do imóvel situado em <span className="font-semibold uppercase">{fullAddress}</span>, após a apresentação dos comprovantes de depósito bancário e contas de água e luz do mês anterior pagas, sendo este vinculado ao INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO PARA FIM RESIDENCIAL, assinado entre as partes em <span className="font-semibold">{format(new Date(rental.startDate + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}</span>.
                </p>
              </div>

              <div className="border-t pt-4 space-y-2">
                <p className="font-semibold text-sm mb-3">Valores:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Valor:</span>
                    <span className="font-semibold">{formatCurrency(baseAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Multa:</span>
                    <span className="font-semibold">{totalCharges > 0 ? formatCurrency(totalCharges) : "R$ ___"}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="font-semibold">Total:</span>
                    <span className="font-semibold text-lg">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 space-y-8">
                <div className="text-center">
                  <p className="font-semibold uppercase">
                    São Paulo, {format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                  </p>
                </div>

                <div className="flex justify-center pt-8">
                  <div className="text-center flex flex-col items-center">
                    <div className="h-24 flex items-end justify-center mb-2">
                      <Image
                        src="/signature.png"
                        alt="Assinatura"
                        width={200}
                        height={100}
                        className="object-contain max-h-20"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="border-t-2 border-gray-400 w-80 mb-2"></div>
                    <p className="font-semibold uppercase">{user?.name || "Administrador"}</p>
                  </div>
                </div>
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
            <Button onClick={handleDownloadPDF} disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Salvar PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}