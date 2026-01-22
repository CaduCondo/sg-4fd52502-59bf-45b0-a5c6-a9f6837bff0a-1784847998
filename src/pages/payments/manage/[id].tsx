import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ManagePaymentForm } from "@/components/payments/ManagePaymentForm";

export default function ManagePaymentPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id) return null;

  return (
    <>
      <Head>
        <title>Gerenciar Pagamento - Sistema de Locações</title>
      </Head>
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Gerenciar Pagamento</h1>
            </div>
          </div>

          <ManagePaymentForm 
            paymentId={id as string} 
            embedded={false}
          />
        </div>
      </Layout>
    </>
  );
}