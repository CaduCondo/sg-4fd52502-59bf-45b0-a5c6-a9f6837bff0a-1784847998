import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { ManagePaymentForm } from "@/components/payments/ManagePaymentForm";
import { PaymentReceipt } from "@/components/PaymentReceipt";
import { supabase } from "@/integrations/supabase/client";
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
  const [isTermination, setIsTermination] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      checkIfTermination();
    }
  }, [id]);

  const checkIfTermination = async () => {
    try {
      const { data: payment, error } = await supabase
        .from("payments")
        .select("notes, breakdown")
        .eq("id", id as string)
        .single();

      if (error) throw error;

      const isTerminationByNotes = payment?.notes?.includes("Rescisão de Contrato") || false;
      
      let isTerminationByBreakdown = false;
      if (payment?.breakdown && Array.isArray(payment.breakdown)) {
        isTerminationByBreakdown = payment.breakdown.some((item: any) => 
          item.description?.includes("Multa Rescisória") || 
          item.description?.includes("Devolução de Caução")
        );
      }

      setIsTermination(isTerminationByNotes || isTerminationByBreakdown);
    } catch (error) {
      console.error("Error checking termination:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!id) return null;

  const handlePaymentSuccess = (data: {
    payment: Payment;
    rental: Rental;
    property: Property;
    tenant: Tenant;
  }) => {
    console.log("Payment data received from ManagePaymentForm:", data.payment);
    setReceiptData(data);
    setShowReceipt(true);
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setReceiptData(null);
    router.push("/payments");
  };

  const pageTitle = isTermination 
    ? "Registrar Recebimento - Rescisão de Contrato"
    : "Registrar Recebimento";

  return (
    <>
      <Head>
        <title>{pageTitle} - Sistema de Locações</title>
      </Head>
      <Layout>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
          {pageTitle}
        </h1>

        <ManagePaymentForm 
          paymentId={id as string}
          onSuccess={handlePaymentSuccess}
        />

        {showReceipt && receiptData && (
          <PaymentReceipt
            payment={receiptData.payment}
            rental={receiptData.rental}
            property={receiptData.property}
            tenant={receiptData.tenant}
            onClose={handleCloseReceipt}
            lateFee={(receiptData.payment as any).lateFee || (receiptData.payment as any).late_fee}
            interest={(receiptData.payment as any).interest}
          />
        )}
      </Layout>
    </>
  );
}