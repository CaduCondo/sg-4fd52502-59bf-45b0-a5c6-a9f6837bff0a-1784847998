import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Camera, Paperclip, Home, User, DollarSign, CreditCard, Edit, X, Upload, FileText, Loader2, ImageIcon } from "lucide-react";
import type { Payment, Rental, Property, Tenant } from "@/types";
import { calculateCorrectedDeposit } from "@/services/igpmService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Attachment {
  url: string;
  name: string;
  description?: string;
  uploadProgress?: number;
}

interface PaymentFormData {
  id?: string;
  paid_amount?: number;
  payment_date?: string;
  payment_time?: string;
  payment_method?: string;
  payment_location?: string;
  payment_code?: string;
  notes?: string;
  late_fee?: number;
  interest?: number;
  discount_amount?: number;
  attachments?: any;
  rentals?: any;
  rental_terminations?: any;
  breakdown?: any;
  due_date?: string;
  status?: string;
}

interface ManagePaymentFormProps {
  paymentId: string;
  onSuccess?: (data: {
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
  }) => void;
  onClose?: () => void;
  embedded?: boolean;
}

const BreakdownItem = memo(({ item, isDeduction, igpmCorrection }: { item: any; isDeduction?: boolean; igpmCorrection?: any }) => {
  const isDepositDeduction = item.description?.includes("Devolução de Caução");
  
  const displayAmount = isDepositDeduction && igpmCorrection && igpmCorrection.correctedAmount > 0
    ? igpmCorrection.correctedAmount 
    : Math.abs(item.amount);

  const formatCurrency = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div>
      <div className="flex justify-between items-start text-sm">
        <div className="flex-1">
          <span className={isDepositDeduction ? "block" : ""}>
            {isDepositDeduction ? "Devolução de Caução" : item.description}
          </span>
          {isDepositDeduction && igpmCorrection && (
            <span className="block text-xs text-muted-foreground mt-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help underline decoration-dotted hover:text-primary transition-colors">
                      (corrigido pela Taxa da Poupança)
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[450px] p-0 bg-white dark:bg-gray-900 border-2 shadow-xl z-50">
                    <div className="space-y-3 p-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-1.5">
                        <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                          💰 Resumo da Correção
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Valor Original:</span>
                            <p className="font-semibold text-blue-900 dark:text-blue-100">
                              {formatCurrency(igpmCorrection.originalAmount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Valor Corrigido:</span>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(igpmCorrection.correctedAmount)}
                            </p>
                          </div>
                        </div>
                        <div className="pt-1.5 border-t border-blue-200 dark:border-blue-800">
                          <span className="text-muted-foreground text-xs">Correção Total:</span>
                          <p className="font-bold text-base text-blue-900 dark:text-blue-100">
                            {(igpmCorrection.poupancaPercentage ?? igpmCorrection.igpmPercentage ?? 0).toFixed(2)}% ({igpmCorrection.months} {igpmCorrection.months === 1 ? 'mês' : 'meses'})
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <p className="font-semibold text-xs text-gray-700 dark:text-gray-300 mb-2">
                          📅 Taxas Mensais Aplicadas
                        </p>
                        <div className="text-[11px] font-mono leading-relaxed max-h-[250px] overflow-y-auto text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                          {igpmCorrection.poupancaDetails || igpmCorrection.igpmDetails || "Detalhes de correção não disponíveis."}
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
          )}
        </div>
        <span className={`${isDeduction ? "text-red-600" : ""} font-medium whitespace-nowrap ml-4`}>
          {isDeduction ? "- " : ""}
          {formatCurrency(displayAmount)}
        </span>
      </div>
    </div>
  );
});

BreakdownItem.displayName = "BreakdownItem";

