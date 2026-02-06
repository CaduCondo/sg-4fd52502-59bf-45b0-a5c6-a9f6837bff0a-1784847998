import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, XCircle, ArrowLeft, Eye, RefreshCw } from "lucide-react";
import { useRentalDetails } from "@/hooks/useRentalDetails";
import { RentalDetailsCard } from "@/components/rentals/RentalDetailsCard";
import { RentalPaymentsTable } from "@/components/rentals/RentalPaymentsTable";
import { RentalContract } from "@/components/RentalContract";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

export default function RentalDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const rentalId = typeof id === "string" ? id : "";

  const {
    rental,
    property,
    tenant,
    payments,
    isLoading,
    handleTerminateRental,
    calculateTotals,
  } = useRentalDetails(rentalId);

  const [showContract, setShowContract] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [rentalToRenew, setRentalToRenew] = useState(false);

  const handleRenewContract = async () => {
    if (!rental) return;

    try {
      const currentEndDate = new Date(rental.endDate);
      currentEndDate.setMonth(currentEndDate.getMonth() + 12);
      const newEndDate = currentEndDate.toISOString().split("T")[0];

      await updateProperty(rental.propertyId, { status: "occupied" });
      await updateTenant(rental.tenantId, { status: "active" });

      toast({
        title: "Contrato renovado com sucesso!",
        description: `Nova data final: ${formatDate(newEndDate)}`,
      });

      setRentalToRenew(false);
      router.push("/rentals");
    } catch (error) {
      console.error("Error renewing contract:", error);
      toast({
        title: "Erro",
        description: "Não foi possível renovar o contrato.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando dados da locação...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!rental || !property || !tenant) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-muted-foreground">Locação não encontrada</p>
            <Button onClick={() => router.push("/rentals")} className="mt-4">
              Voltar para Locações
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const totals = calculateTotals();

  return (
    <>
      <Head>
        <title>Detalhes da Locação - Gerenciador de Locações</title>
      </Head>

      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/rentals")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Detalhes da Locação</h1>
                <p className="text-muted-foreground">
                  Visualize e gerencie os detalhes desta locação
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {rental.contractAttachments && rental.contractAttachments.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowContract(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Contrato
                </Button>
              )}

              {rental.attachments && rental.attachments.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowAttachments(true)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Anexos ({rental.attachments.length})
                </Button>
              )}

              {rental.status === "active" && (
                <>
                  <Button
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setRentalToRenew(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Renovação
                  </Button>

                  <Button
                    variant="default"
                    className="bg-yellow-600 hover:bg-yellow-700"
                    onClick={() => router.push(`/rentals?terminate=${rental.id}`)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Encerrar Contrato
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="details" className="space-y-6">
            <TabsList>
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="payments">
                Parcelas ({payments.length})
              </TabsTrigger>
              <TabsTrigger value="summary">Resumo Financeiro</TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <RentalDetailsCard
                rental={rental}
                property={property}
                tenant={tenant}
              />
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <RentalPaymentsTable payments={payments} />
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="bg-card p-6 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Total Esperado</p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(totals.totalExpected)}
                  </p>
                </div>

                <div className="bg-card p-6 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Total Pago</p>
                  <p className="text-2xl font-bold text-green-600">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(totals.totalPaid)}
                  </p>
                </div>

                <div className="bg-card p-6 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Parcelas Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {totals.totalPending}
                  </p>
                </div>

                <div className="bg-card p-6 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Parcelas Atrasadas</p>
                  <p className="text-2xl font-bold text-red-600">
                    {totals.totalOverdue}
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Renovação AlertDialog */}
        <AlertDialog open={rentalToRenew} onOpenChange={setRentalToRenew}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Renovação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que você deseja adicionar mais 1 ano de contrato a essa locação?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Não</AlertDialogCancel>
              <AlertDialogAction onClick={handleRenewContract}>
                Sim
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Contract Dialog */}
        <Dialog open={showContract} onOpenChange={setShowContract}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Contrato de Locação</DialogTitle>
            </DialogHeader>
            <RentalContract
              rental={rental}
              property={property}
              tenant={tenant}
              onClose={() => setShowContract(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Attachments Dialog */}
        <Dialog open={showAttachments} onOpenChange={setShowAttachments}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Anexos da Locação</DialogTitle>
            </DialogHeader>
            <AttachmentViewer
              attachments={rental.attachments || []}
              onRemove={() => {}}
              readOnly
            />
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}