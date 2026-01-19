import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { getById as getPaymentById } from "@/services/paymentService";
import { getById as getRentalById } from "@/services/rentalService";
import { getById as getPropertyById } from "@/services/propertyService";
import { getById as getTenantById } from "@/services/tenantService";
import { Payment, Rental, Property, Tenant } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Calendar, DollarSign, User, Home } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentReceipt } from "@/components/PaymentReceipt";

export default function PaymentDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const paymentData = await getPaymentById(id as string);
      setPayment(paymentData);

      if (paymentData.rentalId) {
        const rentalData = await getRentalById(paymentData.rentalId);
        setRental(rentalData);

        if (rentalData.propertyId) {
          const propertyData = await getPropertyById(rentalData.propertyId);
          setProperty(propertyData);
        }

        if (rentalData.tenantId) {
          const tenantData = await getTenantById(rentalData.tenantId);
          setTenant(tenantData);
        }
      }
    } catch (error) {
      console.error("Error loading payment details:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar detalhes do pagamento.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!payment) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Detalhes do Pagamento</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Informações do Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="capitalize">{payment.status === 'paid' ? 'Pago' : payment.status === 'pending' ? 'Pendente' : 'Atrasado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vencimento</p>
                  <p>{formatDate(payment.dueDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor Esperado</p>
                  <p>{formatCurrency(payment.expectedAmount)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor Pago</p>
                  <p>{payment.paidAmount ? formatCurrency(payment.paidAmount) : '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {rental && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Dados do Contrato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {property && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Home className="h-4 w-4" /> Imóvel
                    </p>
                    <p>{property.name}</p>
                    <p className="text-xs text-muted-foreground">{property.address}</p>
                  </div>
                )}
                {tenant && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <User className="h-4 w-4" /> Inquilino
                    </p>
                    <p>{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">{tenant.email}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {payment.status === 'paid' && payment.paidAmount && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Recibo de Pagamento</h2>
            <div className="border rounded-lg p-4 bg-white">
              <PaymentReceipt
                tenantName={tenant?.name || "Inquilino"}
                propertyAddress={property?.address || "Endereço do imóvel"}
                amount={payment.paidAmount}
                referenceMonth={`${payment.referenceMonth}/${payment.referenceYear}`}
                paymentDate={payment.paymentDate || new Date().toISOString()}
                ownerName={property?.location || "Imobiliária"} // Fallback
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}