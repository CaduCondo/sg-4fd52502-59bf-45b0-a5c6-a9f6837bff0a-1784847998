import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/masks";
import type { Payment, Rental, Property, Tenant } from "@/types";

interface PaymentReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  rental: Rental;
  property: Property;
  tenant: Tenant;
}

export function PaymentReceipt({ isOpen, onClose, payment, rental, property, tenant }: PaymentReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const getMonthName = (month: number): string => {
    const months = [
      "janeiro", "fevereiro", "março", "abril", "maio", "junho",
      "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ];
    return months[month - 1] || "";
  };

  const numberToWords = (value: number): string => {
    const units = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const teens = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const tens = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const hundreds = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

    // Handle zero
    if (value === 0 || !value || isNaN(value)) return "zero reais";
    
    // Handle exactly 100
    if (value === 100) return "cem reais";

    const integerPart = Math.floor(value);
    const decimalPart = Math.round((value - integerPart) * 100);

    let result = "";

    // Handle thousands (1,000 - 999,999)
    if (integerPart >= 1000) {
      const thousands = Math.floor(integerPart / 1000);
      
      if (thousands === 1) {
        result = "mil";
      } else if (thousands < 10) {
        result = units[thousands] + " mil";
      } else if (thousands < 20) {
        result = teens[thousands - 10] + " mil";
      } else if (thousands < 100) {
        const tensDigit = Math.floor(thousands / 10);
        const unitsDigit = thousands % 10;
        result = tens[tensDigit];
        if (unitsDigit > 0) result += " e " + units[unitsDigit];
        result += " mil";
      } else {
        // 100-999 thousand
        const hundredsDigit = Math.floor(thousands / 100);
        const remainder = thousands % 100;
        result = hundreds[hundredsDigit];
        if (remainder > 0) {
          result += " e ";
          if (remainder < 10) {
            result += units[remainder];
          } else if (remainder < 20) {
            result += teens[remainder - 10];
          } else {
            const tensDigit = Math.floor(remainder / 10);
            const unitsDigit = remainder % 10;
            result += tens[tensDigit];
            if (unitsDigit > 0) result += " e " + units[unitsDigit];
          }
        }
        result += " mil";
      }
      
      const afterThousands = integerPart % 1000;
      if (afterThousands > 0) {
        result += " ";
        if (afterThousands < 100) result += "e ";
      }
    }

    // Handle hundreds (100-999)
    const remainder = integerPart % 1000;
    if (remainder >= 100) {
      const hundredsDigit = Math.floor(remainder / 100);
      result += hundreds[hundredsDigit];
      if (remainder % 100 > 0) result += " e ";
    }

    // Handle tens and units (0-99)
    const lastTwo = remainder % 100;
    if (lastTwo >= 20) {
      result += tens[Math.floor(lastTwo / 10)];
      if (lastTwo % 10 > 0) result += " e " + units[lastTwo % 10];
    } else if (lastTwo >= 10) {
      result += teens[lastTwo - 10];
    } else if (lastTwo > 0) {
      result += units[lastTwo];
    }

    // Add "real" or "reais"
    result += integerPart === 1 ? " real" : " reais";

    // Handle decimal part (cents)
    if (decimalPart > 0) {
      result += " e ";
      if (decimalPart >= 20) {
        result += tens[Math.floor(decimalPart / 10)];
        if (decimalPart % 10 > 0) result += " e " + units[decimalPart % 10];
      } else if (decimalPart >= 10) {
        result += teens[decimalPart - 10];
      } else {
        result += units[decimalPart];
      }
      result += decimalPart === 1 ? " centavo" : " centavos";
    }

    return result.trim();
  };

  const baseRent = rental.monthlyRent;
  const garageValue = rental.hasGarage && rental.garageValue ? rental.garageValue : 0;
  const lateCharges = (payment.lateFee || 0) + (payment.interest || 0);
  const totalValue = payment.paidAmount || 0;

  const fullAddress = [
    property.location,
    property.address,
    property.number,
    property.complement,
    property.neighborhood,
    property.city,
    property.state,
    property.zipCode
  ].filter(Boolean).join(", ");

  const currentDate = new Date();
  const currentDateStr = currentDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
  const currentTime = currentDate.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });

  const rentalStartDate = new Date(rental.startDate).toLocaleDateString("pt-BR");
  const dueDate = new Date(payment.dueDate).toLocaleDateString("pt-BR");
  const referenceMonth = getMonthName(payment.referenceMonth);
  const referenceYear = payment.referenceYear;

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Recibo de Aluguel</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.8; }
                .receipt-container { max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
                .title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .content { text-align: justify; margin-bottom: 20px; font-size: 14px; }
                .details { margin: 20px 0; padding: 15px; background: #f5f5f5; border-left: 4px solid #059669; }
                .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
                .detail-label { font-weight: bold; }
                .footer { margin-top: 40px; text-align: right; }
                .signature { margin-top: 60px; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
              </style>
            </head>
            <body>
              ${receiptRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Recibo de Aluguel",
          text: `Recibo de pagamento de aluguel - ${tenant.name} - ${referenceMonth}/${referenceYear}`
        });
      } catch (error) {
        console.error("Erro ao compartilhar:", error);
      }
    } else {
      alert("Compartilhamento não suportado neste navegador");
    }
  };

  const handleSavePDF = () => {
    if (typeof window !== "undefined" && receiptRef.current) {
      handlePrint();
    }
  };

  const handleEmail = () => {
    const subject = `Recibo de Aluguel - ${referenceMonth}/${referenceYear}`;
    const body = `Segue recibo de pagamento de aluguel referente ao mês de ${referenceMonth}/${referenceYear}.`;
    window.location.href = `mailto:${tenant.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-emerald-700">Recibo de Pagamento</DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="space-y-6 p-6 bg-white">
          <div className="text-center border-b-2 border-slate-800 pb-4">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">RECIBO DE ALUGUEL</h2>
            <p className="text-sm text-slate-600">Comprovante de Pagamento</p>
          </div>

          <div className="space-y-4 bg-emerald-50 p-4 rounded-lg border border-emerald-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Valor do Aluguel:</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(baseRent)}</p>
              </div>
              {garageValue > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700">Vaga de Garagem:</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(garageValue)}</p>
                </div>
              )}
              {lateCharges > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700">Encargos por Atraso:</p>
                  <p className="text-lg font-bold text-red-600">{formatCurrency(lateCharges)}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-700">Valor Total:</p>
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </div>

          <div className="text-justify leading-relaxed text-slate-800 space-y-4">
            <p className="text-lg">
              Recebi de <span className="font-bold">{tenant.name}</span> a importância de{" "}
              <span className="font-bold uppercase">{numberToWords(totalValue)}</span> ({formatCurrency(totalValue)}), proveniente ao depósito de aluguel
              referente ao mês de <span className="font-bold">{referenceMonth} de {referenceYear}</span>, tendo seu vencimento
              em <span className="font-bold">{dueDate}</span> do imóvel localizado em{" "}
              <span className="font-bold">{fullAddress}</span>, após apresentação dos comprovantes de depósito bancário e
              contas de água e luz do mês anterior pagas, sendo este vinculado ao{" "}
              <span className="font-bold">INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO PARA FINS RESIDENCIAL</span>,
              assinado entre as partes em <span className="font-bold">{rentalStartDate}</span>.
            </p>

            <p className="text-right font-semibold mt-8">
              São Paulo, {currentDateStr}, {currentTime}
            </p>
          </div>

          <div className="mt-12 pt-8 border-t-2 border-slate-300">
            <div className="text-center">
              <div className="inline-block border-t-2 border-slate-800 pt-2 px-12">
                <p className="font-bold text-slate-900">Assinatura do Locador</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleShare} className="gap-2">
            📤 Compartilhar
          </Button>
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            🖨️ Imprimir
          </Button>
          <Button variant="outline" onClick={handleEmail} className="gap-2">
            📧 Enviar por Email
          </Button>
          <Button variant="outline" onClick={handleSavePDF} className="gap-2">
            💾 Salvar PDF
          </Button>
          <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}