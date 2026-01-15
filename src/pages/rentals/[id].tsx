import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { isAuthenticated } from "@/lib/auth";
import { rentalStorage, propertyStorage, tenantStorage } from "@/lib/storage";
import { Rental, Property, Tenant } from "@/types";
import { ArrowLeft, Edit, Save, X, Calendar, DollarSign, User, Home, FileText, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { applyRealMask } from "@/lib/masks";
import { Checkbox } from "@/components/ui/checkbox";

export default function RentalDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Form state
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editPaymentDay, setEditPaymentDay] = useState("");
  const [editMonthlyRent, setEditMonthlyRent] = useState("");
  const [editHasGarage, setEditHasGarage] = useState(false);
  const [editGarageValue, setEditGarageValue] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    if (id) {
      loadRental();
    }
  }, [router, id]);

  const loadRental = () => {
    const rentalData = rentalStorage.getById(id as string);
    if (!rentalData) {
      toast({ title: "Erro", description: "Locação não encontrada", variant: "destructive" });
      router.push("/rentals");
      return;
    }

    const propertyData = propertyStorage.getById(rentalData.propertyId);
    const tenantData = tenantStorage.getById(rentalData.tenantId);

    setRental(rentalData);
    setProperty(propertyData);
    setTenant(tenantData);

    // Initialize form
    setEditStartDate(rentalData.startDate);
    setEditEndDate(rentalData.endDate);
    setEditPaymentDay(rentalData.paymentDay.toString());
    setEditMonthlyRent(rentalData.monthlyRent.toFixed(2).replace(".", ",") || "");
    setEditHasGarage(rentalData.hasGarage || false);
    setEditGarageValue(rentalData.garageValue?.toFixed(2).replace(".", ",") || "");
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    loadRental();
  };

  const handleSave = () => {
    if (!rental) return;

    const monthlyRent = parseFloat(editMonthlyRent.replace(",", "."));
    const garageValue = editHasGarage ? parseFloat(editGarageValue.replace(",", ".") || "0") : 0;

    const updatedRental: Rental = {
      ...rental,
      paymentDay: parseInt(editPaymentDay),
      monthlyRent,
      hasGarage: editHasGarage,
      garageValue: editHasGarage ? garageValue : undefined
    };

    rentalStorage.update(updatedRental);
    setRental(updatedRental);
    setIsEditing(false);
    toast({ title: "Sucesso!", description: "Locação atualizada com sucesso" });
  };

  const handleEndContract = () => {
    if (!rental) return;

    const updatedRental: Rental = {
      ...rental,
      isActive: false,
      endDate: new Date().toISOString().split("T")[0]
    };

    rentalStorage.update(updatedRental);

    // Update property status
    if (property) {
      const updatedProperty = { ...property, status: "available" as const };
      propertyStorage.update(updatedProperty);
    }

    toast({ title: "Sucesso!", description: "Contrato encerrado com sucesso" });
    router.push("/rentals");
  };

  const handleDelete = () => {
    if (!rental) return;

    rentalStorage.delete(rental.id);

    // Update property status
    if (property) {
      const updatedProperty = { ...property, status: "available" as const };
      propertyStorage.update(updatedProperty);
    }

    toast({ title: "Sucesso!", description: "Locação excluída com sucesso" });
    router.push("/rentals");
  };

  if (!rental || !property || !tenant) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  const totalValue = rental.monthlyRent + (rental.garageValue || 0);

  return (
    <>
      <SEO title={`Locação - ${property.location}`} />
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/rentals")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Detalhes da Locação</h1>
                <p className="text-muted-foreground mt-1">
                  {property.location} - {tenant.name}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!isEditing && rental.isActive && (
                <>
                  <Button onClick={handleEdit} variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button onClick={() => setIsEndDialogOpen(true)} variant="destructive">
                    Encerrar Contrato
                  </Button>
                </>
              )}
              {!rental.isActive && (
                <Button onClick={() => setIsDeleteDialogOpen(true)} variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
              {isEditing && (
                <>
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={rental.isActive ? "default" : "secondary"} className="text-sm">
                  {rental.isActive ? "Ativa" : "Encerrada"}
                </Badge>
              </CardContent>
            </Card>

            {/* Value Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Valor Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <div className="text-sm text-muted-foreground mt-2 space-y-1">
                  <p>Aluguel: R$ {rental.monthlyRent.toFixed(2).replace(".", ",")}</p>
                  {rental.hasGarage && (
                    <p>Garagem: R$ {(rental.garageValue || 0).toFixed(2).replace(".", ",")}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Day Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Dia do Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">Dia {rental.paymentDay}</p>
                <p className="text-sm text-muted-foreground mt-1">de cada mês</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Property Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Imóvel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Local</Label>
                  <p className="font-medium">{property.location}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Endereço</Label>
                  <p className="font-medium">{property.address}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Complemento</Label>
                  <p className="font-medium">{property.complement || "-"}</p>
                </div>
              </CardContent>
            </Card>

            {/* Tenant Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Inquilino
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Nome</Label>
                  <p className="font-medium">{tenant.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{tenant.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Telefone</Label>
                  <p className="font-medium">{tenant.phone}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalhes do Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de Término</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDay">Dia do Pagamento</Label>
                  <Input
                    id="paymentDay"
                    type="number"
                    min="1"
                    max="31"
                    value={editPaymentDay}
                    onChange={(e) => setEditPaymentDay(e.target.value)}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthlyRent">Valor do Aluguel (R$)</Label>
                  <Input
                    id="monthlyRent"
                    value={editMonthlyRent}
                    onChange={(e) => setEditMonthlyRent(applyRealMask(e.target.value))}
                    disabled={!isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasGarage"
                      checked={editHasGarage}
                      onCheckedChange={(checked) => setEditHasGarage(checked as boolean)}
                      disabled={!isEditing}
                    />
                    <Label htmlFor="hasGarage" className={!isEditing ? "text-muted-foreground" : ""}>
                      Possui Vaga de Garagem
                    </Label>
                  </div>
                  {editHasGarage && (
                    <Input
                      id="garageValue"
                      value={editGarageValue}
                      onChange={(e) => setEditGarageValue(applyRealMask(e.target.value))}
                      disabled={!isEditing}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-600">Aluguel:</span>
                    <span className="font-semibold text-slate-900">R$ {rental.monthlyRent.toFixed(2).replace(".", ",")}</span>
                  </div>
                  {rental.hasGarage && (
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-600">Vaga Garagem:</span>
                      <span className="font-semibold text-slate-900">R$ {rental.garageValue?.toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* End Contract Dialog */}
        <Dialog open={isEndDialogOpen} onOpenChange={setIsEndDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Encerrar Contrato</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja encerrar este contrato? O imóvel ficará disponível novamente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEndDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleEndContract}>
                Encerrar Contrato
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Locação</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir esta locação? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}