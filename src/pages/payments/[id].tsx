import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/masks";
import { paymentService } from "@/services/paymentService";
import { rentalService } from "@/services/rentalService";
import { propertyService } from "@/services/propertyService";
import { tenantService } from "@/services/tenantService";
import type { Payment, Rental, Property, Tenant } from "@/types";

export default function PaymentDetailsPage() {
  const router = useRouter();
  const { id } = router.query;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && typeof id === "string") {
      loadData(id);
    }
  }, [id]);

  const loadData = async (paymentId: string) => {
    try {
      setLoading(true);
      const paymentData = await paymentService.getById(paymentId);
      if (!paymentData) {
        router.push("/payments");
        return;
      }
      setPayment(paymentData);

      const rentalData = await rentalService.getById(paymentData.rentalId);
      if (rentalData) {
        setRental(rentalData);
        const [propertyData, tenantData] = await Promise.all([
          propertyService.getById(rentalData.propertyId),
          tenantService.getById(rentalData.tenantId)
        ]);
        setProperty(propertyData);
        setTenant(tenantData);
      }
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Layout>Carregando...</Layout>;
  if (!payment) return <Layout>Pagamento não encontrado</Layout>;

  return (
    <>
      <Head>
        <title>Detalhes do Pagamento - Sistema de Locações</title>
      </Head>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">Detalhes do Pagamento</h1>
            <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge variant={payment.status === "paid" ? "default" : "destructive"}>
                    {payment.status === "paid" ? "Pago" : "Pendente"}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Referência</p>
                  <p>{payment.referenceMonth}/{payment.referenceYear}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Vencimento</p>
                  <p>{formatDate(payment.dueDate)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Valores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Valor Esperado</p>
                  <p className="text-xl font-bold">{formatCurrency(payment.expectedAmount)}</p>
                </div>
                {payment.paidAmount && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Valor Pago</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(payment.paidAmount)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </>
  );
}