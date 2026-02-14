import { useState, useEffect } from "react";
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
import { Camera, Paperclip, Home, User, DollarSign, CreditCard, FileText, Edit, X } from "lucide-react";
import type { Payment, Rental, Property, Tenant } from "@/types";
import { calculateCorrectedDeposit } from "@/services/igpmService";
import { maskTime } from "@/lib/masks";

interface ManagePaymentFormProps {
  paymentId?: string;
  rentalId?: string;
  onSuccess?: (data: {
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
  }) => void;
  onClose?: () => void;
  embedded?: boolean;
}

export function ManagePaymentForm({ paymentId, rentalId, onSuccess, onClose, embedded = false }: ManagePaymentFormProps) {
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
    igpmPercentage: number;
    months: number;
    igpmDetails: string;
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

  const [payment, setPayment] = useState<any>(null);
  const [rental, setRental] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [location, setLocation] = useState<any>(null);
  const [rentalValue, setRentalValue] = useState(0);
  const [garageValue, setGarageValue] = useState(0);
  const [lateFeePercentage, setLateFeePercentage] = useState(0);
  const [interestRatePercentage, setInterestRatePercentage] = useState(0);

  useEffect(() => {
    if (paymentId) {
      loadPaymentData();
    } else if (rentalId) {
      loadRentalData();
    }
    loadConfig();
  }, [paymentId, rentalId]);

  const loadRentalData = async () => {
    if (!rentalId) return;
    
    try {
      setLoading(true);
      const { data: rentalData, error } = await supabase
        .from("rentals")
        .select(`
          *,
          properties!inner (
            *,
            locations!inner (*)
          ),
          tenants!inner (*)
        `)
        .eq("id", rentalId)
        .single();

      if (error) throw error;

      setRental(rentalData);
      setProperty(rentalData.properties);
      setLocation(rentalData.properties.locations);
      setTenant(rentalData.tenants);
      setRentalValue(rentalData.monthly_rent || 0);
      setGarageValue(rentalData.garage_value || 0);
      
      // Default values for new payment
      setFormData({
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "pix",
        payment_time: "",
        amount_to_pay: formatCurrency(rentalData.monthly_rent + (rentalData.garage_value || 0)),
        notes: "",
        pix_code_type: "CP",
      });
      
      setIsEditMode(true); // Always edit mode for new payment
      
    } catch (error) {
      console.error("Erro ao carregar dados da locação:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da locação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configs")
        .select("*")
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
  };

  const loadPaymentData = async () => {
    if (!paymentId) return;

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

      setRentalValue(paymentData.rentals.monthly_rent || 0);
      setGarageValue(paymentData.rentals.garage_value || 0);

      const alreadyPaid = paymentData.status === "paid";
      setIsPaid(alreadyPaid);
      setIsEditMode(!alreadyPaid);

      const isTermination = paymentData.notes?.includes("Rescisão de Contrato") || false;
      setIsTerminationPayment(isTermination);
      
      console.log("🔍 [DEBUG] É rescisão?", isTermination);

      let igpmCorrectionValue = null;
      if (isTermination && paymentData.rentals) {
        const startDate = paymentData.rentals.start_date;
        const endDate = paymentData.rentals.end_date || paymentData.due_date;
        const originalDeposit = paymentData.rentals.security_deposit || 0;
        
        console.log("🔍 [DEBUG] Dados para IGPM:", {
          startDate,
          endDate,
          originalDeposit
        });
        
        if (originalDeposit > 0 && startDate && endDate) {
          igpmCorrectionValue = calculateCorrectedDeposit(originalDeposit, startDate, endDate);
          setIgpmCorrection(igpmCorrectionValue);
          
          console.log("💰 [DEBUG] Correção IGPM calculada:", igpmCorrectionValue);
        } else {
          console.log("⚠️ [DEBUG] Não calculou IGPM - dados faltando");
        }
      }

      if (paymentData.breakdown) {
        try {
          const breakdownData = typeof paymentData.breakdown === 'string' 
            ? JSON.parse(paymentData.breakdown) 
            : paymentData.breakdown;
          
          let updatedBreakdown = [...breakdownData];
          
          if (igpmCorrectionValue && isTermination) {
            console.log("💰 [DEBUG] Aplicando IGPM ao breakdown IMEDIATAMENTE");
            console.log("💰 [DEBUG] Valor original do caução no breakdown:", 
              updatedBreakdown.find(item => item.description?.includes("Devolução de Caução"))?.amount
            );
            
            updatedBreakdown = updatedBreakdown.map((item: any) => {
              if (item.description?.includes("Devolução de Caução")) {
                const correctedValue = -Math.abs(igpmCorrectionValue.correctedAmount);
                console.log("💰 [DEBUG] Atualizando caução de", item.amount, "para", correctedValue);
                return {
                  ...item,
                  amount: correctedValue,
                };
              }
              return item;
            });
            
            console.log("💰 [DEBUG] Valor do caução após atualização:", 
              updatedBreakdown.find(item => item.description?.includes("Devolução de Caução"))?.amount
            );
          }
          
          setOriginalBreakdown(updatedBreakdown || []);
          
          if (isTermination) {
            const expensesItem = updatedBreakdown.find((item: any) => 
              item.description?.includes("Despesas")
            );
            
            if (expensesItem) {
              const expValue = Math.abs(expensesItem.amount || 0);
              setRepairExpenses(expValue);
              setRepairExpensesInput(formatCurrency(expValue.toFixed(2)));
            }
          }
        } catch (error) {
          console.error("❌ [DEBUG] Erro ao parsear breakdown:", error);
          setOriginalBreakdown([]);
        }
      }

      if (paymentData.attachments && Array.isArray(paymentData.attachments)) {
        const attachmentStrings = paymentData.attachments
          .filter((att): att is string => typeof att === "string");
        setAttachments(attachmentStrings);
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
  };

  const calculateValues = () => {
    const valorAluguel = Math.round((rentalValue + garageValue) * 100) / 100;
    
    let multa = 0;
    let juros = 0;
    let diasAtraso = 0;

    if (payment && formData.payment_date) {
      const dueDate = new Date(payment.due_date + "T12:00:00");
      const paymentDate = new Date(formData.payment_date + "T12:00:00");

      if (paymentDate > dueDate) {
        const diffTime = paymentDate.getTime() - dueDate.getTime();
        diasAtraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const baseCalculo = Math.max(0, valorAluguel);
        
        multa = Math.round((baseCalculo * lateFeePercentage / 100) * 100) / 100;

        const jurosDiario = interestRatePercentage;
        juros = Math.round((baseCalculo * jurosDiario / 100 * diasAtraso) * 100) / 100;
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
      isProportional: false,
    };
  };

  useEffect(() => {
    if (loading || !payment) return;
    
    const values = calculateValues();
    
    if (isTerminationPayment && originalBreakdown.length > 0) {
      let workingBreakdown = [...originalBreakdown];
      
      if (igpmCorrection) {
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
      const newTotal = breakdownTotal + lateFees + repairExpenses;
      
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
    formData.payment_date,
    lateFeePercentage,
    interestRatePercentage,
    isEditMode,
    loading,
    payment,
    igpmCorrection
  ]);

  const formatCurrency = (value: string | number): string => {
    const numericValue = typeof value === "string" ? value.replace(/\D/g, "") : String(value).replace(/\D/g, "");
    const number = parseFloat(numericValue) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(number);
  };

  const parseCurrency = (value: string): number => {
    const numericValue = value.replace(/[^\d,]/g, "").replace(",", ".");
    return parseFloat(numericValue) || 0;
  };

  const generatePixCode = (paymentDate: string, pixType: string): string => {
    if (!paymentDate || !pixType) return "";
    
    const date = new Date(paymentDate);
    const day = String(date.getDate()).padStart(2, "0");
    
    const timestamp = Date.now();
    const sequence = String(timestamp).slice(-4);
    
    return `${day}${sequence}${pixType}`;
  };

  const handleFileUpload = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro ao fazer upload");
      }

      const data = await response.json();
      setAttachments([...attachments, data.url]);

      toast({
        title: "Sucesso",
        description: "Arquivo anexado com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload do arquivo",
        variant: "destructive",
      });
    }
  };

  const handleTakePhoto = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileUpload(file);
    };
    input.click();
  };

  const handleAttachFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileUpload(file);
    };
    input.click();
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleEnableEdit = () => {
    setIsEditMode(true);
    toast({
      title: "Modo de Edição",
      description: "Campos desbloqueados para edição.",
    });
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    loadPaymentData();
    toast({
      title: "Edição Cancelada",
      description: "Alterações descartadas.",
    });
  };

  const handleRepairExpensesChange = (value: string) => {
    setRepairExpensesInput(formatCurrency(value));
    setRepairExpenses(parseCurrency(formatCurrency(value)));
  };

  const handleSubmit = async () => {
    if (!formData.payment_date || !formData.payment_method || !formData.amount_to_pay) {
      toast({
        title: "Atenção",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    if (formData.payment_method === "pix" && !formData.payment_time) {
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
      
      // Se estamos editando/pagando um existente
      if (paymentId) {
        const totalPaid = (payment?.paid_amount || 0) + paidAmount;
        
        let expectedTotal = 0;
        let updatedBreakdown = payment?.breakdown;
        const values = calculateValues();

        if (isTerminationPayment && igpmCorrection) {
          try {
            let breakdownData = typeof payment.breakdown === 'string' 
              ? JSON.parse(payment.breakdown) 
              : (payment.breakdown || []);
            
            if (igpmCorrection) {
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
        
        const paymentStatus: "paid" | "partial" = totalPaid >= expectedTotal ? "paid" : "partial";

        const paymentDataUpdate = {
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          payment_time: formData.payment_time || null,
          paid_amount: totalPaid,
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

        if (formData.payment_method === "pix" && formData.pix_code_type) {
          const pixCode = generatePixCode(formData.payment_date, formData.pix_code_type);
          
          await supabase
            .from("rentals")
            .update({ pix_code: pixCode })
            .eq("id", payment.rental_id);
        }

        toast({
          title: "Sucesso",
          description: paymentStatus === "partial" 
            ? `Pagamento parcial registrado! Restante: ${formatCurrency((expectedTotal - totalPaid).toFixed(2))}`
            : isPaid ? "Pagamento atualizado com sucesso!" : "Pagamento registrado com sucesso!",
        });

        if (paymentStatus === "paid" && !isPaid && onSuccess) {
          const paymentForReceipt: Payment = {
            id: payment.id,
            rentalId: payment.rental_id,
            dueDate: payment.due_date,
            expectedAmount: expectedTotal,
            paidAmount: totalPaid,
            paymentDate: formData.payment_date,
            status: "paid",
            paymentMethod: formData.payment_method,
            notes: formData.notes,
            referenceMonth: parseInt(payment.reference_month),
            referenceYear: parseInt(payment.reference_year),
            attachments: attachments,
            lateFee: removeFees ? 0 : values.multa,
            interest: removeFees ? 0 : values.juros,
          };

          const mockRental: Rental = {
            id: payment.rental_id,
            propertyId: property.id,
            tenantId: tenant.id,
            startDate: rental.start_date,
            endDate: rental.end_date,
            paymentDay: rental.payment_day,
            value: rental.monthly_rent,
            depositAmount: rental.security_deposit || 0,
            status: rental.status,
            isActive: rental.status === "active",
            attachments: [],
            contractAttachments: [],
            autoRenew: false
          };

          const propertyForReceipt: Property = {
            id: property.id,
            locationId: property.location_id,
            location: location?.name || "",
            address: location?.street || "",
            number: location?.number || "",
            complement: property.complement || "",
            neighborhood: location?.neighborhood || "",
            city: location?.city || "",
            state: location?.state || "",
            zipCode: location?.zip_code || "",
            rooms: property.rooms || 0,
            bathrooms: property.bathrooms || 0,
            area: property.area || 0,
            status: property.status || "available",
            value: property.value,
          };

          const tenantForReceipt: Tenant = {
            id: tenant.id,
            name: tenant.name,
            email: tenant.email || "",
            phone: tenant.phone || "",
            documentType: tenant.document_type || "cpf",
            document: tenant.document || "",
            cpf: tenant.cpf || "",
            rg: tenant.rg || "",
            status: tenant.status || "active",
          };

          onSuccess({
            payment: paymentForReceipt,
            rental: mockRental,
            property: propertyForReceipt,
            tenant: tenantForReceipt,
          });
        } else if (paymentStatus === "partial" || isPaid) {
          if (onClose) {
            onClose();
          } else {
            router.push("/payments");
          }
        }

      } else if (rentalId) {
        // CREATE NEW PAYMENT
        const newPaymentData = {
          rental_id: rentalId,
          payment_date: formData.payment_date,
          payment_method: formData.payment_method,
          payment_time: formData.payment_time || null,
          paid_amount: paidAmount,
          expected_amount: paidAmount, // Assuming full payment for manual entry
          notes: formData.notes,
          status: "paid",
          attachments: attachments.length > 0 ? attachments : null,
          late_fee: 0,
          interest: 0,
          pix_code_type: formData.pix_code_type,
        };

        const { data: insertedPayment, error: insertError } = await supabase
          .from("payments")
          .insert(newPaymentData)
          .select()
          .single();

        if (insertError) throw insertError;

        toast({
          title: "Sucesso",
          description: "Pagamento registrado com sucesso!",
        });

        if (onSuccess) {
          onSuccess({
             payment: insertedPayment, 
             rental, property, tenant 
          });
        } else if (onClose) {
          onClose();
        }
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

  const values = calculateValues();
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
                    .map((item, index) => {
                      const isDepositDeduction = item.description?.includes("Devolução de Caução");
                      
                      const displayAmount = isDepositDeduction && igpmCorrection 
                        ? igpmCorrection.correctedAmount 
                        : Math.abs(item.amount);
                      
                      return (
                        <div key={index}>
                          <div className="flex justify-between items-start text-sm">
                            <div className="flex-1">
                              <span className={isDepositDeduction ? "block" : ""}>
                                {isDepositDeduction ? "Devolução de Caução" : item.description}
                              </span>
                              {isDepositDeduction && (
                                <span className="block text-xs text-muted-foreground">
                                  (corrigido pela Taxa da Poupança)
                                </span>
                              )}
                            </div>
                            <span className={`${item.type === "deduction" ? "text-red-600" : ""} font-medium whitespace-nowrap ml-4`}>
                              {item.type === "deduction" ? "- " : ""}
                              {formatCurrency(displayAmount.toFixed(2))}
                            </span>
                          </div>
                        </div>
                      );
                    })}

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
                    <span>Valor Aluguel</span>
                    <span className="font-medium">
                      {formatCurrency(rentalValue.toFixed(2))}
                    </span>
                  </div>

                  {garageValue > 0 && (
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
                    <Label htmlFor="pix_code_type">
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
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
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