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
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { Camera, Paperclip, Home, User, DollarSign, CreditCard, Edit, X } from "lucide-react";
import type { Payment, Rental, Property, Tenant } from "@/types";
import { calculateCorrectedDeposit } from "@/services/igpmService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

// Helper de formatação de moeda
const formatCurrencyHelper = (value: string | number): string => {
  const numValue = typeof value === "string" 
    ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) 
    : value;
  
  if (isNaN(numValue)) return "R$ 0,00";
  
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numValue);
};

// Helper de parsing de moeda
const parseCurrencyHelper = (value: string): number => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

// Subcomponente para exibir valores do breakdown (memoizado para performance)
const BreakdownItem = memo(({ item, isDeduction, igpmCorrection }: { item: any; isDeduction?: boolean; igpmCorrection?: any }) => {
  const isDepositDeduction = item.description?.includes("Devolução de Caução");
  
  const displayAmount = isDepositDeduction && igpmCorrection && igpmCorrection.correctedAmount > 0
    ? igpmCorrection.correctedAmount 
    : Math.abs(item.amount);

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
                              {formatCurrencyHelper(igpmCorrection.originalAmount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Valor Corrigido:</span>
                            <p className="font-semibold text-green-600 dark:text-green-400">
                              {formatCurrencyHelper(igpmCorrection.correctedAmount)}
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
          {formatCurrencyHelper(displayAmount)}
        </span>
      </div>
    </div>
  );
});

BreakdownItem.displayName = "BreakdownItem";

export function ManagePaymentForm({ paymentId, onSuccess, onClose, embedded = false }: ManagePaymentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
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

  const [payment, setPayment] = useState<any>(null);
  const [rental, setRental] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [rentalValue, setRentalValue] = useState(0);
  const [garageValue, setGarageValue] = useState(0);
  const [lateFeePercentage, setLateFeePercentage] = useState(2); // Default 2%
  const [interestRatePercentage, setInterestRatePercentage] = useState(0.033); // Default 0.033% per day

  // CRITICAL: Define handleFileUpload FIRST before it's used by other callbacks
  const handleFileUpload = useCallback(async (file: File) => {
    console.log("[ManagePaymentForm] Starting file upload...", {
      name: file.name,
      size: file.size,
      type: file.type,
      sizeInMB: (file.size / 1024 / 1024).toFixed(2) + " MB",
    });

    // Mobile check: Validate file size (limit to 15MB)
    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      console.error("[ManagePaymentForm] File too large:", {
        size: file.size,
        maxSize: maxSize,
        sizeInMB: (file.size / 1024 / 1024).toFixed(2) + " MB",
      });
      toast({
        title: "Arquivo muito grande",
        description: `O arquivo tem ${(file.size / 1024 / 1024).toFixed(1)}MB. O limite é 15MB. Tente tirar uma foto com menor resolução.`,
        variant: "destructive",
      });
      return;
    }

    // Show loading toast for mobile (uploads can be slow on 3G/4G)
    const loadingToast = toast({
      title: "Enviando arquivo...",
      description: `${(file.size / 1024 / 1024).toFixed(1)}MB - Isso pode levar alguns segundos em redes móveis`,
      duration: 30000, // 30 seconds
    });

    try {
      // Compress image if it's too large (mobile photos are often 5-10MB)
      let fileToUpload = file;
      if (file.type.startsWith("image/") && file.size > 2 * 1024 * 1024) {
        console.log("[ManagePaymentForm] Compressing large image...");
        try {
          fileToUpload = await compressImage(file);
          console.log("[ManagePaymentForm] Image compressed:", {
            originalSize: (file.size / 1024 / 1024).toFixed(2) + " MB",
            compressedSize: (fileToUpload.size / 1024 / 1024).toFixed(2) + " MB",
            reduction: (((file.size - fileToUpload.size) / file.size) * 100).toFixed(1) + "%",
          });
        } catch (compressError) {
          console.warn("[ManagePaymentForm] Compression failed, uploading original:", compressError);
          // Continue with original file if compression fails
        }
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);

      console.log("[ManagePaymentForm] Sending upload request to /api/upload...");
      console.log("[ManagePaymentForm] File being uploaded:", {
        name: fileToUpload.name,
        size: fileToUpload.size,
        type: fileToUpload.type,
      });

      // Increased timeout for mobile networks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds for mobile

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log("[ManagePaymentForm] Upload response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ManagePaymentForm] Upload failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`Erro ao fazer upload: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[ManagePaymentForm] Upload successful:", data);

      setAttachments(prev => {
        const updated = [...prev, data.url];
        console.log("[ManagePaymentForm] Updated attachments:", updated);
        return updated;
      });

      // Dismiss loading toast
      if (loadingToast.dismiss) {
        loadingToast.dismiss();
      }

      toast({
        title: "Sucesso",
        description: "Arquivo anexado com sucesso!",
      });
    } catch (error: any) {
      console.error("[ManagePaymentForm] Upload error:", error);
      
      // Dismiss loading toast
      if (loadingToast.dismiss) {
        loadingToast.dismiss();
      }

      let errorMessage = "Erro ao fazer upload do arquivo";
      if (error.name === 'AbortError') {
        errorMessage = "Upload cancelado: tempo limite excedido (60s). Verifique sua conexão com a internet.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Helper function to compress images before upload
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Calculate new dimensions (max 1920px width)
          let width = img.width;
          let height = img.height;
          const maxWidth = 1920;
          const maxHeight = 1920;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            } else {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Compression failed'));
              }
            },
            'image/jpeg',
            0.85 // 85% quality
          );
        };
        img.onerror = () => reject(new Error('Image load failed'));
      };
      reader.onerror = () => reject(new Error('File read failed'));
    });
  };

  const handleTakePhoto = useCallback(() => {
    console.log("[ManagePaymentForm] Opening camera for photo capture...");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment" as any;
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      console.log("[ManagePaymentForm] Photo captured:", file ? {
        name: file.name,
        size: file.size,
        type: file.type,
      } : "No file selected");
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  }, [handleFileUpload]);

  const handleAttachFile = useCallback(() => {
    console.log("[ManagePaymentForm] Opening file picker...");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      console.log("[ManagePaymentForm] File selected:", file ? {
        name: file.name,
        size: file.size,
        type: file.type,
      } : "No file selected");
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  }, [handleFileUpload]);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleEnableEdit = useCallback(() => {
    setIsEditMode(true);
    toast({
      title: "Modo de Edição",
      description: "Campos desbloqueados para edição.",
    });
  }, [toast]);

  const loadPaymentData = useCallback(async () => {
    try {
      console.log("[ManagePaymentForm] Loading payment data for ID:", paymentId);
      
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .select(`
          *,
          rental:rentals!payments_rental_id_fkey (
            *,
            property:properties!rentals_property_id_fkey (
              *,
              location:locations!properties_location_id_fkey (*)
            ),
            tenant:tenants!rentals_tenant_id_fkey (*)
          )
        `)
        .eq("id", paymentId)
        .single();

      if (paymentError) throw paymentError;
      if (!paymentData) throw new Error("Pagamento não encontrado");

      // Load configs to get fee percentages
      const { data: configData } = await supabase
        .from("configs")
        .select("late_fee_percentage, interest_rate_percentage")
        .single();

      console.log("[ManagePaymentForm] Payment data loaded:", paymentData);
      console.log("[ManagePaymentForm] Config data loaded:", configData);

      setPayment(paymentData);
      setRental(paymentData.rental);
      setProperty(paymentData.rental?.property);
      setTenant(paymentData.rental?.tenant);
      setLocation(paymentData.rental?.property?.location);
      
      // Fix: use rent_value or monthly_rent
      setRentalValue(paymentData.rental?.rent_value || paymentData.rental?.monthly_rent || 0);
      setGarageValue(paymentData.rental?.garage_value || 0);
      
      // Fix: use config values for fees
      if (configData) {
        setLateFeePercentage(Number(configData.late_fee_percentage) || 2);
        setInterestRatePercentage(Number(configData.interest_rate_percentage) || 0.033);
      }

      const isPaidStatus = paymentData.status === "paid";
      setIsPaid(isPaidStatus);

      if (paymentData.payment_date) {
        setFormData(prev => ({ ...prev, payment_date: paymentData.payment_date }));
      }
      if (paymentData.payment_method) {
        setFormData(prev => ({ ...prev, payment_method: paymentData.payment_method }));
      }
      if (paymentData.payment_time) {
        const [h, m, s] = paymentData.payment_time.split(":");
        setPaymentHour(h || "");
        setPaymentMinute(m || "");
        setPaymentSecond(s || "00");
      }
      if (paymentData.paid_amount) {
        setFormData(prev => ({ ...prev, amount_to_pay: formatCurrencyHelper(paymentData.paid_amount) }));
      }
      if (paymentData.notes) {
        setFormData(prev => ({ ...prev, notes: paymentData.notes }));
      }
      if (paymentData.pix_code_type) {
        setFormData(prev => ({ ...prev, pix_code_type: paymentData.pix_code_type }));
      }
      if (paymentData.attachments) {
        // Fix: Ensure attachments are treated as strings
        const attachmentsList = Array.isArray(paymentData.attachments) 
          ? paymentData.attachments 
          : [paymentData.attachments];
        setAttachments(attachmentsList.map((a: any) => String(a)));
      }

      // Fix: payment_type does not exist, use notes or logic to detect termination
      const isTermination = paymentData.notes?.toLowerCase().includes("rescisão") || false;
      setIsTerminationPayment(isTermination);

      if (isTermination && paymentData.breakdown) {
        try {
          const breakdownData = typeof paymentData.breakdown === 'string'
            ? JSON.parse(paymentData.breakdown)
            : paymentData.breakdown;
          
          setOriginalBreakdown(breakdownData);

          const depositItem = breakdownData.find((item: any) => 
            item.description?.includes("Devolução de Caução")
          );

          if (depositItem && paymentData.rental) {
            const originalDepositAmount = Math.abs(depositItem.amount);
            const correctionResult = await calculateCorrectedDeposit(
              originalDepositAmount,
              paymentData.rental.start_date,
              paymentData.due_date
            );

            if (correctionResult) {
              setIgpmCorrection(correctionResult);
            }
          }

          const total = breakdownData.reduce((sum: number, item: any) => sum + item.amount, 0);
          setCalculatedTotal(total);
        } catch (error) {
          console.error("[ManagePaymentForm] Error parsing breakdown:", error);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error("[ManagePaymentForm] Error loading payment:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do pagamento",
        variant: "destructive",
      });
      setLoading(false);
    }
  }, [paymentId, toast]);

  const handleCancelEdit = useCallback(() => {
    setIsEditMode(false);
    loadPaymentData();
    toast({
      title: "Edição Cancelada",
      description: "Alterações descartadas.",
    });
  }, [loadPaymentData, toast]);

  const handleRepairExpensesChange = useCallback((value: string) => {
    setRepairExpensesInput(formatCurrencyHelper(value));
    setRepairExpenses(parseCurrencyHelper(formatCurrencyHelper(value)));
  }, []);

  const calculateValues = useMemo(() => {
    if (!payment || !rental) {
      return {
        valorAluguel: 0,
        valorVaga: 0,
        valorBase: 0,
        multa: 0,
        juros: 0,
        diasAtraso: 0,
        valorAPagar: 0,
        valorJaPago: 0,
        valorRestante: 0,
        isProportional: false,
        proportionalDays: 0,
      };
    }

    const valorAluguel = rentalValue || 0;
    const valorVaga = garageValue || 0;
    const valorBase = valorAluguel + valorVaga;

    const dueDate = new Date(payment.due_date);
    const today = new Date();
    const diasAtraso = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    let multa = 0;
    let juros = 0;

    if (diasAtraso > 0 && !removeFees) {
      multa = valorBase * (lateFeePercentage / 100);
      juros = valorBase * (interestRatePercentage / 100) * diasAtraso;
    }

    const valorJaPago = payment.paid_amount || 0;
    const valorAPagar = valorBase + multa + juros;
    const valorRestante = Math.max(0, valorAPagar - valorJaPago);

    return {
      valorAluguel,
      valorVaga,
      valorBase,
      multa,
      juros,
      diasAtraso,
      valorAPagar,
      valorJaPago,
      valorRestante,
      isProportional: false,
      proportionalDays: 0,
    };
  }, [payment, rental, rentalValue, garageValue, lateFeePercentage, interestRatePercentage, removeFees]);

  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  useEffect(() => {
    if (isTerminationPayment && originalBreakdown.length > 0) {
      let total = 0;
      
      originalBreakdown.forEach((item: any) => {
        if (item.description?.includes("Devolução de Caução") && igpmCorrection) {
          total += -igpmCorrection.correctedAmount;
        } else if (!item.description?.includes("Despesas") && 
                   !item.description?.includes("Multa por Atraso") &&
                   !item.description?.includes("Juros por Atraso")) {
          total += item.amount;
        }
      });

      if (!removeFees) {
        total += calculateValues.multa;
        total += calculateValues.juros;
      }

      total += repairExpenses;

      setCalculatedTotal(total);
    }
  }, [isTerminationPayment, originalBreakdown, igpmCorrection, removeFees, calculateValues, repairExpenses]);

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

      const paidAmount = parseCurrencyHelper(formData.amount_to_pay);
      
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

      const paymentDataUpdate = {
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        payment_time: formData.payment_method === "pix" 
          ? `${paymentHour.padStart(2, '0')}:${paymentMinute.padStart(2, '0')}:${paymentSecond.padStart(2, '0')}`
          : null,
        paid_amount: finalPaidAmount,
        notes: formData.notes,
        status: paymentStatus,
        attachments: attachments.length > 0 ? attachments : null,
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
          ? `Pagamento parcial registrado! Restante: ${formatCurrencyHelper((Math.abs(expectedTotal) - paidAmount).toFixed(2))}`
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
    <div className="pb-8">
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
                          {formatCurrencyHelper(repairExpenses.toFixed(2))}
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
                            + {formatCurrencyHelper(values.multa.toFixed(2))}
                          </span>
                        </div>

                        {values.juros > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                              Juros ({interestRatePercentage.toFixed(3)}% ao dia)
                            </span>
                            <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                              + {formatCurrencyHelper(values.juros.toFixed(2))}
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
                      {formatCurrencyHelper(Math.abs(calculatedTotal).toFixed(2))}
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
                      {formatCurrencyHelper(rentalValue.toFixed(2))}
                    </span>
                  </div>

                  {garageValue > 0 && !values.isProportional && (
                    <div className="flex justify-between text-sm">
                      <span>Valor Vaga</span>
                      <span className="font-medium">
                        {formatCurrencyHelper(garageValue.toFixed(2))}
                      </span>
                    </div>
                  )}

                  {values.multa > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                        Multa ({lateFeePercentage}%)
                      </span>
                      <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                        + {formatCurrencyHelper(values.multa.toFixed(2))}
                      </span>
                    </div>
                  )}

                  {values.juros > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600"}>
                        Juros ({interestRatePercentage.toFixed(3)}% ao dia) + {values.diasAtraso} dias
                      </span>
                      <span className={removeFees ? "line-through text-muted-foreground" : "text-red-600 font-medium"}>
                        + {formatCurrencyHelper(values.juros.toFixed(2))}
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
                        - {formatCurrencyHelper(values.valorJaPago.toFixed(2))}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between pt-3 border-t-2 border-primary">
                    <span className="font-bold text-base">
                      {values.valorJaPago > 0 ? "Valor Restante" : "Valor Total"}
                    </span>
                    <span className="font-bold text-base text-primary">
                      {formatCurrencyHelper(values.valorJaPago > 0 ? values.valorRestante.toFixed(2) : values.valorAPagar.toFixed(2))}
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
                      const formatted = formatCurrencyHelper(e.target.value);
                      setFormData({ ...formData, amount_to_pay: formatted });
                    }}
                    required
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Observações sobre o pagamento..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            disabled={isReadOnly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anexos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditMode && (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleTakePhoto}>
                <Camera className="h-4 w-4 mr-2" />
                Tirar Foto
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleAttachFile}>
                <Paperclip className="h-4 w-4 mr-2" />
                Anexar Arquivo
              </Button>
            </div>
          )}

          {attachments.length > 0 && (
            <AttachmentViewer 
              attachments={attachments} 
              onRemove={isEditMode ? handleRemoveAttachment : undefined} 
            />
          )}
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