import { useRouter } from "next/router";
import Head from "next/head";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, XCircle, ArrowLeft, Eye, RefreshCw, Trash2 } from "lucide-react";
import { useRentalDetails } from "@/hooks/useRentalDetails";
import { RentalDetailsCard } from "@/components/rentals/RentalDetailsCard";
import { RentalPaymentsTable } from "@/components/rentals/RentalPaymentsTable";
import { RentalContract } from "@/components/RentalContract";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { RentalTerminationDialog } from "@/components/rentals/RentalTerminationDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/masks";

export default function RentalDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const rentalId = typeof id === "string" ? id : "";
  const { toast } = useToast();

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
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [showTerminationDialog, setShowTerminationDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleTermination = () => {
    console.log("🔥 BOTÃO DE RESCISÃO CLICADO!");
    console.log("📋 Rental ID:", rental?.id);
    console.log("📋 Rental Status:", rental?.status);
    console.log("📋 Is Active:", rental?.isActive);
    setShowTerminationDialog(true);
  };

  const handleRenewRental = async () => {
    if (!rental) return;

    try {
      const currentEndDate = new Date(rental.endDate);
      const newEndDate = new Date(currentEndDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);

      const { update: updateRental } = await import("@/services/rentalService");
      await updateRental(rental.id, {
        endDate: newEndDate.toISOString().split("T")[0],
      });

      toast({
        title: "Sucesso",
        description: `Contrato renovado com sucesso! Nova data final: ${formatDate(newEndDate.toISOString())}`,
      });

      setShowRenewalDialog(false);
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

  const handleDeleteRental = async () => {
    if (!rental) return;

    try {
      const { remove } = await import("@/services/rentalService");
      await remove(rental.id);

      toast({
        title: "Sucesso",
        description: "Locação excluída com sucesso!",
      });

      setShowDeleteDialog(false);
      router.push("/rentals");
    } catch (error) {
      console.error("Error deleting rental:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a locação.",
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

              <Button
                variant="outline"
                className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                onClick={() => setShowRenewalDialog(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Renovação
              </Button>
              
              <Button
                variant="outline"
                className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                onClick={handleTermination}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Encerrar Contrato
              </Button>
              
              <Button
                variant="outline"
                className="bg-red-500 hover:bg-red-600 text-white border-red-500"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
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

        {/* Renovação AlertDialog */}
        <AlertDialog open={showRenewalDialog} onOpenChange={setShowRenewalDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Renovação</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que você deseja adicionar mais 1 ano de contrato a essa locação?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Não</AlertDialogCancel>
              <AlertDialogAction onClick={handleRenewRental} className="bg-blue-500 hover:bg-blue-600">
                Sim
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Exclusão AlertDialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que você deseja excluir esta locação? Esta ação não pode ser desfeita e todos os pagamentos associados serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRental} className="bg-red-500 hover:bg-red-600">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rescisão Dialog */}
        <RentalTerminationDialog
          open={showTerminationDialog}
          onOpenChange={setShowTerminationDialog}
          rental={rental}
          onConfirm={handleTerminateRental}
        />
      </Layout>
    </>
  );
}