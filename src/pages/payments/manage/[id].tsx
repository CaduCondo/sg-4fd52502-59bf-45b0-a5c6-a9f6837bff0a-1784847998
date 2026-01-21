import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Calendar, Home, User, X, Camera, Paperclip, Eye, Download, Loader2, CheckCircle2 } from "lucide-react";
import type { Payment, Rental, Property, Tenant, CompanyConfig } from "@/types";
import { applyRealMask, formatCurrency, parseCurrencyToFloat, formatPercentage } from "@/lib/masks";
import { getById as getPaymentById, update as updatePayment } from "@/services/paymentService";
import { getById as getRentalById } from "@/services/rentalService";
import { getById as getPropertyById } from "@/services/propertyService";
import { getById as getTenantById } from "@/services/tenantService";
import { getConfig } from "@/services/configService";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface ManagePaymentContentProps {
  paymentId: string;
  onClose?: () => void;
  embedded?: boolean;
}

export default function ManagePaymentContent({ paymentId, onClose, embedded = false }: ManagePaymentContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [config, setConfig] = useState<CompanyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isEditing, setIsEditing] = useState(true);

  const [formData, setFormData] = useState({
    paidAmount: "",
    paymentDate: "",
    paymentMethod: "",
    paymentLocation: "",
    paymentCode: "",
    notes: "",
    attachments: [] as string[],
  });
  const [waiveLateFees, setWaiveLateFees] = useState(false);
  
  const [calculatedValues, setCalculatedValues] = useState({
    baseAmount: 0,
    rentAmount: 0,
    penaltyAmount: 0,
    interestAmount: 0,
    totalAmount: 0,
    daysLate: 0,
    lateFee: 0,
    interest: 0,
  });

  useEffect(() => {
    const id = embedded ? paymentId : (router.query.id as string);
    if (id) {
      loadData(id);
    }
  }, [paymentId, router.query.id, embedded]);

  useEffect(() => {
    if (payment && rental && config) {
      calculateValues();
    }
  }, [formData.paymentDate, payment, rental, config, waiveLateFees]);

  useEffect(() => {
    if (formData.paymentMethod === "pix") {
      const day = new Date().getDate().toString().padStart(2, "0");
      const code = `${day}XXXX${formData.paymentLocation}`;
      setFormData((prev) => ({ ...prev, paymentCode: code }));
    }
  }, [formData.paymentMethod, formData.paymentLocation]);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (calculatedValues.totalAmount > 0 && !isViewMode) {
      setFormData((prev) => ({
        ...prev,
        paidAmount: applyRealMask((calculatedValues.totalAmount * 100).toString()),
      }));
    }
  }, [calculatedValues.totalAmount, waiveLateFees, isViewMode]);

  const loadConfig = async () => {
    const data = await getConfig();
    setConfig(data);
  };

  const loadData = async (id: string) => {
    try {
      setLoading(true);
      const paymentData = await getPaymentById(id);
      const rentalData = await getRentalById(paymentData.rentalId);
      const propertyData = await getPropertyById(rentalData.propertyId);
      const tenantData = await getTenantById(rentalData.tenantId);

      setPayment(paymentData);
      setRental(rentalData);
      setProperty(propertyData);
      setTenant(tenantData);
      setDueDate(paymentData.dueDate);
      
      if (paymentData.status === "paid") {
        setIsViewMode(true);
        setIsEditing(false);
        setFormData({
          paidAmount: applyRealMask((paymentData.paidAmount * 100).toString()),
          paymentDate: paymentData.paymentDate || "",
          paymentMethod: paymentData.paymentMethod || "",
          paymentLocation: paymentData.paymentLocation || "",
          paymentCode: paymentData.paymentCode || "",
          notes: paymentData.notes || "",
          attachments: paymentData.attachments || []
        });
      } else {
        const today = new Date().toISOString().split('T')[0];
        setFormData({
          paidAmount: "",
          paymentDate: today,
          paymentMethod: "pix",
          paymentLocation: "",
          paymentCode: "",
          notes: "",
          attachments: paymentData.attachments || []
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do pagamento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateValues = () => {
    if (!payment || !dueDate || !config) {
      setCalculatedValues({
        baseAmount: 0,
        rentAmount: 0,
        penaltyAmount: 0,
        interestAmount: 0,
        totalAmount: 0,
        daysLate: 0,
        lateFee: 0,
        interest: 0
      });
      return;
    }

    const expectedAmount = payment.expectedAmount || 0;
    const dueDateObj = new Date(dueDate + "T00:00:00");
    const paymentDateStr = formData.paymentDate || new Date().toISOString().split('T')[0];
    const paymentDateObj = new Date(paymentDateStr + "T00:00:00");
    
    const diffTime = paymentDateObj.getTime() - dueDateObj.getTime();
    const daysLate = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const penaltyRate = (config.late_fee_percentage || 2) / 100;
    const interestRate = (config.interest_rate_percentage || 0.033) / 100;

    const penaltyAmount = daysLate > 0 ? expectedAmount * penaltyRate : 0;
    const interestAmount = daysLate > 0 ? expectedAmount * interestRate * daysLate : 0;
    
    const finalPenalty = waiveLateFees ? 0 : penaltyAmount;
    const finalInterest = waiveLateFees ? 0 : interestAmount;
    
    const totalAmount = expectedAmount + finalPenalty + finalInterest;

    setCalculatedValues({
      baseAmount: expectedAmount,
      rentAmount: expectedAmount,
      penaltyAmount: finalPenalty,
      interestAmount: finalInterest,
      totalAmount,
      daysLate,
      lateFee: finalPenalty,
      interest: finalInterest
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData({
        ...formData,
        attachments: [...formData.attachments, base64String],
      });
      toast({
        title: "Arquivo anexado",
        description: `${file.name} foi anexado com sucesso.`,
      });
    };

    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;
      setFormData({
        ...formData,
        attachments: [...formData.attachments, base64String],
      });
      toast({
        title: "Foto capturada",
        description: "Foto anexada com sucesso.",
      });
    };

    reader.readAsDataURL(file);
  };

  const removeAttachment = (index: number) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!payment) return;

    try {
      const paidAmount = parseCurrencyToFloat(formData.paidAmount);

      let status: Payment["status"] = "pending";
      const diff = Math.abs(paidAmount - calculatedValues.totalAmount);
      
      if (paidAmount >= calculatedValues.totalAmount || diff < 0.01) {
        status = "paid";
      } else if (paidAmount > 0) {
        status = "partial";
      }

      const updatedPayment: Payment = {
        ...payment,
        paidAmount,
        paymentDate: formData.paymentDate,
        paymentMethod: formData.paymentMethod.toLowerCase(),
        paymentLocation: formData.paymentMethod === "pix" ? formData.paymentLocation : undefined,
        paymentCode: formData.paymentMethod === "pix" ? formData.paymentCode : undefined,
        status,
        lateFee: waiveLateFees ? 0 : calculatedValues.lateFee,
        interest: waiveLateFees ? 0 : calculatedValues.interest,
        notes: formData.notes,
        attachments: formData.attachments,
      };

      await updatePayment(payment.id, updatedPayment);

      toast({
        title: "Sucesso",
        description: "Recebimento registrado com sucesso!",
      });

      handleBack();

    } catch (error) {
      console.error("Error updating payment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar o recebimento. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (embedded && onClose) {
      onClose();
    } else {
      router.push("/payments");
    }
  };

  if (loading) {
    return embedded ? (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    ) : (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando recebimento...</p>
        </div>
      </Layout>
    );
  }

  if (!payment || !rental) {
    return embedded ? (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Recebimento não encontrado.</p>
      </div>
    ) : (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Recebimento não encontrado.</p>
        </div>
      </Layout>
    );
  }

  if (!hasPermission(user?.role, "canEditPayment") && !isViewMode) {
    return embedded ? (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Você não tem permissão para editar recebimentos.</p>
      </div>
    ) : (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Você não tem permissão para editar recebimentos.</p>
        </div>
      </Layout>
    );
  }

  const content = (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">
          {isViewMode && !isEditing ? "Visualização do Recebimento" : "Registrar Recebimento"}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Informações do Recebimento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Imóvel</p>
              <p className="font-medium">{property?.location || "N/A"}</p>
              {property?.complement && (
                <p className="text-xs text-muted-foreground">{property.complement}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Inquilino</p>
              <p className="font-medium">{tenant?.name || "N/A"}</p>
              {tenant?.phone && (
                <p className="text-xs text-muted-foreground">{tenant.phone}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Vencimento</p>
              <p className="font-medium">
                {payment?.dueDate
                  ? new Date(payment.dueDate + "T00:00:00").toLocaleDateString("pt-BR")
                  : "N/A"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Composição de Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Aluguel:</span>
              <span className="font-medium">{formatCurrency(calculatedValues.rentAmount)}</span>
            </div>
            {calculatedValues.daysLate > 0 && (
              <>
                <div className={`flex justify-between ${waiveLateFees ? 'line-through text-gray-400' : 'text-orange-600'}`}>
                  <span>Multa ({config?.late_fee_percentage || 0}%):</span>
                  <span className="font-medium">{formatCurrency(calculatedValues.lateFee)}</span>
                </div>
                <div className={`flex justify-between ${waiveLateFees ? 'line-through text-gray-400' : 'text-red-600'}`}>
                  <span>Juros ({config?.interest_rate_percentage || "0.033"}%/dia × {calculatedValues.daysLate} dias):</span>
                  <span className="font-medium">{formatCurrency(calculatedValues.interestAmount)}</span>
                </div>
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="waive-fees"
                    checked={waiveLateFees}
                    onCheckedChange={(checked) => setWaiveLateFees(checked as boolean)}
                    disabled={!isEditing}
                  />
                  <label
                    htmlFor="waive-fees"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Retirar multa e juros
                  </label>
                </div>
              </>
            )}
            <div className="flex justify-between pt-2 border-t text-base font-bold">
              <span>Total:</span>
              <span>{formatCurrency(calculatedValues.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="w-full">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados do Recebimento</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="paymentDate" className="text-xs">
                    Data do Pagamento
                  </Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) =>
                      setFormData({ ...formData, paymentDate: e.target.value })
                    }
                    required
                    disabled={!isEditing}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="paidAmount" className="text-xs">
                    Valor Recebido
                  </Label>
                  <Input
                    id="paidAmount"
                    type="text"
                    value={formData.paidAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paidAmount: applyRealMask(e.target.value),
                      })
                    }
                    required
                    placeholder="R$ 0,00"
                    disabled={!isEditing}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="paymentMethod" className="text-xs">
                    Método de Pagamento
                  </Label>
                  <Select 
                    value={formData.paymentMethod} 
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">
                  Observações
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Observações adicionais sobre o pagamento..."
                  rows={3}
                  disabled={!isEditing}
                  className="resize-none text-sm"
                />
              </div>

              {isEditing && (
                <div className="space-y-1">
                  <Label htmlFor="attachments" className="text-xs">Comprovante / Anexos</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("paymentFileUpload")?.click()}
                    >
                      <Paperclip className="mr-2 h-4 w-4" />
                      Anexar Arquivo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("paymentCameraCapture")?.click()}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Tirar Foto
                    </Button>
                  </div>
                  <input
                    id="paymentFileUpload"
                    type="file"
                    accept="image/*,.pdf"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        Array.from(files).forEach(file => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (reader.result) {
                              setFormData(prev => ({
                                ...prev,
                                attachments: [...prev.attachments, reader.result as string]
                              }));
                            }
                          };
                          reader.readAsDataURL(file);
                        });
                      }
                    }}
                  />
                  <input
                    id="paymentCameraCapture"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const file = files[0];
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          if (reader.result) {
                            setFormData(prev => ({
                              ...prev,
                              attachments: [...prev.attachments, reader.result as string]
                            }));
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              )}

              {formData.attachments.length > 0 && (
                <div className="space-y-2">
                  {formData.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="text-sm truncate flex-1">Arquivo {index + 1}</span>
                      {isEditing && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isViewMode && !isEditing ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                  >
                    Fechar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="flex-1"
                  >
                    Editar
                  </Button>
                </div>
              ) : (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Confirmar Recebimento
                    </>
                  )}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <>
      <Head>
        <title>Registrar Recebimento - Gerenciador de Locações</title>
      </Head>
      <Layout>{content}</Layout>
    </>
  );
}