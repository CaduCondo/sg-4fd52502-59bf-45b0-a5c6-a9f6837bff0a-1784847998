import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";
import { Payment, Rental, Property, Tenant } from "@/types";

interface PaymentReceiptProps {
  payment: Payment;
  rental: Rental;
  property: Property;
  tenant: Tenant;
  onClose: () => void;
}

export function PaymentReceipt({ payment, rental, property, tenant, onClose }: PaymentReceiptProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // ===== PARCELAS =====
  // Prioridade: payment.installment e payment.totalInstallments do banco
  const currentInstallment = payment.installment || 1;
  const totalInstallments = payment.totalInstallments || rental.installments || rental.totalInstallments || 24;

  // ===== DETECTAR RESCISÃO =====
  const isTermination = 
    payment.type === "termination" || 
    payment.notes?.includes("Rescisão de Contrato") ||
    payment.notes?.includes("rescisão");

  // ===== VALORES =====
  let baseAmount = 0;
  let lateFee = 0;
  let interest = 0;
  let totalAmount = 0;

  // Valores de rescisão
  let proportionalRent = 0;
  let terminationFee = 0;
  let depositRefund = 0;
  let additionalExpenses = 0;

  // ===== PROCESSAR BREAKDOWN =====
  let breakdown: any = null;
  
  if (payment.breakdown) {
    try {
      if (typeof payment.breakdown === 'string') {
        breakdown = JSON.parse(payment.breakdown);
      } else {
        breakdown = payment.breakdown;
      }
    } catch (e) {
      console.error("Erro ao parsear breakdown:", e);
    }
  }

  if (breakdown) {
    // Se breakdown é array (novo formato)
    if (Array.isArray(breakdown)) {
      breakdown.forEach((item: any) => {
        const amount = Math.abs(Number(item.amount || 0));
        const desc = (item.description || "").toLowerCase();
        
        if (desc.includes("aluguel proporcional") || desc.includes("proporcional")) {
          proportionalRent = amount;
        } else if (desc.includes("multa rescisória") || desc.includes("rescisória")) {
          terminationFee = amount;
        } else if (desc.includes("devolução") || desc.includes("caução")) {
          depositRefund = amount;
        } else if (desc.includes("despesas adicionais") || desc.includes("adicionais")) {
          additionalExpenses = amount;
        } else if (desc.includes("multa por atraso") || desc.includes("multa")) {
          lateFee = amount;
        } else if (desc.includes("juros por atraso") || desc.includes("juros")) {
          interest = amount;
        } else if (desc.includes("aluguel") || desc.includes("rent")) {
          baseAmount = amount;
        }
      });
    } 
    // Se breakdown é objeto
    else {
      baseAmount = breakdown.baseAmount || breakdown.rentValue || 0;
      lateFee = breakdown.lateFee || breakdown.penaltyAmount || 0;
      interest = breakdown.interest || breakdown.interestAmount || 0;
      
      // Rescisão
      proportionalRent = breakdown.proportionalRent || 0;
      terminationFee = breakdown.terminationFee || 0;
      depositRefund = Math.abs(breakdown.depositRefund || 0);
      additionalExpenses = breakdown.additionalExpenses || 0;
    }
  }

  // ===== FALLBACK: Tentar pegar direto do payment =====
  if (!breakdown || (baseAmount === 0 && proportionalRent === 0)) {
    // Pagamento normal
    baseAmount = payment.expectedAmount || 0;
    lateFee = payment.lateFee || payment.penaltyAmount || 0;
    interest = payment.interest || payment.interestAmount || 0;
  }

  // ===== TOTAL PAGO =====
  // Prioridade máxima: payment.paidAmount (o que realmente foi pago)
  totalAmount = payment.paidAmount || 0;

  // Se ainda for 0, calcular
  if (totalAmount === 0) {
    if (isTermination) {
      totalAmount = proportionalRent + terminationFee + additionalExpenses + lateFee + interest - depositRefund;
    } else {
      totalAmount = baseAmount + lateFee + interest;
    }
  }

  // ===== FORMATAÇÃO =====
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString + "T12:00:00");
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // ===== EXTENSO =====
  const extenso = (num: number): string => {
    if (num === 0) return "ZERO REAIS";
    
    const unidades = ["", "UM", "DOIS", "TRÊS", "QUATRO", "CINCO", "SEIS", "SETE", "OITO", "NOVE"];
    const especiais = ["DEZ", "ONZE", "DOZE", "TREZE", "QUATORZE", "QUINZE", "DEZESSEIS", "DEZESSETE", "DEZOITO", "DEZENOVE"];
    const dezenas = ["", "", "VINTE", "TRINTA", "QUARENTA", "CINQUENTA", "SESSENTA", "SETENTA", "OITENTA", "NOVENTA"];
    const centenas = ["", "CENTO", "DUZENTOS", "TREZENTOS", "QUATROCENTOS", "QUINHENTOS", "SEISCENTOS", "SETECENTOS", "OITOCENTOS", "NOVECENTOS"];
    
    const inteiro = Math.floor(Math.abs(num));
    const centavos = Math.round((Math.abs(num) - inteiro) * 100);
    
    let resultado = "";
    
    const milhares = Math.floor(inteiro / 1000);
    const restante = inteiro % 1000;
    
    if (milhares > 0) {
      if (milhares === 1) {
        resultado = "MIL";
      } else {
        const milharesExtenso = converterCentenas(milhares);
        resultado = `${milharesExtenso} MIL`;
      }
      
      if (restante > 0) {
        resultado += " E ";
      }
    }
    
    if (restante > 0) {
      resultado += converterCentenas(restante);
    }
    
    resultado += " REAIS";
    
    if (centavos > 0) {
      resultado += " E " + converterCentenas(centavos) + " CENTAVOS";
    }
    
    return resultado;
    
    function converterCentenas(n: number): string {
      if (n === 0) return "";
      if (n === 100) return "CEM";
      
      const c = Math.floor(n / 100);
      const d = Math.floor((n % 100) / 10);
      const u = n % 10;
      
      let texto = "";
      
      if (c > 0) {
        texto = centenas[c];
      }
      
      if (d === 1) {
        if (texto) texto += " E ";
        texto += especiais[u];
      } else {
        if (d > 0) {
          if (texto) texto += " E ";
          texto += dezenas[d];
        }
        if (u > 0) {
          if (texto) texto += " E ";
          texto += unidades[u];
        }
      }
      
      return texto;
    }
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const element = document.getElementById("receipt-content");
      if (!element) return;

      const html2pdf = (await import("html2pdf.js")).default;
      
      const opt = {
        margin: 1,
        filename: `recibo-${payment.id}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const referenceMonthName = payment.referenceMonth 
    ? new Date(2000, payment.referenceMonth - 1).toLocaleString("pt-BR", { month: "long" })
    : "N/A";

  const referenceYear = payment.referenceYear || new Date().getFullYear();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>📄</span>
              Recibo de Pagamento
            </span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div id="receipt-content" className="space-y-6 p-8 bg-white text-black">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">RECIBO DE ALUGUEL</h1>
            <p className="text-sm text-gray-600">({currentInstallment}/{totalInstallments})</p>
          </div>

          <div className="space-y-4 text-justify leading-relaxed">
            <p>
              Recebi dos Srs. <strong>{tenant.name.toUpperCase()}</strong>, a importância de{" "}
              <strong>{extenso(totalAmount)} ({formatCurrency(totalAmount)})</strong>, proveniente ao depósito de aluguel
              referente ao mês de <strong>{referenceMonthName} de {referenceYear}</strong>, 
              tendo seu vencimento em <strong>{formatDate(payment.dueDate)}</strong>, 
              do imóvel situado em{" "}
              <strong>
                {property.location?.toUpperCase() || property.address?.toUpperCase() || "LOCAL NÃO INFORMADO"}
                {property.complement ? `, ${property.complement.toUpperCase()}` : ""}
              </strong>, após a apresentação dos comprovantes de depósito bancário e contas de água e luz do mês
              anterior pagos, sendo este vinculado ao INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO PARA FIM RESIDENCIAL, assinado entre as partes em{" "}
              <strong>{formatDate(rental.startDate)}</strong>.
            </p>
          </div>

          <div className="border-t border-gray-300 pt-4">
            <h3 className="font-semibold mb-3">Valores:</h3>
            
            {isTermination ? (
              // Layout para Rescisão
              <div className="space-y-2">
                {proportionalRent > 0 && (
                  <div className="flex justify-between">
                    <span>Aluguel Proporcional:</span>
                    <span className="font-medium">{formatCurrency(proportionalRent)}</span>
                  </div>
                )}
                {terminationFee > 0 && (
                  <div className="flex justify-between">
                    <span>Multa Rescisória:</span>
                    <span className="font-medium">{formatCurrency(terminationFee)}</span>
                  </div>
                )}
                {depositRefund > 0 && (
                  <div className="flex justify-between">
                    <span>Devolução de Caução:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(depositRefund)}</span>
                  </div>
                )}
                {additionalExpenses > 0 && (
                  <div className="flex justify-between">
                    <span>Despesas Adicionais:</span>
                    <span className="font-medium">{formatCurrency(additionalExpenses)}</span>
                  </div>
                )}
                {lateFee > 0 && (
                  <div className="flex justify-between">
                    <span>Multa por Atraso:</span>
                    <span className="font-medium">{formatCurrency(lateFee)}</span>
                  </div>
                )}
                {interest > 0 && (
                  <div className="flex justify-between">
                    <span>Juros por Atraso:</span>
                    <span className="font-medium">{formatCurrency(interest)}</span>
                  </div>
                )}
              </div>
            ) : (
              // Layout para Pagamento Normal
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Valor Base:</span>
                  <span className="font-medium">{formatCurrency(baseAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Multa:</span>
                  <span className="font-medium">{lateFee > 0 ? formatCurrency(lateFee) : "R$ ___"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Juros:</span>
                  <span className="font-medium">{interest > 0 ? formatCurrency(interest) : "R$ ___"}</span>
                </div>
              </div>
            )}

            <div className="border-t border-gray-400 mt-3 pt-3 flex justify-between font-bold text-lg">
              <span>Total Pago:</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600 pt-6 border-t border-gray-300">
            <p className="uppercase">
              SÃO PAULO, {new Date().toLocaleDateString("pt-BR", { 
                day: "2-digit", 
                month: "long", 
                year: "numeric" 
              }).toUpperCase()}, {new Date().toLocaleTimeString("pt-BR", { 
                hour: "2-digit", 
                minute: "2-digit" 
              })}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleGeneratePDF}
            disabled={isGeneratingPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            {isGeneratingPDF ? "Gerando PDF..." : "Baixar PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}