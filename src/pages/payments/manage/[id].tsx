import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth";
import { paymentStorage, rentalStorage, propertyStorage, tenantStorage, configStorage } from "@/lib/storage";
import { Payment, Rental, Property, Tenant } from "@/types";
import { ArrowLeft, Save, Upload, X, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, applyRealMask, parseCurrency } from "@/lib/masks";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ManagePayment() {
  const router = useRouter();
  const { id } = router.query;
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  
  // Form state
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Pix" | "Boleto" | "Dinheiro">("Pix");
  const [paymentLocation, setPaymentLocation] = useState<"CP" | "CD" | "CE">("CP");
  const [paymentCode, setPaymentCode] = useState("");
  const [notes, setNotes] = useState("");
  const [giveDiscount, setGiveDiscount] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Calculated values
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [lateFee, setLateFee] = useState(0);
  const [dailyInterest, setDailyInterest] = useState(0);
  const [daysLate, setDaysLate] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (id) {
      loadPaymentData();
    }
  }, [router, id]);

  useEffect(() => {
    if (rental && paymentDate) {
      calculateFees();
    }
  }, [paymentDate, rental, giveDiscount]);

  const loadPaymentData = () => {
    const paymentData = paymentStorage.getById(id as string);
    if (!paymentData) {
      toast({ title: "Erro", description: "Pagamento não encontrado", variant: "destructive" });
      router.push("/payments");
      return;
    }

    const rentalData = rentalStorage.getById(paymentData.rentalId);
    if (!rentalData) {
      toast({ title: "Erro", description: "Locação não encontrada", variant: "destructive" });
      router.push("/payments");
      return;
    }

    const propertyData = propertyStorage.getById(rentalData.propertyId);
    const tenantData = tenantStorage.getById(rentalData.tenantId);

    setPayment(paymentData);
    setRental(rentalData);
    setProperty(propertyData);
    setTenant(tenantData);

    // Initialize form with existing data or defaults
    const today = new Date().toISOString().split("T")[0];
    setPaymentDate(paymentData.paymentDate || today);
    
    // For partial payments, show remaining balance
    if (paymentData.status === "partial") {
      const remaining = paymentData.expectedAmount - paymentData.paidAmount;
      setPaymentAmount(remaining.toFixed(2).replace(".", ","));
    } else {
      setPaymentAmount(paymentData.expectedAmount.toFixed(2).replace(".", ","));
    }
    
    setPaymentMethod(paymentData.paymentMethod as "Pix" | "Boleto" | "Dinheiro" || "Pix");
    setPaymentLocation(paymentData.paymentLocation as "CP" | "CD" | "CE" || "CP");
    setNotes(paymentData.notes || "");
    
    // Generate payment code if Pix
    if (paymentData.paymentMethod === "pix" && !paymentData.paymentCode) {
      generatePaymentCode(today, "CP");
    }
  };

  const calculateFees = () => {
    if (!rental || !payment) return;

    const dueDay = rental.paymentDay;
    const paymentDateObj = new Date(paymentDate + "T00:00:00");
    const dueDate = new Date(payment.dueDate + "T00:00:00");

    // Calculate days late
    const diffTime = paymentDateObj.getTime() - dueDate.getTime();
    const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    setDaysLate(diffDays);

    if (diffDays > 0 && !giveDiscount) {
      // 10% late fee
      const feeAmount = payment.expectedAmount * 0.10;
      setLateFee(feeAmount);

      // 2% per day interest
      const interestAmount = payment.expectedAmount * 0.02 * diffDays;
      setDailyInterest(interestAmount);

      // Total expected with fees
      setExpectedAmount(payment.expectedAmount + feeAmount + interestAmount);
    } else {
      setLateFee(0);
      setDailyInterest(0);
      
      // If payment is partial, show remaining balance
      if (payment.status === "partial") {
        setExpectedAmount(payment.expectedAmount - payment.paidAmount);
      } else {
        setExpectedAmount(payment.expectedAmount);
      }
    }
  };

  const generatePaymentCode = (date: string, location: string) => {
    const day = date.split("-")[2];
    const code = `${day}XXXX${location}`;
    setPaymentCode(code);
  };

  const handlePaymentDateChange = (date: string) => {
    setPaymentDate(date);
    if (paymentMethod === "Pix") {
      generatePaymentCode(date, paymentLocation);
    }
  };

  const handleLocationChange = (location: "CP" | "CD" | "CE") => {
    setPaymentLocation(location);
    if (paymentMethod === "Pix" && paymentDate) {
      generatePaymentCode(paymentDate, location);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (attachments.length + files.length > 5) {
      toast({ 
        title: "Limite excedido", 
        description: "Você pode anexar no máximo 5 arquivos",
        variant: "destructive" 
      });
      return;
    }
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!payment || !rental) return;

    const paidValue = parseCurrency(paymentAmount);
    const totalPaid = payment.paidAmount + paidValue;
    
    // Determine status based on payment amount vs expected
    let newStatus: "paid" | "pending" | "partial" = "pending";
    if (totalPaid >= expectedAmount) {
      newStatus = "paid";
    } else if (totalPaid > 0) {
      newStatus = "partial";
    }

    // Calculate admin fee
    const settings = configStorage.get();
    const adminFeePercent = settings.adminFeePercentage || 6;
    const adminFee = (paidValue * adminFeePercent) / 100;

    const methodLowerCase = paymentMethod.toLowerCase() as "pix" | "boleto" | "dinheiro";

    const updatedPayment: Payment = {
      ...payment,
      paymentDate,
      paidAmount: totalPaid,
      status: newStatus,
      isPaid: newStatus === "paid",
      adminFee: payment.adminFee + adminFee,
      paymentMethod: methodLowerCase,
      paymentLocation: paymentMethod === "Pix" ? paymentLocation : undefined,
      paymentCode: paymentMethod === "Pix" ? paymentCode : undefined,
      notes,
      partialPayments: [
        ...(payment.partialPayments || []),
        {
          id: crypto.randomUUID(),
          date: paymentDate,
          amount: paidValue,
          method: methodLowerCase,
          location: paymentMethod === "Pix" ? paymentLocation : undefined,
          code: paymentMethod === "Pix" ? paymentCode : undefined
        }
      ]
    };

    paymentStorage.update(updatedPayment);
    
    toast({ 
      title: "Sucesso!", 
      description: newStatus === "paid" ? "Pagamento registrado com sucesso" : "Pagamento parcial registrado"
    });
    
    router.push("/payments");
  };

  if (!payment || !rental || !property || !tenant) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  const remainingBalance = payment.status === "partial" 
    ? payment.expectedAmount - payment.paidAmount 
    : 0;

  return (
    <>
      <SEO title="Gestão de Recebimento" />
      <Layout>
        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/payments")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Gestão de Recebimento</h1>
                <p className="text-muted-foreground mt-1">{tenant.name}</p>
              </div>
            </div>
          </div>

          {/* Locação Info - Compact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Locação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Local</Label>
                  <p className="font-medium">{property?.local} {property?.complement && `- ${property.complement}`}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Período</Label>
                  <p className="font-medium">
                    {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status Alert */}
          {payment.status === "partial" && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Pagamento Parcial:</strong> Já foi pago R$ {payment.paidAmount.toFixed(2).replace(".", ",")} 
                {" "}de R$ {payment.expectedAmount.toFixed(2).replace(".", ",")}
              </AlertDescription>
            </Alert>
          )}

          {/* Expected Amount - Compact */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <Label className="text-sm text-muted-foreground">
                      {payment.status === "partial" ? "Saldo Pendente" : "Valor Esperado"}
                    </Label>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(String(expectedAmount))}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground space-y-1">
                    <p>Aluguel: {formatCurrency(String(rental.monthlyRent))}</p>
                    {rental.hasGarage && <p>Garagem: {formatCurrency(String(rental.garageValue || 0))}</p>}
                    {rental.hasMotorcycleSpot && <p>Moto: {formatCurrency(String(rental.motorcycleSpotValue || 0))}</p>}
                  </div>
                </div>

                {daysLate > 0 && !giveDiscount && (
                  <div className="pt-3 border-t space-y-1 text-sm">
                    <div className="flex justify-between text-red-600">
                      <span>Multa (10%):</span>
                      <span className="font-medium">{formatCurrency(String(lateFee))}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Juros ({daysLate} dias x 2%):</span>
                      <span className="font-medium">{formatCurrency(String(dailyInterest))}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Data do Pagamento *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => handlePaymentDateChange(e.target.value)}
                    disabled={payment.isPaid}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Valor a Pagar *</Label>
                  <Input
                    id="paymentAmount"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(applyRealMask(e.target.value))}
                    placeholder="R$ 0,00"
                    disabled={payment.isPaid}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
                  <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pix">Pix</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === "Pix" && (
                  <div className="space-y-2">
                    <Label htmlFor="paymentLocation">Local do Pagamento *</Label>
                    <Select value={paymentLocation} onValueChange={(value) => handleLocationChange(value as any)}>
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
              </div>

              {daysLate > 0 && !payment.isPaid && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="giveDiscount"
                    checked={giveDiscount}
                    onCheckedChange={(checked) => setGiveDiscount(checked as boolean)}
                  />
                  <Label htmlFor="giveDiscount" className="cursor-pointer">
                    Dar desconto (remover multa e juros)
                  </Label>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações adicionais sobre o pagamento..."
                  rows={3}
                />
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <Label>Anexos ({attachments.length}/5)</Label>
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {attachments.length < 5 && (
                    <div>
                      <Input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileSelect}
                        accept="image/*,.pdf"
                        capture="environment"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById("file-upload")?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Adicionar Anexo
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-4 w-4 mr-2" />
              Salvar Pagamento
            </Button>
            <Button variant="outline" onClick={() => router.push("/payments")}>
              Cancelar
            </Button>
          </div>
        </div>
      </Layout>
    </>
  );
}