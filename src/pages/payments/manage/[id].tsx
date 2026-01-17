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
import { ArrowLeft, DollarSign, Calendar, Home, User, X, Upload, Camera, Paperclip, Eye, Download } from "lucide-react";
import type { Payment, Rental, Property, Tenant, Config } from "@/types";
import { paymentService, rentalService, propertyService, tenantService, configService } from "@/services";
import { applyRealMask, removeMask, formatCurrency, parseCurrencyToFloat } from "@/lib/masks";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import { AttachmentViewer } from "@/components/AttachmentViewer";

interface ManagePaymentContentProps {
  paymentId: string;
  onClose?: () => void;
  embedded?: boolean;
}

export default function ManagePaymentContent({ paymentId, onClose, embedded = false }: ManagePaymentContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReceipt, setShowReceipt] = useState(false);

  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split("T")[0],
    paidAmount: "",
    paymentMethod: "pix",
    paymentLocation: "CP",
    paymentCode: "",
    notes: "",
    attachments: [] as string[],
  });

  const [calculatedValues, setCalculatedValues] = useState({
    baseAmount: 0,
    lateFee: 0,
    interest: 0,
    totalAmount: 0,
  });

  const [waiveLateFees, setWaiveLateFees] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
    // Auto-generate payment code when method or location changes
    if (formData.paymentMethod === "pix") {
      const day = new Date().getDate().toString().padStart(2, "0");
      const code = `${day}XXXX${formData.paymentLocation}`;
      setFormData((prev) => ({ ...prev, paymentCode: code }));
    }
  }, [formData.paymentMethod, formData.paymentLocation]);

  const loadData = async (id: string) => {
    try {
      setLoading(true);
      const paymentData = await paymentService.getById(id);
      const configData = await configService.get();
      setConfig(configData);

      if (paymentData) {
        setPayment(paymentData);

        const rentalData = await rentalService.getById(paymentData.rentalId);
        if (rentalData) {
          setRental(rentalData);

          const [propertyData, tenantData] = await Promise.all([
            propertyService.getById(rentalData.propertyId),
            tenantService.getById(rentalData.tenantId),
          ]);

          setProperty(propertyData);
          setTenant(tenantData);
        }

        // Set initial form data with lowercase payment method
        setFormData({
          paymentDate: paymentData.paymentDate || new Date().toISOString().split("T")[0],
          paidAmount: applyRealMask((paymentData.paidAmount * 100).toString()),
          paymentMethod: (paymentData.paymentMethod || "pix").toLowerCase(),
          paymentLocation: paymentData.paymentLocation || "CP",
          paymentCode: paymentData.paymentCode || "",
          notes: paymentData.notes || "",
          attachments: paymentData.attachments || [],
        });

        // Set view mode if payment is paid
        if (paymentData.status === "paid") {
          setIsViewMode(true);
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error("Error loading payment:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do recebimento.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateValues = () => {
    if (!payment || !rental || !config) return;

    const baseAmount = payment.expectedAmount;
    const dueDate = new Date(payment.dueDate + "T00:00:00");
    const paymentDate = new Date(formData.paymentDate + "T00:00:00");

    let lateFee = 0;
    let interest = 0;

    // Calculate late fee and interest if payment is after due date
    if (paymentDate > dueDate) {
      const daysLate = Math.ceil((paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      // Late fee from config (default 2%)
      const lateFeePercentage = config.lateFeePercentage || 2;
      lateFee = baseAmount * (lateFeePercentage / 100);

      // Interest from config (default 0.033% per day)
      const interestRatePercentage = config.interestRatePercentage || 0.033;
      interest = baseAmount * (interestRatePercentage / 100) * daysLate;
    }

    // Apply or remove fees based on waiveLateFees checkbox
    const totalAmount = waiveLateFees ? baseAmount : baseAmount + lateFee + interest;

    setCalculatedValues({
      baseAmount,
      lateFee,
      interest,
      totalAmount,
    });

    // Update paid amount to total
    setFormData((prev) => ({
      ...prev,
      paidAmount: applyRealMask((totalAmount * 100).toString()),
    }));
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
      // ✅ Use parseCurrencyToFloat to correctly convert "1.534,95" -> 1534.95
      const paidAmount = parseCurrencyToFloat(formData.paidAmount);

      // Determine status based on paid amount vs expected amount
      // Allow small difference for floating point comparisons
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
        paymentMethod: formData.paymentMethod.toLowerCase(), // Ensure lowercase
        paymentLocation: formData.paymentMethod === "pix" ? formData.paymentLocation : undefined,
        paymentCode: formData.paymentMethod === "pix" ? formData.paymentCode : undefined,
        status,
        lateFee: waiveLateFees ? 0 : calculatedValues.lateFee,
        interest: waiveLateFees ? 0 : calculatedValues.interest,
        notes: formData.notes,
        attachments: formData.attachments,
      };

      const savedPayment = await paymentService.update(updatedPayment);
      
      // Update local state with saved payment to ensure receipt has latest data
      setPayment(savedPayment);

      toast({
        title: "Sucesso",
        description: "Recebimento registrado com sucesso!",
      });

      if (status === "paid" || status === "partial") {
        setShowReceipt(true);
      } else {
        handleBack();
      }

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
  
  const handleReceiptClose = () => {
    setShowReceipt(false);
    handleBack();
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (payment) {
      // Reset form data to original payment data
      setFormData({
        paymentDate: payment.paymentDate || new Date().toISOString().split("T")[0],
        paidAmount: applyRealMask((payment.paidAmount * 100).toString()),
        paymentMethod: (payment.paymentMethod || "pix").toLowerCase(),
        paymentLocation: payment.paymentLocation || "CP",
        paymentCode: payment.paymentCode || "",
        notes: payment.notes || "",
        attachments: payment.attachments || [],
      });
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

  const content = (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {isViewMode && !isEditing ? "Visualizar Recebimento" : "Registrar Recebimento"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {property?.location} - {tenant?.name}
          </p>
        </div>
        <div className="flex gap-2">
          {isViewMode && !isEditing ? (
            <>
              <Button variant="outline" onClick={handleEdit}>
                Editar
              </Button>
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <X className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              {embedded && (
                <Button variant="ghost" size="icon" onClick={handleBack}>
                  <X className="h-5 w-5" />
                </Button>
              )}
              {!embedded && (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Informações do Recebimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{property?.location}</p>
                <p className="text-xs text-muted-foreground">{property?.complement}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{tenant?.name}</p>
                <p className="text-xs text-muted-foreground">{tenant?.document}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm">
                Vencimento: {new Date(payment.dueDate + "T00:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>

            <div className="pt-2 border-t">
              <Badge className={payment.status === "paid" ? "bg-green-500" : "bg-yellow-500"}>
                {payment.status === "paid" ? "Pago" : payment.status === "partial" ? "Parcial" : "Pendente"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Value Composition Card */}
        <Card>
          <CardHeader>
            <CardTitle>Composição de Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor do Aluguel:</span>
              <span className="text-sm font-medium">{formatCurrency(calculatedValues.baseAmount)}</span>
            </div>

            {payment.status === "partial" && payment.paidAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor Já Pago:</span>
                <span className="text-sm font-medium text-green-600">-{formatCurrency(payment.paidAmount)}</span>
              </div>
            )}

            {calculatedValues.lateFee > 0 && (
              <div className="flex justify-between">
                <span className={`text-sm ${waiveLateFees ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
                  Multa ({config?.lateFeePercentage || 2}%):
                </span>
                <span className={`text-sm font-medium ${waiveLateFees ? "line-through text-muted-foreground" : "text-red-600"}`}>
                  {formatCurrency(calculatedValues.lateFee)}
                </span>
              </div>
            )}

            {calculatedValues.interest > 0 && (
              <div className="flex justify-between">
                <span className={`text-sm ${waiveLateFees ? "line-through text-muted-foreground" : "text-muted-foreground"}`}>
                  Juros ({config?.interestRatePercentage || 0.033}% ao dia):
                </span>
                <span className={`text-sm font-medium ${waiveLateFees ? "line-through text-muted-foreground" : "text-red-600"}`}>
                  {formatCurrency(calculatedValues.interest)}
                </span>
              </div>
            )}

            {(calculatedValues.lateFee > 0 || calculatedValues.interest > 0) && (
              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="waiveLateFees"
                  checked={waiveLateFees}
                  onChange={(e) => setWaiveLateFees(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="waiveLateFees" className="text-sm cursor-pointer">
                  Descontar multa e juros
                </Label>
              </div>
            )}

            <div className="pt-3 border-t flex justify-between">
              <span className="font-medium">Valor Esperado:</span>
              <span className="text-lg font-bold text-emerald-600">
                {formatCurrency(calculatedValues.totalAmount - (payment.status === "partial" ? payment.paidAmount : 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Dados do Recebimento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDate">
                  Data do Recebimento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  disabled={isViewMode && !isEditing}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidAmount">
                  Valor Recebido <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="paidAmount"
                  value={formData.paidAmount}
                  onChange={(e) => setFormData({ ...formData, paidAmount: applyRealMask(e.target.value) })}
                  placeholder="R$ 0,00"
                  disabled={isViewMode && !isEditing}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">
                  Método de Pagamento <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  disabled={isViewMode && !isEditing}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.paymentMethod === "pix" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="paymentLocation">
                      Local do Pagamento <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.paymentLocation}
                      onValueChange={(value) => setFormData({ ...formData, paymentLocation: value })}
                      disabled={isViewMode && !isEditing}
                    >
                      <SelectTrigger id="paymentLocation">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CP">CP</SelectItem>
                        <SelectItem value="CD">CD</SelectItem>
                        <SelectItem value="CE">CE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentCode">Código PIX</Label>
                    <Input
                      id="paymentCode"
                      value={formData.paymentCode}
                      onChange={(e) => setFormData({ ...formData, paymentCode: e.target.value })}
                      placeholder="Ex: 15XXXXCP"
                      disabled={isViewMode && !isEditing}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Adicione observações sobre este recebimento..."
                  rows={3}
                  disabled={isViewMode && !isEditing}
                />
              </div>
            </div>

            {/* Attachments Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Anexos</Label>
                {(!isViewMode || isEditing) && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("cameraCapture")?.click()}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Tirar Foto
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("fileUpload")?.click()}
                    >
                      <Paperclip className="mr-2 h-4 w-4" />
                      Anexar Arquivo
                    </Button>
                    <input
                      id="cameraCapture"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleCameraCapture}
                    />
                    <input
                      id="fileUpload"
                      type="file"
                      accept="image/*,.pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                )}
              </div>

              {formData.attachments.length > 0 && (
                <div className="space-y-2">
                  {formData.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <span className="text-sm truncate flex-1">
                        Arquivo {index + 1}
                      </span>
                      <div className="flex gap-2">
                        {isViewMode && !isEditing && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = attachment;
                                link.target = "_blank";
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = attachment;
                                link.download = `anexo-${index + 1}`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Baixar
                            </Button>
                          </>
                        )}
                        {(!isViewMode || isEditing) && (
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(!isViewMode || isEditing) && (
              <div className="flex gap-2 justify-end pt-4">
                {isEditing && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancelar
                  </Button>
                )}
                {!isEditing && (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    Cancelar
                  </Button>
                )}
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  {isEditing ? "Salvar Alterações" : "Registrar Recebimento"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
      
      {/* Receipt Modal */}
      {payment && rental && property && tenant && (
        <PaymentReceipt
          isOpen={showReceipt}
          onClose={handleReceiptClose}
          payment={payment}
          rental={rental}
          property={property}
          tenant={tenant}
        />
      )}
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