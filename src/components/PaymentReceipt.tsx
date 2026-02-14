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
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [loading, setLoading] = useState(false);

  // Parse breakdown se vier como string
  let breakdown: any = null;
  if (payment.breakdown) {
    if (typeof payment.breakdown === 'string') {
      try {
        breakdown = JSON.parse(payment.breakdown);
      } catch (e) {
        console.error("Erro ao parsear breakdown:", e);
        breakdown = null;
      }
    } else {
      breakdown = payment.breakdown;
    }
  }

  // Detectar se é rescisão
  const isTermination = payment.type === "termination" || 
                       payment.notes?.includes("Rescisão de Contrato") ||
                       !!(breakdown && (breakdown.terminationFee || breakdown.depositRefund));
  
  let totalAmount = 0;
  let baseAmount = 0;
  let lateFee = 0;
  let interest = 0;
  
  // Variáveis específicas para rescisão
  let proportionalRent = 0;
  let terminationFee = 0;
  let depositRefund = 0;
  let additionalExpenses = 0;
  let igpmCorrectionData = null;

  // LÓGICA DE EXTRAÇÃO DE VALORES
  if (breakdown) {
    if (isTermination) {
      // RESCISÃO: Buscar valores do breakdown
      // O breakdown pode ser um array ou objeto, vamos lidar com ambos
      if (Array.isArray(breakdown)) {
        // Breakdown é array de itens
        breakdown.forEach((item: any) => {
          const desc = item.description || "";
          const amount = Number(item.amount || 0);
          
          if (desc.includes("Aluguel Proporcional")) {
            proportionalRent = Math.abs(amount);
          } else if (desc.includes("Multa Rescisória")) {
            terminationFee = Math.abs(amount);
          } else if (desc.includes("Devolução de Caução")) {
            depositRefund = Math.abs(amount);
          } else if (desc.includes("Despesas Adicionais") || desc.includes("Despesas")) {
            additionalExpenses = Math.abs(amount);
          } else if (desc.includes("Multa por Atraso")) {
            lateFee = Math.abs(amount);
          } else if (desc.includes("Juros por Atraso")) {
            interest = Math.abs(amount);
          }
        });
        
        // Total = soma de débitos - créditos
        totalAmount = proportionalRent + terminationFee + additionalExpenses + lateFee + interest - depositRefund;
      } else {
        // Breakdown é objeto direto
        proportionalRent = Number(breakdown.proportionalRent || 0);
        terminationFee = Number(breakdown.terminationFee || 0);
        depositRefund = Number(breakdown.depositRefund || 0);
        additionalExpenses = Number(breakdown.additionalExpenses || 0);
        igpmCorrectionData = breakdown.igpmCorrection || null;
        
        totalAmount = proportionalRent + terminationFee + additionalExpenses - depositRefund;
      }
      
      // Se tiver paidAmount, sobrescreve o total
      if (payment.paidAmount) {
        totalAmount = payment.paidAmount;
      }
    } else {
      // PAGAMENTO NORMAL
      if (Array.isArray(breakdown)) {
        // Se vier como array (novo formato)
        breakdown.forEach((item: any) => {
          const desc = item.description || "";
          const amount = Number(item.amount || 0);
          
          if (desc.includes("Valor Base") || desc.includes("Aluguel")) {
            baseAmount = Math.abs(amount);
          } else if (desc.includes("Multa")) {
            lateFee = Math.abs(amount);
          } else if (desc.includes("Juros")) {
            interest = Math.abs(amount);
          }
        });
      } else {
        // Se vier como objeto (formato antigo)
        baseAmount = Number(breakdown.baseAmount || breakdown.rentValue || 0);
        lateFee = Number(breakdown.lateFee || 0);
        interest = Number(breakdown.interest || 0);
      }
      
      totalAmount = payment.paidAmount || (baseAmount + lateFee + interest);
    }
  } else {
    // FALLBACK: Sem breakdown, usar propriedades diretas
    baseAmount = payment.expectedAmount || 0;
    lateFee = payment.lateFee || payment.penaltyAmount || 0;
    interest = payment.interest || payment.interestAmount || 0;
    totalAmount = payment.paidAmount || 0;
  }

  // FORMATAÇÃO DE DATAS E PARCELAS
  const monthNames = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
  ];
  
  const refMonth = payment.referenceMonth || 1;
  const refYear = payment.referenceYear || new Date().getFullYear();
  const referenceMonthName = monthNames[refMonth - 1];

  const safeDate = (dateString: string | undefined | null): Date => {
    if (!dateString) return new Date();
    const datePart = dateString.split('T')[0];
    return new Date(`${datePart}T12:00:00`);
  };

  const formatSafeDate = (date: Date | string, formatStr: string): string => {
    const d = typeof date === 'string' ? safeDate(date) : date;
    return format(d, formatStr, { locale: ptBR });
  };

  const dueDate = safeDate(payment.dueDate);

  // USAR OS CAMPOS installment E total_installments QUE JÁ VEM DO BANCO
  // Esses campos são salvos corretamente no paymentService.ts
  const currentPaymentNumber = (payment as any).installment || 1;
  const totalMonths = (payment as any).total_installments || 1;

  // AÇÕES
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
      `Segue recibo de pagamento referente ao aluguel de ${referenceMonthName}/${refYear}.\n\n` +
      `Atenciosamente.`
    );
    window.location.href = `mailto:${tenant.email || ""}?subject=${subject}&body=${body}`;
  };

  const handleShare = async () => {
    const shareText = 
      `RECIBO DE ALUGUEL\n\n` +
      `Recebi de: ${tenant.name.toUpperCase()}\n` +
      `Valor: ${formatCurrency(totalAmount)}\n` +
      `Ref: ${referenceMonthName}/${refYear}\n` +
      `Vencimento: ${formatSafeDate(dueDate, "dd/MM/yyyy")}\n\n` +
      `Recibo gerado em: ${formatSafeDate(new Date(), "dd/MM/yyyy HH:mm")}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Recibo de Aluguel",
          text: shareText
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({ title: "Copiado!", description: "Texto do recibo copiado." });
    }
  };

  const addressParts = [
    property.address,
    property.number,
    property.complement,
    property.neighborhood,
    property.city,
    property.state,
    property.zipCode ? `CEP ${property.zipCode}` : ""
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
          <Card className="receipt-content border-none shadow-none print:shadow-none">
            <CardContent className="pt-4 sm:pt-6 space-y-4 sm:space-y-6">
              {/* Cabeçalho do Recibo */}
              <div className="text-center border-b pb-3 sm:pb-4">
                <h2 className="text-xl sm:text-2xl font-bold uppercase">Recibo de Aluguel</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  ({currentPaymentNumber}/{totalMonths})
                </p>
              </div>

              {/* Corpo do Texto */}
              <div className="space-y-3 sm:space-y-4 text-xs sm:text-sm leading-relaxed text-justify">
                <p>
                  Recebi dos Srs. <span className="font-semibold uppercase">{tenant.name}</span>, a importância de <span className="font-semibold uppercase">{numberToWords(Math.abs(totalAmount))}</span> ({formatCurrency(Math.abs(totalAmount))}), proveniente ao depósito de aluguel referente ao mês de <span className="font-semibold">{referenceMonthName} de {refYear}</span>, tendo seu vencimento em <span className="font-semibold">{formatSafeDate(dueDate, "dd/MM/yyyy")}</span>, do imóvel situado em <span className="font-semibold uppercase">{fullAddress}</span>, após a apresentação dos comprovantes de depósito bancário e contas de água e luz do mês anterior pagas, sendo este vinculado ao INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO PARA FIM RESIDENCIAL, assinado entre as partes em <span className="font-semibold">{formatSafeDate(rental.startDate, "dd/MM/yyyy")}</span>.
                </p>
              </div>

              {/* Detalhamento de Valores */}
              <div className="border-t pt-3 sm:pt-4 space-y-2">
                <p className="font-semibold text-xs sm:text-sm mb-2 sm:mb-3">Valores:</p>
                <div className="space-y-1 text-xs sm:text-sm">
                  {isTermination ? (
                    // LAYOUT PARA RESCISÃO
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
                        <div className="flex justify-between text-red-600">
                          <span>Devolução de Caução:</span>
                          <span className="font-semibold">-{formatCurrency(depositRefund)}</span>
                        </div>
                      )}
                      {additionalExpenses > 0 && (
                        <div className="flex justify-between">
                          <span>Despesas Adicionais:</span>
                          <span className="font-semibold">{formatCurrency(additionalExpenses)}</span>
                        </div>
                      )}
                      {lateFee > 0 && (
                        <div className="flex justify-between">
                          <span>Multa por Atraso:</span>
                          <span className="font-semibold">{formatCurrency(lateFee)}</span>
                        </div>
                      )}
                      {interest > 0 && (
                        <div className="flex justify-between">
                          <span>Juros por Atraso:</span>
                          <span className="font-semibold">{formatCurrency(interest)}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    // LAYOUT PADRÃO (PAGAMENTO NORMAL)
                    <>
                      <div className="flex justify-between">
                        <span>Valor Base:</span>
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
                  
                  {/* Totalizador Geral */}
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-bold text-base">Total Pago:</span>
                    <span className="font-bold text-base">{formatCurrency(Math.abs(totalAmount))}</span>
                  </div>
                </div>
              </div>

              {/* Rodapé e Assinatura */}
              <div className="border-t pt-4 sm:pt-6 space-y-6 sm:space-y-8 mt-4">
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

          {/* Botões de Ação */}
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