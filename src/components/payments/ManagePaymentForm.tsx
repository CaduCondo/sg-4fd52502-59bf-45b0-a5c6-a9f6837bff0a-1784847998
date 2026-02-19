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

      setPayment(paymentData);
      setRental(paymentData.rentals);
      setProperty(paymentData.rentals.properties);
      setLocation(paymentData.rentals.properties.locations);
      setTenant(paymentData.rentals.tenants);

      let effectiveRentalValue = 0;
      let effectiveGarageValue = 0;

      if (paymentData.breakdown) {
        try {
          const breakdownData = typeof paymentData.breakdown === 'string' 
            ? JSON.parse(paymentData.breakdown) 
            : (paymentData.breakdown || []);
          
          const aluguelItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel") && !item.description?.includes("Proporcional")
          );
          
          const garagemItem = breakdownData.find((item: any) => 
            item.description?.includes("Garagem") || item.description?.includes("Vaga")
          );
          
          const proporcionalItem = breakdownData.find((item: any) => 
            item.description?.includes("Aluguel Proporcional")
          );

          if (proporcionalItem) {
            effectiveRentalValue = proporcionalItem.amount || proporcionalItem.value || 0;
            effectiveGarageValue = 0;
          } else {
            effectiveRentalValue = aluguelItem?.amount || aluguelItem?.value || 0;
            effectiveGarageValue = garagemItem?.amount || garagemItem?.value || 0;
          }
        } catch (error) {
          console.error("Erro ao parsear breakdown:", error);
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
          const breakdownData = typeof paymentData.breakdown === 'string' 
            ? JSON.parse(paymentData.breakdown) 
            : (paymentData.breakdown || []);
          
          setOriginalBreakdown(breakdownData || []);
          
          if (isTermination) {
            const expensesItem = breakdownData.find((item: any) => 
              item.description?.includes("Despesas")
            );
            
            if (expensesItem) {
              const expValue = Math.abs(expensesItem.amount || 0);
              setRepairExpenses(expValue);
              setRepairExpensesInput(formatCurrency(expValue.toFixed(2)));
            }
          }
        } catch (error) {
          console.error("Erro ao parsear breakdown:", error);
          setOriginalBreakdown([]);
        }
      }

      if (isTermination && paymentData.rentals) {
        const depositText = paymentData.rentals.deposit;
        let originalDeposit = 0;
        
        if (depositText && typeof depositText === 'string') {
          const parsed = parseFloat(depositText.replace(/[^\d,]/g, '').replace(',', '.'));
          if (!isNaN(parsed)) {
            originalDeposit = parsed;
          }
        }
        
        const startDate = paymentData.rentals.start_date;
        const endDate = paymentData.rentals.end_date;
        
        if (originalDeposit > 0 && startDate && endDate) {
          const igpmCorrectionValue = calculateCorrectedDeposit(
            originalDeposit,
            startDate,
            endDate
          );
          
          setIgpmCorrection(igpmCorrectionValue);
        }
      }

      if (paymentData.attachments && Array.isArray(paymentData.attachments)) {
        const attachmentData = paymentData.attachments.map((att: any) => {
          if (typeof att === 'string') {
            return {
              url: att,
              name: att.split('/').pop() || 'Arquivo',
              description: ''
            };
          }
          return att;
        });
        setAttachments(attachmentData);
      }

      setFormData({
        payment_date: paymentData.payment_date || new Date().toISOString().split("T")[0],
        payment_method: paymentData.payment_method || "pix",
        payment_time: (paymentData as any).payment_time || "",
        amount_to_pay: paymentData.paid_amount 
          ? formatCurrency(paymentData.paid_amount.toFixed(2)) 
          : "",
        notes: paymentData.notes || "",
        pix_code_type: (paymentData as any).pix_code_type || "CP",
      });

      if ((paymentData as any).payment_time) {
        const [h, m, s] = (paymentData as any).payment_time.split(":");
        setPaymentHour(h || "");
        setPaymentMinute(m || "");
        setPaymentSecond(s || "00");
      }
      
    } catch (error) {
      console.error("Erro ao carregar dados do pagamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [paymentId, toast, formatCurrency, isPaid]);

  useEffect(() => {
    loadPaymentData();
    loadConfig();
  }, [loadPaymentData, loadConfig]);

  const calculateValues = useMemo(() => {
    const valorAluguel = Math.round((rentalValue + garageValue) * 100) / 100;
    
    let isProportional = false;
    let proportionalDays = 0;
    
    if (payment?.breakdown) {
      try {
        const breakdownData = typeof payment.breakdown === 'string' 
          ? JSON.parse(payment.breakdown) 
          : (payment.breakdown || []);
        
        const proportionalItem = breakdownData.find((item: any) => 
          item.description?.includes("Aluguel Proporcional")
        );
        
        if (proportionalItem) {
          isProportional = true;
          const match = proportionalItem.description.match(/\((\d+)\s+dias?\)/);
          if (match) {
            proportionalDays = parseInt(match[1]);
          }
        }
      } catch (error) {
        console.error("Erro ao verificar proporcional:", error);
      }
    }
    
    let multa = 0;
    let juros = 0;
    let diasAtraso = 0;

    if (payment && formData.payment_date) {
      const dueDate = new Date(payment.due_date + "T12:00:00");
      const paymentDate = new Date(formData.payment_date + "T12:00:00");

      if (paymentDate > dueDate) {
        const diffTime = paymentDate.getTime() - dueDate.getTime();
        diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let baseCalculo = 0;
        
        if (isTerminationPayment && originalBreakdown.length > 0) {
          baseCalculo = originalBreakdown
            .filter(item => 
              !item.description?.includes("Multa por Atraso") &&
              !item.description?.includes("Juros por Atraso")
            )
            .reduce((sum, item) => sum + item.amount, 0);
          
          baseCalculo = Math.abs(baseCalculo);
        } else {
          baseCalculo = Math.max(0, valorAluguel);
        }

        if (baseCalculo > 0) {
          multa = Math.round((baseCalculo * lateFeePercentage / 100) * 100) / 100;

          const jurosDiario = interestRatePercentage;
          juros = Math.round((baseCalculo * jurosDiario / 100 * diasAtraso) * 100) / 100;
        }
      }
    }

    const valorTotalSemIsencao = Math.round((valorAluguel + multa + juros) * 100) / 100;
    const valorAPagar = removeFees ? valorAluguel : valorTotalSemIsencao;
    
    const valorJaPago = payment?.paid_amount || 0;
    const valorRestante = Math.max(0, Math.round((valorAPagar - valorJaPago) * 100) / 100);

    return {
      valorAluguel: Math.round(valorAluguel * 100) / 100,
      multa: Math.round(multa * 100) / 100,
      juros: Math.round(juros * 100) / 100,
      valorTotal: Math.round(valorTotalSemIsencao * 100) / 100,
      valorAPagar: Math.round(valorAPagar * 100) / 100,
      valorJaPago: Math.round(valorJaPago * 100) / 100,
      valorRestante: Math.round(valorRestante * 100) / 100,
      diasAtraso,
      jurosDiario: interestRatePercentage,
      isProportional,
      proportionalDays,
    };
  }, [
    payment,
    formData.payment_date,
    rentalValue,
    garageValue,
    isTerminationPayment,
    originalBreakdown,
    removeFees,
    lateFeePercentage,
    interestRatePercentage,
    waiveFees
  ]);

  useEffect(() => {
    if (loading || !payment) return;
    
    const values = calculateValues;
    
    if (isTerminationPayment && originalBreakdown.length > 0) {
      let workingBreakdown = [...originalBreakdown];
      
      if (igpmCorrection && igpmCorrection.correctedAmount > 0) {
        workingBreakdown = workingBreakdown.map((item: any) => {
          if (item.description?.includes("Devolução de Caução")) {
            return {
              ...item,
              amount: -igpmCorrection.correctedAmount,
            };
          }
          return item;
        });
      }
      
      const cleanBreakdown = workingBreakdown.filter((item: any) => 
        !item.description?.includes("Despesas") && 
        !item.description?.includes("Multa por Atraso") && 
        !item.description?.includes("Juros por Atraso")
      );
      
      const breakdownTotal = cleanBreakdown.reduce((sum, item) => sum + item.amount, 0);
      const lateFees = removeFees ? 0 : (values.multa + values.juros);
      const newTotal = breakdownTotal + repairExpenses + lateFees;
      
      setCalculatedTotal(newTotal);
      
      if (isEditMode) {
        setFormData(prev => ({
          ...prev,
          amount_to_pay: formatCurrency(newTotal.toFixed(2))
        }));
      }
    } else if (!isTerminationPayment && isEditMode) {
      setFormData(prev => ({
        ...prev,
        amount_to_pay: formatCurrency(values.valorAPagar.toFixed(2))
      }));
    }
  }, [
    isTerminationPayment,
    originalBreakdown,
    repairExpenses,
    removeFees,
    calculateValues,
    isEditMode,
    loading,
    payment,
    igpmCorrection,
    formatCurrency,
    waiveFees
  ]);

  const addAttachment = useCallback(() => {
    setAttachments(prev => [...prev, { url: '', name: '', description: '' }]);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadToSupabase = async (file: File): Promise<string> => {
    console.log("📤 Uploading to Supabase Storage:", file.name);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `payment-attachments/${fileName}`;

    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error("❌ Supabase upload error:", error);
      throw error;
    }

    console.log("✅ File uploaded to Supabase:", data.path);

    const { data: { publicUrl } } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    console.log("🔗 Public URL:", publicUrl);
    return publicUrl;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log("⚠️ No file selected");
      return;
    }

    console.log("📎 File selected:", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error("❌ File too large:", file.size, "bytes");
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo tem ${(file.size / 1024 / 1024).toFixed(2)}MB. O tamanho máximo é 15MB`,
        variant: "destructive",
      });
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg", 
      "image/png",
      "image/webp",
      "application/pdf"
    ];
    
    if (!allowedTypes.includes(file.type)) {
      console.error("❌ Invalid file type:", file.type);
      toast({
        title: "Tipo de arquivo não suportado",
        description: "Apenas imagens (JPG, PNG, WEBP) e PDF são permitidos",
        variant: "destructive",
      });
      return;
    }

    console.log("✅ File validation passed");
    setUploadingFile(true);
    setUploadProgress({ ...uploadProgress, [index]: 0 });

    try {
      console.log("📤 Starting Supabase upload...");
      
      setUploadProgress(prev => ({ ...prev, [index]: 30 }));
      
      const url = await uploadToSupabase(file);
      
      setUploadProgress(prev => ({ ...prev, [index]: 100 }));
      
      console.log("✅ Upload successful, URL:", url);

      setAttachments(prev => {
        const newAttachments = [...prev];
        newAttachments[index] = {
          ...newAttachments[index],
          url,
          name: file.name,
          uploadProgress: 100,
        };
        console.log("📋 Attachments updated:", newAttachments);
        return newAttachments;
      });

      toast({
        title: "Arquivo enviado",
        description: "Comprovante anexado com sucesso",
      });
    } catch (error) {
      console.error("❌ Upload error:", error);
      
      let errorMessage = "Erro ao enviar arquivo. Tente novamente";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erro ao enviar arquivo",
        description: errorMessage,
        variant: "destructive",
      });

      setAttachments(prev => {
        const newAttachments = [...prev];
        newAttachments[index] = {
          ...newAttachments[index],
          url: "",
          name: "",
          uploadProgress: 0,
        };
        return newAttachments;
      });
    } finally {
      console.log("🏁 Upload process finished");
      setUploadingFile(false);
      setUploadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[index];
        return newProgress;
      });
    }
  };

  const handleEnableEdit = useCallback(() => {
    setIsEditMode(true);
    toast({
      title: "Modo de Edição",
      description: "Campos desbloqueados para edição.",
    });
  }, [toast]);

  const handleCancelEdit = useCallback(() => {
    setIsEditMode(false);
    loadPaymentData();
    toast({
      title: "Edição Cancelada",
      description: "Alterações descartadas.",
    });
  }, [loadPaymentData, toast]);

  const handleRepairExpensesChange = useCallback((value: string) => {
    setRepairExpensesInput(formatCurrency(value));
    setRepairExpenses(parseCurrency(formatCurrency(value)));
  }, [formatCurrency, parseCurrency]);

  const handleSubmit = async () => {
    if (!formData.payment_date || !formData.payment_method || !formData.amount_to_pay) {
      toast({
        title: "Atenção",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (formData.payment_method === "pix" && (!paymentHour || !paymentMinute)) {
      toast({
        title: "Atenção",
        description: "Informe o horário do recebimento para pagamentos via PIX",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const paidAmount = parseCurrency(formData.amount_to_pay);
      
      let expectedTotal = 0;
      let updatedBreakdown = payment?.breakdown;
      const values = calculateValues;

      if (isTerminationPayment) {
        try {
          let breakdownData = typeof payment.breakdown === 'string' 
            ? JSON.parse(payment.breakdown) 
            : (payment.breakdown || []);
          
          if (igpmCorrection && igpmCorrection.correctedAmount > 0) {
            breakdownData = breakdownData.map((item: any) => {
              if (item.description?.includes("Devolução de Caução")) {
                return {
                  ...item,
                  amount: -igpmCorrection.correctedAmount,
                };
              }
              return item;
            });
          }
          
          breakdownData = breakdownData.filter((item: any) => 
            !item.description?.includes("Despesas") &&
            !item.description?.includes("Multa por Atraso") &&
            !item.description?.includes("Juros por Atraso")
          );
          
          if (!removeFees && values.multa > 0) {
            breakdownData.push({
              description: "Multa por Atraso",
              amount: values.multa,
              type: "addition"
            });
          }
          if (!removeFees && values.juros > 0) {
            breakdownData.push({
              description: "Juros por Atraso",
              amount: values.juros,
              type: "addition"
            });
          }
          
          if (repairExpenses > 0) {
            breakdownData.push({
              description: "Despesas Adicionais*",
              amount: repairExpenses,
              type: "addition"
            });
          }
          
          updatedBreakdown = JSON.stringify(breakdownData);
          expectedTotal = breakdownData.reduce((sum: number, item: any) => sum + item.amount, 0);
        } catch (error) {
          console.error("Erro ao atualizar breakdown:", error);
          expectedTotal = calculatedTotal;
        }
      } else {
        expectedTotal = values.valorAPagar;
      }
      
      let paymentStatus: "paid" | "partial";
      let finalPaidAmount: number;
      
      if (isTerminationPayment) {
        const expectedAbs = Math.abs(expectedTotal);
        const difference = Math.abs(paidAmount - expectedAbs);
        paymentStatus = difference < 0.01 ? "paid" : "partial";
        finalPaidAmount = paidAmount;
      } else {
        const previousPaid = payment?.paid_amount || 0;
        finalPaidAmount = previousPaid + paidAmount;
        paymentStatus = finalPaidAmount >= expectedTotal ? "paid" : "partial";
      }

      const attachmentsToSave = attachments.filter(a => a.url).map(a => ({
        url: a.url,
        name: a.name,
        description: a.description
      }));

      const paymentDataUpdate = {
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        payment_time: formData.payment_method === "pix" 
          ? `${paymentHour.padStart(2, '0')}:${paymentMinute.padStart(2, '0')}:${paymentSecond.padStart(2, '0')}`
          : null,
        paid_amount: finalPaidAmount,
        notes: formData.notes,
        status: paymentStatus,
        attachments: attachmentsToSave.length > 0 ? attachmentsToSave : null,
        late_fee: isTerminationPayment ? (removeFees ? 0 : values.multa) : (removeFees ? 0 : values.multa),
        interest: isTerminationPayment ? (removeFees ? 0 : values.juros) : (removeFees ? 0 : values.juros),
        updated_at: new Date().toISOString(),
        pix_code_type: formData.pix_code_type,
        breakdown: updatedBreakdown,
      };

      const { error: updateError } = await supabase
        .from("payments")
        .update(paymentDataUpdate)
        .eq("id", paymentId);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso",
        description: paymentStatus === "partial" 
          ? `Pagamento parcial registrado! Restante: ${formatCurrency((Math.abs(expectedTotal) - paidAmount).toFixed(2))}`
          : isPaid ? "Pagamento atualizado com sucesso!" : "Pagamento registrado com sucesso!",
      });

      if (onSuccess) {
        const updatedPayment: any = {
          ...payment,
          ...paymentDataUpdate,
          lateFee: paymentDataUpdate.late_fee,
          interest: paymentDataUpdate.interest,
          paidAmount: paymentDataUpdate.paid_amount,
          paymentDate: paymentDataUpdate.payment_date,
          paymentMethod: paymentDataUpdate.payment_method,
        };

        onSuccess({
          payment: updatedPayment,
          rental: rental,
          property: property,
          tenant: tenant,
        });
      } else if (onClose) {
        onClose();
      } else {
        router.push("/payments");
      }

    } catch (error) {
      console.error("Erro ao confirmar recebimento:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao registrar pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const values = calculateValues;
  const isReadOnly = isPaid && !isEditMode;

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">
          Registrar Recebimento{isTerminationPayment ? " - Rescisão de Contrato" : ""}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-4 w-4" />
              Informações do Imóvel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Local:</span>
                <p className="text-foreground flex-1">{location?.name}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Compl:</span>
                <p className="text-foreground flex-1">{property?.complement}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Cidade:</span>
                <p className="text-foreground flex-1">{location?.city}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Informações do Locatário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Nome:</span>
                <p className="text-foreground flex-1">{tenant?.name}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">CPF:</span>
                <p className="text-foreground flex-1">{tenant?.cpf}</p>
              </div>
              <div className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[80px]">Tel:</span>
                <p className="text-foreground flex-1">{tenant?.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={isTerminationPayment ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Formação de Valores {isTerminationPayment && "- Rescisão"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isTerminationPayment ? (
                <>
                  {originalBreakdown
                    .filter(item => 
                      !item.description?.includes("Despesas") && 
                      !item.description?.includes("Multa por Atraso") &&
                      !item.description?.includes("Juros por Atraso")
                    )
                    .map((item, index) => (
                      <BreakdownItem 
                        key={index} 
                        item={item} 
                        isDeduction={item.type === "deduction"}
                        igpmCorrection={igpmCorrection}
                      />
                    ))}

                  <div className="border-t border-dashed my-2"></div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 items-center text-sm">
                      <span>Despesas Adicionais *</span>
                      
                      {isEditMode ? (
                        <Input
                          type="text"
                          placeholder="R$ 0,00"
                          value={repairExpensesInput}
                          onChange={(e) => handleRepairExpensesChange(e.target.value)}
                          className="text-right"
                          disabled={isReadOnly}
                        />
                      ) : (
                        <span className="font-medium text-right">
                          {formatCurrency(repairExpenses.toFixed(2))}
                        </span>
                      )}
                    </div>
                  </div>

                  {values.multa > 0 && (
                    <>
                      <div className="border-t border-dashed my-2"></div>
                      <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-2">
                          🚨 ATRASO NO PAGAMENTO ({values.diasAtraso} {values.diasAtraso === 1 ? 'dia' : 'dias'})
                        </p>
                        
                        <div className="flex justify-between text-sm">
                          <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                            Multa por Atraso ({lateFeePercentage}%)
                          </span>
                          <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                            + {formatCurrency(values.multa.toFixed(2))}
                          </span>
                        </div>

                        {values.juros > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                              Juros ({interestRatePercentage.toFixed(3)}% ao dia)
                            </span>
                            <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                              + {formatCurrency(values.juros.toFixed(2))}
                            </span>
                          </div>
                        )}

                        {isEditMode && (
                          <div className="flex items-center space-x-2 pt-2 border-t border-red-200 dark:border-red-800">
                            <Checkbox
                              id="remove-fees-termination"
                              checked={removeFees}
                              onCheckedChange={(checked) => setRemoveFees(checked as boolean)}
                              disabled={isReadOnly}
                            />
                            <label
                              htmlFor="remove-fees-termination"
                              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Retirar multa/juros por atraso
                            </label>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="flex justify-between pt-3 border-t-2 border-primary mt-2">
                    <span className="font-bold text-base">VALOR TOTAL</span>
                    <span className={`font-bold text-base ${calculatedTotal < 0 ? "text-red-600" : "text-primary"}`}>
                      {calculatedTotal < 0 ? "- " : ""}
                      {formatCurrency(Math.abs(calculatedTotal).toFixed(2))}
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground pt-2 border-t mt-2">
                    * Despesas Adicionais de Reforma/Limpeza/Pinturas ou reparos necessários após a saída do inquilino
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span>
                      {values.isProportional 
                        ? `Aluguel Proporcional (${values.proportionalDays} dias)` 
                        : "Valor Aluguel"}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(rentalValue.toFixed(2))}
                    </span>
                  </div>

                  {garageValue > 0 && !values.isProportional && (
                    <div className="flex justify-between text-sm">
                      <span>Valor Vaga</span>
                      <span className="font-medium">
                        {formatCurrency(garageValue.toFixed(2))}
                      </span>
                    </div>
                  )}

                  {values.multa > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                        Multa ({lateFeePercentage}%)
                      </span>
                      <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                        + {formatCurrency(values.multa.toFixed(2))}
                      </span>
                    </div>
                  )}

                  {values.juros > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                        Juros ({interestRatePercentage.toFixed(3)}% ao dia) + {values.diasAtraso} dias
                      </span>
                      <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                        + {formatCurrency(values.juros.toFixed(2))}
                      </span>
                    </div>
                  )}

                  {(values.multa > 0 || values.juros > 0) && isEditMode && (
                    <div className="flex items-center space-x-2 py-2 border-t">
                      <Checkbox
                        id="remove-fees"
                        checked={removeFees}
                        onCheckedChange={(checked) => setRemoveFees(checked as boolean)}
                        disabled={isReadOnly}
                      />
                      <label
                        htmlFor="remove-fees"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Retirar multa/juros
                      </label>
                    </div>
                  )}

                  {values.valorJaPago > 0 && (
                    <div className="flex justify-between pt-3 border-t">
                      <span className="text-sm text-green-600">Valor já Pago</span>
                      <span className="text-sm text-green-600 font-medium">
                        - {formatCurrency(values.valorJaPago.toFixed(2))}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-3 border-t-2 border-primary">
                    <span className="font-bold text-base">
                      {values.valorJaPago > 0 ? "Valor Restante" : "Valor Total"}
                    </span>
                    <span className="font-bold text-base text-primary">
                      {formatCurrency(values.valorJaPago > 0 ? values.valorRestante.toFixed(2) : values.valorAPagar.toFixed(2))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Informações do Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="payment_date">
                    Data do Pagamento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    required
                    disabled={isReadOnly}
                  />
                </div>

                <div>
                  <Label htmlFor="payment_method">
                    Forma de Pagamento <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.payment_method !== "dinheiro" && formData.payment_method !== "boleto" && (
                  <div>
                    <Label htmlFor="payment_code_type">
                      C/C Recebimento <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.pix_code_type}
                      onValueChange={(value) => setFormData({ ...formData, pix_code_type: value })}
                      disabled={isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CP">CP</SelectItem>
                        <SelectItem value="CD">CD</SelectItem>
                        <SelectItem value="CE">CE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.payment_method === "pix" && (
                  <div>
                    <Label htmlFor="payment_time">
                      Horário do Recebimento <span className="text-red-500">*</span>
                    </Label>
                    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-2 items-center">
                      <Input
                        id="payment_hour"
                        type="text"
                        inputMode="numeric"
                        placeholder="HH"
                        maxLength={2}
                        value={paymentHour}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 23)) {
                            setPaymentHour(value);
                          }
                        }}
                        required
                        disabled={isReadOnly}
                      />
                      <span className="text-2xl font-bold">:</span>
                      <Input
                        id="payment_minute"
                        type="text"
                        inputMode="numeric"
                        placeholder="MM"
                        maxLength={2}
                        value={paymentMinute}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 59)) {
                            setPaymentMinute(value);
                          }
                        }}
                        required
                        disabled={isReadOnly}
                      />
                      <span className="text-2xl font-bold">:</span>
                      <Input
                        id="payment_second"
                        type="text"
                        inputMode="numeric"
                        placeholder="SS"
                        maxLength={2}
                        value={paymentSecond}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 59)) {
                            setPaymentSecond(value);
                          }
                        }}
                        required
                        disabled={isReadOnly}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="amount_to_pay">
                    Valor a Pagar <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="amount_to_pay"
                    type="text"
                    placeholder="R$ 0,00"
                    value={formData.amount_to_pay}
                    onChange={(e) => {
                      const formatted = formatCurrency(e.target.value);
                      setFormData({ ...formData, amount_to_pay: formatted });
                    }}
                    required
                    disabled={isReadOnly}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações sobre o pagamento..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  disabled={isReadOnly}
                  className="resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            Anexos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  id="file-input"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={(e) => {
                    const index = attachments.findIndex(a => !a.url);
                    if (index === -1) {
                      addAttachment();
                      setTimeout(() => handleFileChange(e, attachments.length), 0);
                    } else {
                      handleFileChange(e, index);
                    }
                  }}
                  disabled={uploadingFile || isReadOnly}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('file-input')?.click();
                  }}
                  disabled={uploadingFile || isReadOnly}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Escolher Arquivo
                </Button>
              </div>

              <div className="flex-1 sm:hidden">
                <input
                  id="camera-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    const index = attachments.findIndex(a => !a.url);
                    if (index === -1) {
                      addAttachment();
                      setTimeout(() => handleFileChange(e, attachments.length), 0);
                    } else {
                      handleFileChange(e, index);
                    }
                  }}
                  disabled={uploadingFile || isReadOnly}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('camera-input')?.click();
                  }}
                  disabled={uploadingFile || isReadOnly}
                >
                  <Camera className="mr-2 h-5 w-5" />
                  Tirar Foto
                </Button>
              </div>
            </div>

            {attachments.filter(a => a.url).length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium text-muted-foreground">
                  Arquivos Anexados ({attachments.filter(a => a.url).length})
                </p>
                {attachments.map((attachment, index) => {
                  if (!attachment.url) return null;
                  
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                      <div className="flex-shrink-0">
                        {attachment.url.toLowerCase().endsWith(".pdf") ? (
                          <FileText className="h-8 w-8 text-primary" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {attachment.name || "Arquivo"}
                        </p>
                        <a 
                          href={attachment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Visualizar →
                        </a>
                      </div>
                      {!isReadOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                          className="h-8 w-8 p-0 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {Object.keys(uploadProgress).length > 0 && (
              <div className="space-y-2">
                {Object.entries(uploadProgress).map(([key, progress]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Enviando... {progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 justify-end pt-4">
        {isPaid && !isEditMode ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose ? onClose() : router.push("/payments")}
            >
              <X className="mr-2 h-4 w-4" />
              Fechar
            </Button>
            <Button 
              type="button" 
              onClick={handleEnableEdit}
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={isPaid ? handleCancelEdit : (onClose ? onClose : () => router.push("/payments"))}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleSubmit} 
              disabled={isSubmitting} 
              size="lg"
            >
              {isSubmitting ? "Salvando..." : isPaid ? "Salvar Alterações" : "Confirmar Recebimento"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}