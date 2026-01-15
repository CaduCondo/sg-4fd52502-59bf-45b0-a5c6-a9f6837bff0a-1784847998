import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth";
import { paymentStorage, rentalStorage, propertyStorage, tenantStorage } from "@/lib/storage";
import { Payment, Rental, Property, Tenant } from "@/types";
import { ArrowLeft, DollarSign, Save, Calendar, MapPin, Hash } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatCurrency, formatDate, applyCurrencyMask, parseCurrencyToNumber } from "@/lib/masks";

export default function PaymentDetails() {
  const router = useRouter();
  const { id } = router.query;
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  
  const [paymentDate, setPaymentDate] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Pix" | "Boleto" | "Dinheiro">("Pix");
  const [paymentLocation, setPaymentLocation] = useState<"CP" | "CD" | "CE">("CP");
  const [paymentCode, setPaymentCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    
    if (id) {
      loadPayment();
    }
  }, [router, id]);

  useEffect(() => {
    if (paymentDate && paymentMethod === "Pix") {
      generatePaymentCode();
    }
  }, [paymentDate, paymentLocation, paymentMethod]);

  const loadPayment = () => {
    const paymentData = paymentStorage.getAll().find(p => p.id === id);
    if (!paymentData) {
      router.push("/payments");
      return;
    }

    const rentalData = rentalStorage.getAll().find(r => r.id === paymentData.rentalId);
    if (!rentalData) {
      router.push("/payments");
      return;
    }

    const propertyData = propertyStorage.getAll().find(p => p.id === rentalData.propertyId);
    const tenantData = tenantStorage.getAll().find(t => t.id === rentalData.tenantId);

    setPayment(paymentData);
    setRental(rentalData);
    setProperty(propertyData || null);
    setTenant(tenantData || null);

    // Preencher campos
    const now = new Date();
    setPaymentDate(now.toISOString().split("T")[0]);
    
    // Se já existe pagamento parcial, mostrar valor restante
    if (paymentData.paidAmount && paymentData.paidAmount > 0) {
      const remainingAmount = paymentData.amount - paymentData.paidAmount;
      setAmountPaid(applyCurrencyMask(remainingAmount.toString()));
    } else {
      setAmountPaid(applyCurrencyMask(paymentData.amount.toString()));
    }

    // Preencher método e local se já existir
    if (paymentData.paymentMethod) {
      setPaymentMethod(paymentData.paymentMethod);
    }
    if (paymentData.paymentLocation) {
      setPaymentLocation(paymentData.paymentLocation);
    }
    if (paymentData.paymentCode) {
      setPaymentCode(paymentData.paymentCode);
    }
  };

  const generatePaymentCode = () => {
    if (!paymentDate) return;
    
    const date = new Date(paymentDate);
    const day = date.getDate().toString().padStart(2, "0");
    const code = `${day}XXXX${paymentLocation}`;
    setPaymentCode(code);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment || !rental) return;

    setIsSubmitting(true);

    const paidAmountVal = parseCurrencyToNumber(amountPaid);
    const currentPaidAmount = payment.paidAmount || 0;
    const newTotalPaid = currentPaidAmount + paidAmountVal;

    // Determinar status baseado no valor pago
    let newIsPaid = false;
    if (newTotalPaid >= payment.amount) {
      newIsPaid = true;
    }

    const updatedPayment: Payment = {
      ...payment,
      paidAmount: newTotalPaid,
      isPaid: newIsPaid,
      paidDate: paymentDate,
      paymentMethod,
      // paymentLocation legacy support if needed
      paymentCode: paymentMethod === "Pix" ? paymentCode : undefined,
      dueDate: payment.dueDate
    };

    paymentStorage.save(updatedPayment);

    // Redirecionar de volta para lista de pagamentos
    router.push("/payments");
  };

  const remainingAmount = payment.amount - (payment.paidAmount || 0);
  
  // Helper for status badge since we moved away from string status
  const getStatusBadge = (isPaid: boolean, paidAmount?: number, totalAmount?: number) => {
    if (isPaid) return { variant: "default" as const, label: "Pago", color: "bg-blue-500" };
    if (paidAmount && paidAmount > 0) return { variant: "secondary" as const, label: "Parcial", color: "bg-yellow-500" };
    return { variant: "destructive" as const, label: "Não Pago", color: "bg-red-500" };
  };

  const statusBadge = getStatusBadge(payment.isPaid, payment.paidAmount, payment.amount);

  if (!payment || !rental || !property || !tenant) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-600">Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <SEO 
        title="Registrar Recebimento - ImóvelControl"
        description="Registrar pagamento de locação"
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                onClick={() => router.push("/payments")}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <h1 className="text-3xl font-bold text-slate-900">Registrar Recebimento</h1>
              <p className="text-slate-600 mt-2">Registre o pagamento da locação</p>
            </div>
            <Badge variant={statusBadge.variant} className="h-8 text-sm">
              {statusBadge.label}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informações da Locação */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  Informações da Locação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-slate-600">Imóvel</p>
                  <p className="font-semibold text-slate-900">{property.local}</p>
                  {property.complement && (
                    <p className="text-sm text-slate-600">{property.complement}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-slate-600">Inquilino</p>
                  <p className="font-semibold text-slate-900">{tenant.name}</p>
                </div>

                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Valor Esperado:</span>
                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                </div>

                {payment.paidAmount && payment.paidAmount > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Valor Pago Parcialmente:</span>
                      <span className="text-lg font-semibold text-yellow-700">
                        {formatCurrency(payment.paidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Valor Restante:</span>
                      <span className="text-lg font-bold text-red-700">
                        {formatCurrency(remainingAmount)}
                      </span>
                    </div>
                  </>
                )}

                <div className="pt-3 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">Data de Vencimento:</span>
                    <span className="font-medium text-slate-900">
                      {formatDate(payment.dueDate)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Formulário de Registro */}
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Save className="h-5 w-5 text-emerald-600" />
                  Registrar Pagamento
                </CardTitle>
                <CardDescription>
                  Preencha os dados do pagamento recebido
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="paymentDate" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Data do Pagamento
                    </Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="amountPaid">Valor a Pagar</Label>
                    <Input
                      id="amountPaid"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(applyCurrencyMask(e.target.value))}
                      placeholder="R$ 0,00"
                      required
                      className="mt-1 text-lg font-semibold"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Digite o valor recebido
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                    <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "Pix" | "Boleto" | "Dinheiro")}>
                      <SelectTrigger className="mt-1">
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
                    <>
                      <div>
                        <Label htmlFor="paymentLocation" className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Local de Pagamento
                        </Label>
                        <Select value={paymentLocation} onValueChange={(value) => setPaymentLocation(value as "CP" | "CD" | "CE")}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CP">CP - Conta Padrão</SelectItem>
                            <SelectItem value="CD">CD - Conta Digital</SelectItem>
                            <SelectItem value="CE">CE - Conta Empresa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="paymentCode" className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Código de Pagamento
                        </Label>
                        <Input
                          id="paymentCode"
                          value={paymentCode}
                          onChange={(e) => setPaymentCode(e.target.value)}
                          placeholder="06XXXXCP"
                          required
                          className="mt-1 font-mono"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Formato: DiaXXXXLocal (ex: 06XXXXCP)
                        </p>
                      </div>
                    </>
                  )}

                  <div className="pt-4 space-y-2">
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Salvando..." : "Salvar Pagamento"}
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => router.push("/payments")}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </>
  );
}