import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, Printer, Share2 } from "lucide-react";
import { Payment, Rental, Property, Tenant } from "@/types";
import { getPaymentById } from "@/services/paymentService";

interface PaymentReceiptProps {
  payment: Payment;
  rental: Rental;
  property: Property;
  tenant: Tenant;
  onClose: () => void;
}

interface BreakdownItem {
  description: string;
  amount: number;
  type: "addition" | "deduction";
}

export function PaymentReceipt({ payment: initialPayment, rental, property, tenant, onClose }: PaymentReceiptProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [payment, setPayment] = useState(initialPayment);

  const isTermination = payment.type === "termination";

  console.log("\n=== PAYMENT RECEIPT - ANÁLISE COMPLETA ===");
  console.log("payment:", payment);
  console.log("payment.type:", payment.type);
  console.log("payment.breakdown:", payment.breakdown);
  console.log("payment.lateFee:", payment.lateFee);
  console.log("payment.interest:", payment.interest);
  console.log("isTermination:", isTermination);

  // Estrutura para armazenar os itens do breakdown
  const breakdownItems: BreakdownItem[] = [];
  let totalAmount = 0;

  // LÓGICA MELHORADA PARA PARSEAR BREAKDOWN
  if (payment.breakdown) {
    try {
      const breakdownData = typeof payment.breakdown === "string" 
        ? JSON.parse(payment.breakdown) 
        : payment.breakdown;

      console.log("📊 BREAKDOWN PARSEADO:", breakdownData);

      if (Array.isArray(breakdownData)) {
        // Breakdown em formato de array
        breakdownData.forEach((item: any) => {
          const amount = Number(item.amount || 0);
          const description = item.description || "";
          const type = item.type || (amount >= 0 ? "addition" : "deduction");

          if (amount !== 0) {
            breakdownItems.push({
              description,
              amount: Math.abs(amount),
              type
            });
            console.log(`  ✓ Item: ${description} = ${amount} (${type})`);
          }
        });
      } else if (typeof breakdownData === "object") {
        // Breakdown em formato de objeto
        Object.entries(breakdownData).forEach(([key, value]: [string, any]) => {
          const amount = Number(value || 0);
          
          let description = key;
          // Traduzir chaves técnicas para descrições amigáveis
          const translations: Record<string, string> = {
            proportionalRent: "Aluguel Proporcional",
            terminationFee: "Multa Rescisória",
            depositRefund: "Devolução de Caução",
            additionalExpenses: "Despesas Adicionais",
            lateFee: "Multa por Atraso",
            interest: "Juros por Atraso",
            baseAmount: "Valor Base",
            discount: "Desconto",
            rentAmount: "Valor do Aluguel"
          };
          
          if (translations[key]) {
            description = translations[key];
          }

          const type = amount >= 0 ? "addition" : "deduction";

          if (amount !== 0) {
            breakdownItems.push({
              description,
              amount: Math.abs(amount),
              type
            });
            console.log(`  ✓ Item: ${description} = ${amount} (${type})`);
          }
        });
      }
    } catch (error) {
      console.error("❌ Erro ao parsear breakdown:", error);
    }
  }

  // FALLBACK: Se breakdown está vazio mas temos lateFee/interest, adicionar manualmente
  if (breakdownItems.length === 0) {
    console.log("⚠️ Breakdown vazio, usando fallback com lateFee e interest");
    
    // Adicionar valor base
    const baseAmount = payment.expectedAmount || 0;
    if (baseAmount > 0) {
      breakdownItems.push({
        description: "Valor do Aluguel",
        amount: baseAmount,
        type: "addition"
      });
    }

    // Adicionar multa se existir
    if (payment.lateFee && payment.lateFee > 0) {
      breakdownItems.push({
        description: "Multa por Atraso",
        amount: payment.lateFee,
        type: "addition"
      });
      console.log(`  ✓ Multa adicionada: R$ ${payment.lateFee}`);
    }

    // Adicionar juros se existir
    if (payment.interest && payment.interest > 0) {
      breakdownItems.push({
        description: "Juros por Atraso",
        amount: payment.interest,
        type: "addition"
      });
      console.log(`  ✓ Juros adicionados: R$ ${payment.interest}`);
    }
  }

  // Calcular total a partir dos itens do breakdown
  if (breakdownItems.length > 0) {
    totalAmount = breakdownItems.reduce((sum, item) => {
      return item.type === "addition" 
        ? sum + item.amount 
        : sum - item.amount;
    }, 0);
  } else {
    // Fallback final: usar paidAmount se não houver breakdown
    totalAmount = payment.paidAmount || payment.expectedAmount || 0;
  }

  console.log("\n✅ VALORES FINAIS EXTRAÍDOS:");
  console.log("breakdownItems:", breakdownItems);
  console.log("totalAmount:", totalAmount);
  console.log("=====================================\n");

  const currentInstallment = payment.installment || 1;
  const totalInstallments = isTermination 
    ? currentInstallment
    : (payment.totalInstallments || rental.installments || rental.totalInstallments || 24);

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

  const handlePrint = () => {
    window.print();
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

  // Formatar endereço do imóvel (SEM o nome do local)
  const getPropertyAddress = () => {
    console.log("\n🏠 DADOS DO PROPERTY COMPLETO:", property);
    
    const parts = [];
    
    // 1. RUA (já vem com "Rua" no texto)
    if (property.address) {
      console.log(`  ✓ RUA: ${property.address}`);
      parts.push(property.address.toUpperCase());
    }
    
    // 2. NÚMERO
    if (property.number) {
      console.log(`  ✓ NÚMERO: ${property.number}`);
      parts.push(`Nº ${property.number}`);
    }
    
    // 3. COMPLEMENTO (APTO, CASA, etc) - do Property
    if (property.complement) {
      console.log(`  ✓ COMPLEMENTO: ${property.complement}`);
      parts.push(property.complement.toUpperCase());
    }
    
    // 4. BAIRRO
    if (property.neighborhood) {
      console.log(`  ✓ BAIRRO: ${property.neighborhood}`);
      parts.push(property.neighborhood.toUpperCase());
    }
    
    // 5. CIDADE
    if (property.city) {
      console.log(`  ✓ CIDADE: ${property.city}`);
      parts.push(property.city.toUpperCase());
    }
    
    // 6. ESTADO
    if (property.state) {
      console.log(`  ✓ ESTADO: ${property.state}`);
      parts.push(property.state.toUpperCase());
    }
    
    const finalAddress = parts.length > 0 ? parts.join(", ") : "LOCAL NÃO INFORMADO";
    console.log(`\n📍 ENDEREÇO FINAL: ${finalAddress}\n`);
    
    return finalAddress;
  };

  const propertyAddress = getPropertyAddress();

  const handleShareWhatsApp = () => {
    const referenceMonthName = payment.referenceMonth 
      ? new Date(2000, payment.referenceMonth - 1).toLocaleString("pt-BR", { month: "long" })
      : "N/A";
    const referenceYear = payment.referenceYear || new Date().getFullYear();

    const message = isTermination
      ? `📄 *RECIBO DE RESCISÃO DE CONTRATO*\n\nLocatário: ${tenant.name}\nValor Total: ${formatCurrency(totalAmount)}\nReferência: ${referenceMonthName} de ${referenceYear}\nImóvel: ${propertyAddress}\n\n✅ Rescisão processada e recibo gerado.`
      : `📄 *RECIBO DE PAGAMENTO*\n\nLocatário: ${tenant.name}\nValor Pago: ${formatCurrency(totalAmount)}\nReferência: ${referenceMonthName} de ${referenceYear}\nVencimento: ${formatDate(payment.dueDate)}\nImóvel: ${propertyAddress}\n\n✅ Pagamento confirmado e recibo gerado.`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
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
              {isTermination ? "Recibo de Rescisão de Contrato" : "Recibo de Pagamento"}
            </span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div id="receipt-content" className="space-y-6 p-8 bg-white text-black">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">
              {isTermination ? "RECIBO DE RESCISÃO DE CONTRATO" : "RECIBO DE ALUGUEL"}
            </h1>
            {!isTermination && (
              <p className="text-sm text-gray-600">({currentInstallment}/{totalInstallments})</p>
            )}
          </div>

          <div className="space-y-4 text-justify leading-relaxed">
            {isTermination ? (
              <p>
                Recebi dos Srs. <strong>{tenant.name.toUpperCase()}</strong>, a importância de{" "}
                <strong>{extenso(totalAmount)} ({formatCurrency(totalAmount)})</strong>, referente à rescisão do contrato de locação
                do imóvel situado em{" "}
                <strong>{propertyAddress}</strong>, conforme detalhamento abaixo, sendo este vinculado ao INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO PARA FIM RESIDENCIAL, 
                assinado entre as partes em <strong>{formatDate(rental.startDate)}</strong>.
              </p>
            ) : (
              <p>
                Recebi dos Srs. <strong>{tenant.name.toUpperCase()}</strong>, a importância de{" "}
                <strong>{extenso(totalAmount)} ({formatCurrency(totalAmount)})</strong>, proveniente ao depósito de aluguel
                referente ao mês de <strong>{referenceMonthName} de {referenceYear}</strong>, 
                tendo seu vencimento em <strong>{formatDate(payment.dueDate)}</strong>, 
                do imóvel situado em{" "}
                <strong>{propertyAddress}</strong>, após a apresentação dos comprovantes de depósito bancário e contas de água e luz do mês
                anterior pagos, sendo este vinculado ao INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO PARA FIM RESIDENCIAL, assinado entre as partes em{" "}
                <strong>{formatDate(rental.startDate)}</strong>.
              </p>
            )}
          </div>

          <div className="border-t border-gray-300 pt-4">
            <h3 className="font-semibold mb-3">Valores:</h3>
            
            {breakdownItems.length > 0 ? (
              <div className="space-y-2">
                {breakdownItems.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.description}:</span>
                    <span className={`font-medium ${item.type === "deduction" ? "text-red-600" : ""}`}>
                      {item.type === "deduction" ? "- " : ""}
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Valor:</span>
                  <span className="font-medium">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            )}

            <div className="border-t border-gray-400 mt-3 pt-3 flex justify-between font-bold text-lg">
              <span>{isTermination ? "Valor Total:" : "Total Pago:"}</span>
              <span className={totalAmount < 0 ? "text-red-600" : ""}>
                {formatCurrency(totalAmount)}
              </span>
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
            
            <div className="pt-8"></div>
            
            <img 
              src="/signature.png" 
              alt="Assinatura Carlos Aparecido D'Uvo" 
              className="w-32 h-auto mx-auto mb-2"
            />
            
            <div className="w-64 border-t border-gray-400 mx-auto mb-2"></div>
            
            <p className="text-[10pt] text-gray-600 font-medium">
              Carlos Aparecido D'Uvo
            </p>
          </div>
        </div>

        <div className="flex justify-between gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              WhatsApp
            </Button>
            
            <Button
              variant="outline"
              onClick={handleGeneratePDF}
              disabled={isGeneratingPDF}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isGeneratingPDF ? "Gerando PDF..." : "Baixar PDF"}
            </Button>
            
            <Button
              variant="default"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}