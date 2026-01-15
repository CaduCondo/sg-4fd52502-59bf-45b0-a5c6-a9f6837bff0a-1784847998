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
import { ArrowLeft, DollarSign, Save, Calendar, MapPin, Hash, Edit } from "lucide-react";
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
  const [paymentMethod, setPaymentMethod] = useState<"Pix" | "Boleto" | "Dinheiro" | "Transferencia">("Pix");
  const [paymentLocation, setPaymentLocation] = useState<"CP" | "CD" | "CE">("CP");
  const [paymentCode, setPaymentCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
      const remainingAmount = paymentData.expectedAmount - paymentData.paidAmount;
      setAmountPaid(applyCurrencyMask(remainingAmount.toString()));
    } else {
      setAmountPaid(applyCurrencyMask(paymentData.expectedAmount.toString()));
    }

    // Preencher método e local se já existir
    if (paymentData.paymentMethod) {
      // Convert backend value (lowercase) to frontend state (Capitalized) if needed or align state
      const method = paymentData.paymentMethod.charAt(0).toUpperCase() + paymentData.paymentMethod.slice(1);
      setPaymentMethod(method as "Pix" | "Boleto" | "Dinheiro" | "Transferencia");
    }
    if (paymentData.paymentLocation) {
      setPaymentLocation(paymentData.paymentLocation as "CP" | "CD" | "CE");
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
    if (newTotalPaid >= payment.expectedAmount) {
      newIsPaid = true;
    }

    const updatedPayment: Payment = {
      ...payment,
      paidAmount: newTotalPaid,
      isPaid: newIsPaid,
      paymentDate: paymentDate,
      paymentMethod: paymentMethod.toLowerCase() as "pix" | "boleto" | "dinheiro",
      paymentCode: paymentMethod === "Pix" ? paymentCode : undefined,
      dueDate: payment.dueDate
    };

    paymentStorage.save(updatedPayment);

    // Redirecionar de volta para lista de pagamentos
    router.push("/payments");
  };

  const remainingAmount = payment.expectedAmount - (payment.paidAmount || 0);
  
  // Helper for status badge since we moved away from string status
  const getStatusBadge = (isPaid: boolean, paidAmount?: number, totalAmount?: number) => {
    if (isPaid) return { variant: "default" as const, label: "Pago", color: "bg-blue-500" };
    if (paidAmount && paidAmount > 0) return { variant: "secondary" as const, label: "Parcial", color: "bg-yellow-500" };
    return { variant: "destructive" as const, label: "Não Pago", color: "bg-red-500" };
  };

  const statusBadge = getStatusBadge(payment.isPaid, payment.paidAmount, payment.expectedAmount);

  if (!payment || !rental || !property || !tenant) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Detalhes do Pagamento</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  <Badge variant={payment.isPaid ? "default" : "destructive"}>
                    {payment.isPaid ? "Pago" : "Pendente"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Valor Esperado</Label>
                <p className="text-lg font-semibold mt-1">
                  {formatCurrency(payment.expectedAmount)}
                </p>
              </div>
              {payment.isPaid && (
                <>
                  <div>
                    <Label className="text-muted-foreground">Valor Pago</Label>
                    <p className="text-lg font-semibold mt-1 text-green-600">
                      {formatCurrency(payment.paidAmount)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data Pagamento</Label>
                    <p className="text-lg font-medium mt-1">
                      {payment.paymentDate ? formatDate(payment.paymentDate) : "-"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}