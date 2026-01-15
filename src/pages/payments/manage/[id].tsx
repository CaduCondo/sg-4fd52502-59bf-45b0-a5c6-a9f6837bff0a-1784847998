import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isAuthenticated } from "@/lib/auth";
import { paymentStorage, rentalStorage, propertyStorage, tenantStorage, configStorage } from "@/lib/storage";
import { Payment, Rental, Property, Tenant } from "@/types";
import { ArrowLeft, Save, X, CheckCircle, Mail, Camera, Paperclip } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, applyRealMask, parseCurrency, formatDate } from "@/lib/masks";

export default function ManagePayment() {
  const router = useRouter();
  const { id } = router.query;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  
  const [paymentDate, setPaymentDate] = useState("");
  const [amountToPay, setAmountToPay] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Pix" | "Boleto" | "Dinheiro">("Pix");
  const [paymentLocation, setPaymentLocation] = useState<"CP" | "CD" | "CE">("CP");
  const [paymentCode, setPaymentCode] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [removeFees, setRemoveFees] = useState(false);
  
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [lateFee, setLateFee] = useState(0);
  const [interest, setInterest] = useState(0);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (id) {
      loadData();
    }
  }, [router, id]);

  const loadData = () => {
    const paymentData = paymentStorage.getById(id as string);
    if (!paymentData) return;

    const rentalData = rentalStorage.getById(paymentData.rentalId);
    if (!rentalData) return;

    const propertyData = propertyStorage.getById(rentalData.propertyId);
    const tenantData = tenantStorage.getById(rentalData.tenantId);

    setPayment(paymentData);
    setRental(rentalData);
    setProperty(propertyData);
    setTenant(tenantData);

    const today = new Date().toISOString().split("T")[0];
    setPaymentDate(today);
    setPaymentMethod("Pix");
    setPaymentLocation("CP");
    
    updatePaymentCode(today, "CP");

    const baseAmount = paymentData.status === "partial" 
      ? (paymentData.expectedAmount - (paymentData.paidAmount || 0))
      : paymentData.expectedAmount;

    setAmountToPay(baseAmount.toFixed(2).replace(".", ","));
    recalculateTotals(today, baseAmount, paymentData.dueDate);
  };

  const updatePaymentCode = (date: string, location: string) => {
    if (!date) return;
    const day = date.split("-")[2];
    const code = `${day}XXXX${location}`;
    setPaymentCode(code);
  };

  const recalculateTotals = (payDate: string, baseAmount: number, dueDateStr: string) => {
    const paymentDateObj = new Date(payDate);
    const dueDateObj = new Date(dueDateStr);
    
    const isLate = paymentDateObj > dueDateObj;
    
    let calcLateFee = 0;
    let calcInterest = 0;

    if (isLate && !removeFees) {
      calcLateFee = baseAmount * 0.10;
      
      const diffTime = Math.abs(paymentDateObj.getTime() - dueDateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      calcInterest = baseAmount * 0.02 * diffDays;
    }

    setLateFee(calcLateFee);
    setInterest(calcInterest);
    setExpectedAmount(baseAmount + calcLateFee + calcInterest);
    
    setAmountToPay((baseAmount + calcLateFee + calcInterest).toFixed(2).replace(".", ","));
  };

  const handleDateChange = (date: string) => {
    setPaymentDate(date);
    updatePaymentCode(date, paymentLocation);
    if (payment && rental) {
      const baseAmount = payment.status === "partial" 
        ? (payment.expectedAmount - (payment.paidAmount || 0))
        : payment.expectedAmount;
      recalculateTotals(date, baseAmount, payment.dueDate);
    }
  };

  const handleLocationChange = (loc: "CP" | "CD" | "CE") => {
    setPaymentLocation(loc);
    updatePaymentCode(paymentDate, loc);
  };

  const handleRemoveFeesChange = (checked: boolean) => {
    setRemoveFees(checked);
    if (payment && rental) {
      const baseAmount = payment.status === "partial" 
        ? (payment.expectedAmount - (payment.paidAmount || 0))
        : payment.expectedAmount;
      
      if (checked) {
        setLateFee(0);
        setInterest(0);
        setExpectedAmount(baseAmount);
        setAmountToPay(baseAmount.toFixed(2).replace(".", ","));
      } else {
        recalculateTotals(paymentDate, baseAmount, payment.dueDate);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (attachments.length + newFiles.length > 5) {
        toast({ title: "Limite excedido", description: "Máximo de 5 arquivos permitidos", variant: "destructive" });
        return;
      }
      setAttachments([...attachments, ...newFiles]);
    }
  };

  const handleSave = () => {
    if (!payment || !rental) return;

    const paidValue = parseCurrency(amountToPay);
    const isFullPayment = paidValue >= expectedAmount;
    
    const config = configStorage.get();
    const adminFeeVal = (paidValue * (config.adminFeePercentage || 0)) / 100;

    const updatedPayment: Payment = {
      ...payment,
      paidAmount: (payment.paidAmount || 0) + paidValue,
      status: isFullPayment ? "paid" : "partial",
      isPaid: isFullPayment,
      paymentDate,
      paymentMethod: paymentMethod.toLowerCase() as any,
      paymentLocation: paymentMethod === "Pix" ? paymentLocation : undefined,
      paymentCode: paymentMethod === "Pix" ? paymentCode : undefined,
      lateFee: removeFees ? 0 : ((payment.lateFee || 0) + lateFee),
      interest: removeFees ? 0 : ((payment.interest || 0) + interest),
      adminFee: (payment.adminFee || 0) + adminFeeVal,
      notes: notes,
      partialPayments: [
        ...(payment.partialPayments || []),
        {
          id: crypto.randomUUID(),
          date: paymentDate,
          amount: paidValue,
          method: paymentMethod,
          location: paymentMethod === "Pix" ? paymentLocation : undefined,
          code: paymentMethod === "Pix" ? paymentCode : undefined
        }
      ]
    };

    paymentStorage.update(updatedPayment);
    toast({ title: "Sucesso", description: "Pagamento registrado com sucesso!" });
    
    if (isFullPayment) {
      setShowReceipt(true);
    } else {
      router.push("/payments");
    }
  };

  const sendReceiptEmail = () => {
    toast({ title: "Email enviado", description: `Recibo enviado para ${tenant?.email}` });
    setShowReceipt(false);
    router.push("/payments");
  };

  if (!payment || !rental || !property || !tenant) return null;

  return (
    <>
      <SEO title="Gestão de Recebimento" />
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/payments")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Gestão de Recebimento</h1>
              <p className="text-muted-foreground">{tenant.name}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Informações da Locação</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div>
                  <span className="text-muted-foreground block text-xs">Imóvel</span>
                  <span className="font-medium">{property.location}</span>
                  {property.complement && <span className="block text-xs text-muted-foreground">{property.complement}</span>}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="text-muted-foreground block text-xs">Vencimento</span>
                    <span className="font-medium">{formatDate(payment.dueDate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-xs">Valor Original</span>
                    <span className="font-medium">{formatCurrency(payment.expectedAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex justify-between">
                  <span>Valor Esperado</span>
                  <Badge variant={payment.status === "partial" ? "secondary" : "default"}>
                    {payment.status === "partial" ? "Saldo Restante" : "Total"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600 mb-2">
                  {formatCurrency(expectedAmount)}
                </div>
                
                {rental.hasGarage && (
                  <div className="text-xs text-muted-foreground flex gap-2 mb-2">
                    <span>🏠 Aluguel: {formatCurrency(rental.monthlyRent)}</span>
                    <span>🚗 Garagem: {formatCurrency(rental.garageValue || 0)}</span>
                  </div>
                )}

                {(lateFee > 0 || interest > 0) && !removeFees && (
                  <div className="bg-red-50 p-2 rounded text-xs text-red-700 space-y-1">
                    <div className="flex justify-between">
                      <span>Multa (10%):</span>
                      <span>{formatCurrency(lateFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Juros Diários (2%):</span>
                      <span>{formatCurrency(interest)}</span>
                    </div>
                  </div>
                )}
                
                {payment.status === "partial" && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-xs flex justify-between">
                    <span>Já pago:</span>
                    <span className="font-medium text-emerald-600">{formatCurrency(payment.paidAmount || 0)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dados do Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data do Pagamento</Label>
                  <Input 
                    type="date" 
                    value={paymentDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Valor a Pagar</Label>
                  <Input 
                    value={amountToPay}
                    onChange={(e) => setAmountToPay(applyRealMask(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select 
                    value={paymentMethod} 
                    onValueChange={(val: any) => setPaymentMethod(val)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pix">Pix</SelectItem>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentMethod === "Pix" && (
                  <>
                    <div className="space-y-2">
                      <Label>Local</Label>
                      <Select 
                        value={paymentLocation} 
                        onValueChange={(val: any) => handleLocationChange(val)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CP">CP</SelectItem>
                          <SelectItem value="CD">CD</SelectItem>
                          <SelectItem value="CE">CE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Código</Label>
                      <Input 
                        value={paymentCode}
                        onChange={(e) => setPaymentCode(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>

              {(lateFee > 0 || interest > 0) && (
                <div className="flex items-center space-x-2 p-3 bg-amber-50 rounded-lg">
                  <Checkbox
                    id="removeFees"
                    checked={removeFees}
                    onCheckedChange={handleRemoveFeesChange}
                  />
                  <Label htmlFor="removeFees" className="cursor-pointer font-medium">
                    Retirar Multa e Juros
                  </Label>
                </div>
              )}

              <div className="space-y-2 pt-4 border-t">
                <Label className="flex justify-between">
                  <span>Anexos ({attachments.length}/5)</span>
                </Label>
                
                <div className="flex gap-2 flex-wrap">
                  {attachments.map((file, i) => (
                    <Badge key={i} variant="secondary" className="flex gap-1 items-center py-1">
                      {file.name}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} />
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect} 
                    multiple 
                    accept="image/*,.pdf"
                  />
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="h-4 w-4 mr-2" />
                    Anexar Arquivo
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Camera className="h-4 w-4 mr-2" />
                    Tirar Foto
                  </Button>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Button className="flex-1" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Pagamento
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pagamento Registrado!</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <p>O pagamento foi registrado com sucesso e a locação foi atualizada.</p>
              
              <div className="bg-slate-50 p-4 rounded-lg text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Pago:</span>
                  <span className="font-bold">{amountToPay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span>{formatDate(paymentDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Código:</span>
                  <span className="font-mono">{paymentCode || "-"}</span>
                </div>
              </div>

              <Button className="w-full" onClick={sendReceiptEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Enviar Recibo por Email
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}