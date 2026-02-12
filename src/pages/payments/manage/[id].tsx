import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ManagePaymentForm } from "@/components/payments/ManagePaymentForm";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import type { Payment, Rental, Property, Tenant } from "@/types";

export default function ManagePaymentPage() {
  const router = useRouter();
  const { id } = router.query;
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
  } | null>(null);

  if (!id) return null;

  const handlePaymentSuccess = (data: {
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
  }) => {
    console.log("🎯 handlePaymentSuccess CHAMADO NA PÁGINA!");
    console.log("📄 Página recebeu dados do pagamento:", data);
    console.log("🔧 Setando receiptData...");
    setReceiptData(data);
    console.log("🔧 Setando showReceipt para true...");
    setShowReceipt(true);
    console.log("✅ Estados setados! Recibo deve aparecer agora!");
  };

  const handleCloseReceipt = () => {
    console.log("🔙 Fechando recibo e voltando para listagem...");
    setShowReceipt(false);
    setReceiptData(null);
    router.push("/payments");
  };

  console.log("🔍 Estado atual da página - showReceipt:", showReceipt, "hasReceiptData:", !!receiptData);

  return (
    <>
      <Head>
        <title>Registrar Recebimento - Sistema de Locações</title>
      </Head>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Registrar Recebimento
              </h1>
            </div>
          </div>

          <ManagePaymentForm 
            paymentId={id as string}
            onSuccess={handlePaymentSuccess}
          />
        </div>

        {showReceipt && receiptData && (
          <>
            {console.log("✅ RENDERIZANDO PaymentReceipt - Dialog deve abrir!")}
            <PaymentReceipt
              payment={receiptData.payment}
              rental={receiptData.rental}
              property={receiptData.property}
              tenant={receiptData.tenant}
              onClose={handleCloseReceipt}
            />
          </>
        )}
      </Layout>
    </>
  );
}