import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, XCircle, ArrowLeft, Eye } from "lucide-react";
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <XCircle className="h-4 w-4 mr-2" />
                      Encerrar Locação
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Encerramento</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja encerrar esta locação? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <Button onClick={handleTerminateRental} onBlur={() => {}}>
                        Confirmar
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
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