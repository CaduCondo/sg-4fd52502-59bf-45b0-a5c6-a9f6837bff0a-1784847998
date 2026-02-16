import { useRef, useEffect, useState } from "react";
import { X, Printer, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Payment, Rental, Property, Tenant } from "@/types";
import html2pdf from "html2pdf.js";
import { supabase } from "@/integrations/supabase/client";

interface PaymentReceiptProps {
  payment: Payment;
  rental: Rental;
  property: Property;
  tenant: Tenant;
  onClose: () => void;
  lateFee?: number;
  interest?: number;
}

interface BreakdownItem {
  description: string;
  amount: number;
  type: "addition" | "deduction";
}

export function PaymentReceipt({
  payment,
  rental,
  property,
  tenant,
  onClose,
  lateFee: propLateFee,
  interest: propInterest,
}: PaymentReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [lateFeeFromDB, setLateFeeFromDB] = useState<number>(0);
  const [interestFromDB, setInterestFromDB] = useState<number>(0);
  const [breakdownFromDB, setBreakdownFromDB] = useState<any>(null);
  const [typeFromDB, setTypeFromDB] = useState<string>("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      if (!payment.id) return;
      
      console.log("🔍 BUSCANDO VALORES DO BANCO para payment.id:", payment.id);
      
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("late_fee, interest, breakdown, type")
          .eq("id", payment.id)
          .maybeSingle();

        if (error) {
          console.error("❌ Erro Supabase:", error);
          return;
        }

        console.log("✅ VALORES RETORNADOS DO BANCO:", JSON.stringify(data, null, 2));

        if (data) {
          // Cast para any para evitar erros de tipagem com colunas novas
          const paymentData = data as any;
          
          setLateFeeFromDB(Number(paymentData.late_fee) || 0);
          setInterestFromDB(Number(paymentData.interest) || 0);
          setTypeFromDB(paymentData.type || "");
          
          if (paymentData.breakdown) {
            console.log("📦 BREAKDOWN DO BANCO (RAW):", paymentData.breakdown);
            
            // Parse breakdown se for string
            const parsedBreakdown = typeof paymentData.breakdown === "string" 
              ? JSON.parse(paymentData.breakdown)
              : paymentData.breakdown;
            
            setBreakdownFromDB(parsedBreakdown);
            console.log("✅ BREAKDOWN SALVO NO ESTADO:", JSON.stringify(parsedBreakdown, null, 2));
          }
          
          console.log("✅ TYPE SALVO NO ESTADO:", paymentData.type);
        }
      } catch (error) {
        console.error("❌ Erro ao buscar detalhes do pagamento:", error);
      }
    };

    fetchPaymentDetails();
  }, [payment.id]);

  // Prioridade: 1. Banco de Dados (mais confiável/recente) -> 2. Props passadas -> 3. Objeto payment original
  const lateFee = lateFeeFromDB || propLateFee || (payment.lateFee || (payment as any).late_fee || 0);
  const interest = interestFromDB || propInterest || (payment.interest || 0);
  
  console.log("Recibo Valores Finais:", { lateFee, interest });

  // Usar type e breakdown do banco, com fallback para payment
  const paymentType = typeFromDB || payment.type || "";
  const paymentBreakdown = breakdownFromDB || payment.breakdown;
  
  console.log("🔍 FONTE DOS DADOS:");
  console.log("  typeFromDB:", typeFromDB, "→ usando:", paymentType);
  console.log("  breakdownFromDB:", breakdownFromDB ? "EXISTS" : "NULL", "→ usando:", paymentBreakdown ? "EXISTS" : "NULL");

  // Estrutura para armazenar os itens do breakdown
  const breakdownItems: BreakdownItem[] = [];
  let totalAmount = 0;
  
  console.log("🔍 INICIANDO PROCESSAMENTO DO BREAKDOWN");
  console.log("  payment.type:", payment.type);
  console.log("  paymentType (do banco):", paymentType);
  console.log("  isTermination:", paymentType === "termination");
  console.log("  payment.breakdown (tipo):", typeof payment.breakdown);
  console.log("  payment.breakdown (conteúdo):", payment.breakdown);
  console.log("  paymentBreakdown (do banco - tipo):", typeof paymentBreakdown);
  console.log("  paymentBreakdown (do banco - conteúdo):", JSON.stringify(paymentBreakdown, null, 2));
  
  const isTermination = paymentType === "termination";
  
  // Se é rescisão e tem breakdown, processar os valores específicos
  if (isTermination && paymentBreakdown) {
    console.log("✅ ENTRANDO NO BLOCO DE RESCISÃO");
    try {
      let breakdownData = paymentBreakdown;
      
      // Se for string, fazer parse
      if (typeof breakdownData === "string") {
        breakdownData = JSON.parse(breakdownData);
      }

      console.log("📊 BREAKDOWN PARSEADO:", JSON.stringify(breakdownData, null, 2));

      // Se o breakdown já é um array (formato novo do banco)
      if (Array.isArray(breakdownData)) {
        console.log("✅ BREAKDOWN É UM ARRAY - processando diretamente");
        
        breakdownData.forEach((item: any) => {
          const amount = Math.abs(Number(item.amount || 0));
          const description = item.description || "";
          const type = item.type || "addition";
          
          if (amount > 0) {
            console.log(`  ✅ Adicionando item: ${description} = ${amount} (${type})`);
            breakdownItems.push({
              description,
              amount,
              type: type as "addition" | "deduction"
            });
          }
        });
      } else {
        // Formato antigo (objeto com propriedades)
        console.log("✅ BREAKDOWN É UM OBJETO - extraindo propriedades");
        
        const proportionalRent = Number(breakdownData.proportionalRent || 0);
        const terminationFee = Number(breakdownData.terminationFee || 0);
        const depositRefund = Number(breakdownData.depositRefund || 0);
        const additionalExpenses = Number(breakdownData.additionalExpenses || 0);

        console.log("📊 VALORES EXTRAÍDOS:", {
          proportionalRent,
          terminationFee,
          depositRefund,
          additionalExpenses
        });

        if (proportionalRent > 0) {
          console.log("  ✅ Adicionando Aluguel Proporcional:", proportionalRent);
          breakdownItems.push({
            description: "Aluguel Proporcional",
            amount: proportionalRent,
            type: "addition"
          });
        }

        if (terminationFee > 0) {
          console.log("  ✅ Adicionando Multa Rescisória:", terminationFee);
          breakdownItems.push({
            description: "Multa Rescisória",
            amount: terminationFee,
            type: "addition"
          });
        }

        if (depositRefund !== 0) {
          console.log("  ✅ Adicionando Devolução de Caução:", depositRefund);
          breakdownItems.push({
            description: "Devolução de Caução",
            amount: Math.abs(depositRefund),
            type: depositRefund < 0 ? "deduction" : "addition"
          });
        }

        if (additionalExpenses > 0) {
          console.log("  ✅ Adicionando Despesas Adicionais:", additionalExpenses);
          breakdownItems.push({
            description: "Despesas Adicionais",
            amount: additionalExpenses,
            type: "addition"
          });
        }
      }
    } catch (e) {
      console.error("❌ ERRO ao processar breakdown de rescisão:", e);
    }
  } else {
    console.log("⚠️ NÃO É RESCISÃO OU NÃO TEM BREAKDOWN");
    // Se não tem itens, adicionar valor base
    const baseAmount = payment.expectedAmount || 0;
    if (baseAmount > 0) {
      breakdownItems.push({
        description: "Valor do Aluguel",
        amount: baseAmount,
        type: "addition"
      });
    }

    // SEMPRE ADICIONAR MULTA SE EXISTIR (priorizando a prop)
    if (lateFee > 0) {
      breakdownItems.push({
        description: "Multa por Atraso",
        amount: lateFee,
        type: "addition"
      });
    }

    // SEMPRE ADICIONAR JUROS SE EXISTIR (priorizando a prop)
    if (interest > 0) {
      breakdownItems.push({
        description: "Juros por Atraso",
        amount: interest,
        type: "addition"
      });
    }
    
    // Outros itens do breakdown original (excluindo aluguel, multa e juros já adicionados)
    if (payment.breakdown) {
      try {
        const breakdownData = typeof payment.breakdown === "string" 
          ? JSON.parse(payment.breakdown) 
          : payment.breakdown;

        if (Array.isArray(breakdownData)) {
          breakdownData.forEach((item: any) => {
            const amount = Number(item.amount || 0);
            const description = item.description || "";
            const type = item.type || (amount >= 0 ? "addition" : "deduction");

            if (amount !== 0 && 
                !description.includes("Multa") && 
                !description.includes("Juros") && 
                !description.includes("Aluguel")) {
              breakdownItems.push({
                description,
                amount: Math.abs(amount),
                type
              });
            }
          });
        } else if (typeof breakdownData === "object") {
           Object.entries(breakdownData).forEach(([key, value]: [string, any]) => {
            const amount = Number(value || 0);
            let description = key;
            
            // Traduzir chaves
            const translations: Record<string, string> = {
              proportionalRent: "Aluguel Proporcional",
              terminationFee: "Multa Rescisória",
              depositRefund: "Devolução de Caução",
              additionalExpenses: "Despesas Adicionais",
              baseAmount: "Valor Base",
              discount: "Desconto"
            };
            
            if (translations[key]) description = translations[key];
            const type = amount >= 0 ? "addition" : "deduction";

            if (amount !== 0 && 
                key !== "lateFee" && 
                key !== "interest" && 
                key !== "rentAmount" &&
                key !== "expectedAmount") {
              breakdownItems.push({ description, amount: Math.abs(amount), type });
            }
          });
        }
      } catch (e) {
        console.error("Erro breakdown", e);
      }
    }
  }

  console.log("📋 BREAKDOWN ITEMS FINAIS:", JSON.stringify(breakdownItems, null, 2));

  // Calcular total
  if (breakdownItems.length > 0) {
    totalAmount = breakdownItems.reduce((sum, item) => {
      return item.type === "addition" 
        ? sum + item.amount 
        : sum - item.amount;
    }, 0);
  } else {
    totalAmount = payment.paidAmount || payment.expectedAmount || 0;
  }

  console.log("💰 TOTAL AMOUNT CALCULADO:", totalAmount);

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