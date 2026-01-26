import { useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";

export default function TenantDetailsPage() {
  const router = useRouter();
  const { id } = router.query;

  useEffect(() => {
    if (id) {
      // Redirect to tenants list page with the tenant ID as a query parameter
      // This will open the TenantFormDialog in view mode
      router.replace(`/tenants?view=${id}`);
    }
  }, [id, router]);

  return (
    <>
      <SEO title="Carregando..." />
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    </>
  );
}