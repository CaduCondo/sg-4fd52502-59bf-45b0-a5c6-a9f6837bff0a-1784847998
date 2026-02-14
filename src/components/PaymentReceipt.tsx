import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";

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

  // Obter valores do breakdown se existir, senão usar valores diretos
  const breakdown = payment.breakdown as any;
  const isTermination = payment.payment_type === "termination";
  
  let totalAmount = 0;
  let baseAmount = 0;
  let lateFee = 0;
  let interest = 0;
  
  // Valores para rescisão
  let proportionalRent = 0;
  let terminationFee = 0;
  let depositRefund = 0;
  let additionalExpenses = 0;

  if (breakdown) {
    console.log("📊 Breakdown encontrado:", breakdown);
    
    if (isTermination) {
      // Rescisão de contrato
      proportionalRent = Math.abs(breakdown.proportionalRent || 0);
      terminationFee = Math.abs(breakdown.terminationFee || 0);
      depositRefund = Math.abs(breakdown.depositRefund || 0);
      additionalExpenses = Math.abs(breakdown.additionalExpenses || 0);
      
      // Total é o paid_amount do pagamento
      totalAmount = Math.abs(payment.paid_amount || 0);
    } else {
      // Pagamento normal
      baseAmount = breakdown.baseAmount || breakdown.rentValue || payment.expected_amount || 0;
      lateFee = breakdown.lateFee || 0;
      interest = breakdown.interest || 0;
      totalAmount = payment.paid_amount || 0;
    }
  } else {
    // Fallback: usar valores diretos do payment
    console.log("⚠️ Usando valores diretos do payment (sem breakdown)");
    baseAmount = payment.expected_amount || 0;
    lateFee = payment.late_fee || 0;
    interest = payment.interest || 0;
    totalAmount = payment.paid_amount || 0;
  }

  console.log("💰 Valores calculados:", { 
    totalAmount, 
    baseAmount, 
    lateFee, 
    interest,
    isTermination,
    proportionalRent,
    terminationFee,
    depositRefund,
    additionalExpenses
  });

  const monthNames = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  
  const referenceMonthName = monthNames[(payment.reference_month || 1) - 1];

  const safeDate = (dateString: string | undefined | null): Date => {
    if (!dateString) {
      console.warn("⚠️ Data ausente, usando data atual");
      return new Date();
    }
    
    try {
      const date = new Date(dateString.split('T')[0] + 'T12:00:00');
      
      if (isNaN(date.getTime())) {
        console.error("❌ Data inválida:", dateString);
        return new Date();
      }
      
      return date;
    } catch (error) {
      console.error("❌ Erro ao processar data:", dateString, error);
      return new Date();
    }
  };

  const formatSafeDate = (date: Date | string | undefined | null, formatStr: string): string => {
    try {
      if (!date) {
        console.warn("⚠️ Data ausente em formatSafeDate");
        return format(new Date(), formatStr, { locale: ptBR });
      }
      
      let dateObj: Date;
      
      if (typeof date === "string") {
        const cleanDate = date.split('T')[0] + 'T12:00:00';
        dateObj = new Date(cleanDate);
      } else {
        dateObj = date;
      }
      
      if (isNaN(dateObj.getTime())) {
        console.error("❌ Data inválida em formatSafeDate:", date);
        return format(new Date(), formatStr, { locale: ptBR });
      }
      
      return format(dateObj, formatStr, { locale: ptBR });
    } catch (error) {
      console.error("❌ Erro ao formatar data:", date, error);
      return format(new Date(), formatStr, { locale: ptBR });
    }
  };

  const dueDate = safeDate(payment.due_date);
  const contractStartDate = safeDate(rental.start_date);
  const contractEndDate = safeDate(rental.end_date);

  // Usar rental.installments (número de parcelas do contrato) ao invés de total_installments
  const totalMonths = rental.installments || 1;
  
  let currentPaymentNumber = 1;

  if (rental.start_date && payment.reference_year && payment.reference_month) {
    try {
      const referenceDate = new Date(
        payment.reference_year, 
        (payment.reference_month || 1) - 1, 
        1
      );
      if (!isNaN(referenceDate.getTime())) {
        currentPaymentNumber = differenceInMonths(referenceDate, contractStartDate) + 1;
      }
    } catch (error) {
      console.error("Erro ao calcular currentPaymentNumber:", error);
      currentPaymentNumber = 1;
    }
  }

  console.log("📅 Parcelas:", { currentPaymentNumber, totalMonths, installments: rental.installments });

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
      property.zip_code ? `CEP ${property.zip_code}` : ""
    ].filter(Boolean);

    const shareText = 
      `RECIBO DE ALUGUEL\n\n` +
      `Recebi dos Srs. ${tenant.name.toUpperCase()}, a importância de: ${numberToWords(totalAmount).toUpperCase()}\n\n` +
      `Referente ao mês de ${referenceMonthName}/${payment.reference_year}, tendo seu vencimento em ${formatSafeDate(dueDate, "dd/MM/yyyy")}\n` +
      `Imóvel: ${addressParts.join(", ").toUpperCase()}\n\n` +
      `Valor: ${formatCurrency(baseAmount)}\n` +
      (lateFee > 0 ? `Multa: ${formatCurrency(lateFee)}\n` : "") +
      (interest > 0 ? `Juros: ${formatCurrency(interest)}\n` : "") +
      `Total: ${formatCurrency(totalAmount)}\n\n` +
      `SÃO PAULO, ${formatSafeDate(new Date(), "dd/MM/yyyy 'às' HH:mm")}`;

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
    property.zip_code ? `CEP ${property.zip_code}` : ""
  ].filter(Boolean);

  const fullAddress = addressParts.join(", ");

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">Recibo de Pagamento</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 print:p-8">
          <Card className="receipt-content">
            <CardContent className="pt-4 sm:pt-6 space-y-4 sm:space-y-6">
              <div className="text-center border-b pb-3 sm:pb-4">
                <h2 className="text-xl sm:text-2xl font-bold uppercase">Recibo de Aluguel</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  ({currentPaymentNumber}/{totalMonths})
                </p>
              </div>

              <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm leading-relaxed text-justify">
                <p>
                  Recebi dos Srs. <span className="font-semibold uppercase">{tenant.name}</span>, a importância de <span className="font-semibold uppercase">{numberToWords(totalAmount)}</span>, proveniente ao depósito de aluguel referente ao mês de <span className="font-semibold">{referenceMonthName} de {payment.reference_year}</span>, tendo seu vencimento em <span className="font-semibold">{formatSafeDate(dueDate, "dd/MM/yyyy")}</span>, do imóvel situado em <span className="font-semibold uppercase">{fullAddress}</span>, após a apresentação dos comprovantes de depósito bancário e contas de água e luz do mês anterior pagas, sendo este vinculado ao INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO PARA FIM RESIDENCIAL, assinado entre as partes em <span className="font-semibold">{formatSafeDate(rental.start_date, "dd/MM/yyyy")}</span>.
                </p>
              </div>

              <div className="border-t pt-3 sm:pt-4 space-y-2">
                <p className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3">Valores:</p>
                <div className="space-y-1 text-xs sm:text-sm">
                  {isTermination ? (
                    <>
                      {proportionalRent > 0 && (
                        <div className="flex justify-between">
                          <span>Aluguel Proporcional:</span>
                          <span className="font-semibold">{formatCurrency(proportionalRent)}</span>
                        </div>
                      )}
                      {terminationFee > 0 && (
                        <div className="flex justify-between">
                          <span>Multa Rescisória:</span>
                          <span className="font-semibold">{formatCurrency(terminationFee)}</span>
                        </div>
                      )}
                      {depositRefund > 0 && (
                        <div className="flex justify-between">
                          <span>Devolução de Caução:</span>
                          <span className="font-semibold text-red-600">-{formatCurrency(depositRefund)}</span>
                        </div>
                      )}
                      {additionalExpenses > 0 && (
                        <div className="flex justify-between">
                          <span>Despesas Adicionais:</span>
                          <span className="font-semibold">{formatCurrency(additionalExpenses)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>Valor:</span>
                        <span className="font-semibold">{formatCurrency(baseAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Multa:</span>
                        <span className="font-semibold">{lateFee > 0 ? formatCurrency(lateFee) : "R$ ___"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Juros:</span>
                        <span className="font-semibold">{interest > 0 ? formatCurrency(interest) : "R$ ___"}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between border-t pt-1 mt-1">
                    <span className="font-semibold">Total:</span>
                    <span className="font-semibold text-base sm:text-lg">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 sm:pt-6 space-y-6 sm:space-y-8">
                <div className="text-center">
                  <p className="font-semibold uppercase text-xs sm:text-sm">
                    São Paulo, {formatSafeDate(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm")}
                  </p>
                </div>

                <div className="flex justify-center pt-6 sm:pt-8">
                  <div className="text-center flex flex-col items-center">
                    <div className="h-20 sm:h-24 flex items-end justify-center mb-2">
                      <Image
                        src="/signature.png"
                        alt="Assinatura"
                        width={200}
                        height={100}
                        className="object-contain max-h-16 sm:max-h-20"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    </div>
                    <div className="border-t-2 border-gray-400 w-64 sm:w-80 mb-2"></div>
                    <p className="font-semibold uppercase text-xs sm:text-sm">Carlos Aparecido D'Uvo</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row flex-wrap justify-end gap-2 print:hidden">
            <Button variant="outline" onClick={onClose} className="h-11 w-full sm:w-auto order-last sm:order-first">
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
            <Button variant="outline" onClick={handleShare} className="h-11 w-full sm:w-auto">
              <Share2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Compartilhar</span>
              <span className="sm:hidden">Compartilhar</span>
            </Button>
            <Button variant="outline" onClick={handleEmail} className="h-11 w-full sm:w-auto">
              <Mail className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Enviar por Email</span>
              <span className="sm:hidden">Email</span>
            </Button>
            <Button onClick={handleDownloadPDF} disabled={loading} className="h-11 w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Salvar PDF"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}