export function ManagePaymentForm({ paymentId, onSuccess, onClose, embedded = false }: ManagePaymentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
  
  const [removeFees, setRemoveFees] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [repairExpenses, setRepairExpenses] = useState<number>(0);
  const [repairExpensesInput, setRepairExpensesInput] = useState<string>("R$ 0,00");
  const [isTerminationPayment, setIsTerminationPayment] = useState(false);
  const [originalBreakdown, setOriginalBreakdown] = useState<any[]>([]);
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);
  const [igpmCorrection, setIgpmCorrection] = useState<{
    originalAmount: number;
    correctedAmount: number;
    igpmPercentage?: number;
    poupancaPercentage?: number;
    months: number;
    igpmDetails?: string;
    poupancaDetails?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    payment_date: "",
    payment_method: "pix",
    payment_time: "",
    amount_to_pay: "",
    notes: "",
    pix_code_type: "CP",
  });
  
  const [paymentHour, setPaymentHour] = useState<string>("");
  const [paymentMinute, setPaymentMinute] = useState<string>("");
  const [paymentSecond, setPaymentSecond] = useState<string>("");

  const [payment, setPayment] = useState<PaymentFormData | null>(null);
  const [rental, setRental] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [rentalValue, setRentalValue] = useState(0);
  const [garageValue, setGarageValue] = useState(0);
  const [lateFeePercentage, setLateFeePercentage] = useState(0);
  const [interestRatePercentage, setInterestRatePercentage] = useState(0);
  const [waiveFees, setWaiveFees] = useState(false);

  const formatCurrency = useCallback((value: string | number): string => {
    const numericValue = typeof value === "string" ? value.replace(/\D/g, "") : String(value).replace(/\D/g, "");
    const number = parseFloat(numericValue) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(number);
  }, []);

  const parseCurrency = useCallback((value: string): number => {
    const numericValue = value.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(numericValue) || 0;
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("configs")
        .select("late_fee_percentage, interest_rate_percentage")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setLateFeePercentage(data.late_fee_percentage || 0);
        setInterestRatePercentage(data.interest_rate_percentage || 0);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  }, []);

  const loadPaymentData = useCallback(async () => {
    try {
      console.log("🔍 Loading payment data for ID:", paymentId);
      
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select(`
          *,
          rentals!inner (
            *,
            properties!inner (
              *,
              locations!inner (*)
            ),
            tenants!inner (*)
          )
        `)
        .eq("id", paymentId)
        .single();

      if (paymentError) throw paymentError;

      console.log("📦 Payment data loaded:", paymentData);
      console.log("🏠 Property:", paymentData.rentals.properties);
      console.log("👤 Tenant:", paymentData.rentals.tenants);

      setPayment(paymentData);
      setRental(paymentData.rentals);
      setProperty(paymentData.rentals.properties);
      setLocation(paymentData.rentals.properties.locations);
      setTenant(paymentData.rentals.tenants);

      let effectiveRentalValue = 0;
      let effectiveGarageValue = 0;

      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            breakdownData = JSON.parse(breakdownData);
          }
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      if (paymentData.breakdown) {
        try {
          let breakdownData = paymentData.breakdown;
          if (typeof breakdownData === "string") {
            try {
              breakdownData = JSON.parse(breakdownData);
            } catch (e) {
              console.error("Erro ao parsear breakdown:", e);
              breakdownData = [];
            }
          }
          
          // Garantir que breakdownData seja sempre um array
          if (!Array.isArray(breakdownData)) {
            breakdownData = [];
          }
          
          console.log("📊 Breakdown parsed:", breakdownData);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional") || 
            item.description?.toLowerCase().includes("aluguel") && item.description?.toLowerCase().includes("proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
          
          console.log("💰 Values - Rental:", effectiveRentalValue, "Garage:", effectiveGarageValue);
        } catch (error) {
          console.error("❌ Error parsing breakdown:", error);
          effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
          effectiveGarageValue = paymentData.rentals.garage_value || 0;
          
          if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
            effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
          }
        }
      } else {
        effectiveRentalValue = paymentData.rentals.monthly_rent || 0;
        effectiveGarageValue = paymentData.rentals.garage_value || 0;
        
        if (paymentData.rentals.has_garage && effectiveGarageValue > 0) {
          effectiveRentalValue = effectiveRentalValue - effectiveGarageValue;
        }
      }

      setRentalValue(effectiveRentalValue);
      setGarageValue(effectiveGarageValue);

      const alreadyPaid = paymentData.status === "paid";
        setIsPaid(alreadyPaid);