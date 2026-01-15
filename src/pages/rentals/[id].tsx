import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isAuthenticated } from "@/lib/auth";
import { rentalStorage, propertyStorage, tenantStorage, paymentStorage } from "@/lib/storage";
import { Rental, Property, Tenant, Payment } from "@/types";
import { formatCurrency, formatDate, applyCurrencyMask } from "@/lib/masks";
import { ArrowLeft, Edit, Trash2, XCircle, Home, User, Calendar, DollarSign, FileText, Paperclip, Save, X } from "lucide-react";
import { SEO } from "@/components/SEO";

export default function RentalDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);

  // Edit form states
  const [editPropertyId, setEditPropertyId] = useState("");
  const [editTenantId, setEditTenantId] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editPaymentDay, setEditPaymentDay] = useState("");
  const [editMonthlyRent, setEditMonthlyRent] = useState("");
  const [editObservations, setEditObservations] = useState("");
  const [editHasMotorcycleSpot, setEditHasMotorcycleSpot] = useState(false);
  const [editMotorcycleSpotValue, setEditMotorcycleSpotValue] = useState("");
  const [availableProperties, setAvailableProperties] = useState<Property[]>([]);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);

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
    const rentals = rentalStorage.getAll();
    const found = rentals.find(r => r.id === id);
    if (found) {
      setRental(found);
      
      const prop = propertyStorage.getAll().find(p => p.id === found.propertyId);
      const ten = tenantStorage.getAll().find(t => t.id === found.tenantId);
      
      setProperty(prop || null);
      setTenant(ten || null);
    }
  };

  const openEditDialog = () => {
    if (!rental) return;

    const properties = propertyStorage.getAll();
    const tenants = tenantStorage.getAll();
    
    setAvailableProperties(properties.filter(p => p.status === "available" || p.id === rental.propertyId));
    setAvailableTenants(tenants.filter(t => t.status === "vacant" || t.id === rental.tenantId));

    setEditPropertyId(rental.propertyId);
    setEditTenantId(rental.tenantId);
    setEditStartDate(rental.startDate);
    setEditEndDate(rental.endDate);
    setEditPaymentDay(rental.paymentDay.toString());
    setEditMonthlyRent(formatCurrency(rental.monthlyRent));
    setEditObservations(rental.observations || "");
    setEditHasMotorcycleSpot(rental.hasMotorcycleSpot || false);
    setEditMotorcycleSpotValue(rental.motorcycleSpotValue ? formatCurrency(rental.motorcycleSpotValue) : "");
    setShowEditDialog(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental) return;

    const monthlyRent = parseFloat(editMonthlyRent.replace(/[^\d,]/g, "").replace(",", "."));
    const motorcycleSpotValue = editHasMotorcycleSpot ? parseFloat(editMotorcycleSpotValue.replace(/[^\d,]/g, "").replace(",", ".")) : 0;
    const paymentDay = parseInt(editPaymentDay);

    if (paymentDay < 1 || paymentDay > 28) {
      alert("O dia de pagamento deve estar entre 1 e 28");
      return;
    }

    if (editHasMotorcycleSpot && motorcycleSpotValue <= 0) {
      alert("O valor da vaga de moto é obrigatório quando a opção está marcada");
      return;
    }

    // Update rental
    const updatedRental: Rental = {
      ...rental,
      propertyId: editPropertyId,
      tenantId: editTenantId,
      startDate: editStartDate,
      endDate: editEndDate,
      paymentDay,
      monthlyRent,
      observations: editObservations,
      hasMotorcycleSpot: editHasMotorcycleSpot,
      motorcycleSpotValue: editHasMotorcycleSpot ? motorcycleSpotValue : undefined
    };

    // Update statuses if property or tenant changed
    if (rental.propertyId !== editPropertyId) {
      propertyStorage.updateStatus(rental.propertyId, "available");
      propertyStorage.updateStatus(editPropertyId, "occupied");
    }

    if (rental.tenantId !== editTenantId) {
      tenantStorage.updateStatus(rental.tenantId, "vacant");
      tenantStorage.updateStatus(editTenantId, "active");
    }

    rentalStorage.update(updatedRental);
    
    // Regenerate payments if dates or values changed
    if (
      rental.startDate !== editStartDate ||
      rental.endDate !== editEndDate ||
      rental.paymentDay !== paymentDay ||
      rental.monthlyRent !== monthlyRent ||
      rental.hasMotorcycleSpot !== editHasMotorcycleSpot ||
      rental.motorcycleSpotValue !== motorcycleSpotValue
    ) {
      regeneratePayments(updatedRental);
    }

    setShowEditDialog(false);
    loadRental();
  };

  const regeneratePayments = (rental: Rental) => {
    // Remove old payments for this rental
    const allPayments = paymentStorage.getAll();
    const otherPayments = allPayments.filter(p => p.rentalId !== rental.id);
    
    // Generate new payments
    const totalAmount = rental.monthlyRent + (rental.motorcycleSpotValue || 0);
    const start = new Date(rental.startDate);
    const end = new Date(rental.endDate);
    const newPayments: Payment[] = [];

    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), rental.paymentDay);
      
      newPayments.push({
        id: `payment-${Date.now()}-${Math.random()}`,
        rentalId: rental.id,
        month: currentDate.toLocaleString("pt-BR", { month: "long" }),
        year: currentDate.getFullYear(),
        amount: totalAmount,
        isPaid: false,
        dueDate: dueDate.toISOString().split("T")[0],
        createdAt: new Date().toISOString()
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Save all payments
    localStorage.setItem("rentals_payments", JSON.stringify([...otherPayments, ...newPayments]));
  };

  const handleEndRental = () => {
    if (!rental) return;

    propertyStorage.updateStatus(rental.propertyId, "available");
    tenantStorage.updateStatus(rental.tenantId, "vacant");
    rentalStorage.updateStatus(rental.id, "ended");

    setShowEndDialog(false);
    router.push("/rentals");
  };

  const handleDelete = () => {
    if (!rental || !confirm("Tem certeza que deseja excluir esta locação?")) return;

    propertyStorage.updateStatus(rental.propertyId, "available");
    tenantStorage.updateStatus(rental.tenantId, "vacant");
    
    // Remove all payments for this rental
    const allPayments = paymentStorage.getAll();
    const filteredPayments = allPayments.filter(p => p.rentalId !== rental.id);
    localStorage.setItem("rentals_payments", JSON.stringify(filteredPayments));
    
    rentalStorage.delete(rental.id);
    router.push("/rentals");
  };

  if (!rental || !property || !tenant) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600">Carregando...</p>
        </div>
      </Layout>
    );
  }

  const totalValue = rental.monthlyRent + (rental.motorcycleSpotValue || 0);
  const statusColors = {
    active: "bg-emerald-100 text-emerald-800",
    ended: "bg-slate-100 text-slate-800",
    expired: "bg-red-100 text-red-800"
  };

  const statusLabels = {
    active: "Ativa",
    ended: "Encerrada",
    expired: "Vencida"
  };

  return (
    <>
      <SEO 
        title={`Locação - ${property.local} - ImóvelControl`}
        description={`Detalhes da locação do imóvel ${property.local}`}
      />
      
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="icon" onClick={() => router.push("/rentals")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Detalhes da Locação</h1>
                <p className="text-slate-600 mt-1">Informações completas do contrato</p>
              </div>
            </div>
            <Badge className={statusColors[rental.status]}>
              {statusLabels[rental.status]}
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Property Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Home className="h-5 w-5 text-blue-600" />
                  <CardTitle>Imóvel</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-slate-600">Local</p>
                  <p className="font-semibold text-slate-900">{property.local}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Endereço</p>
                  <p className="text-slate-900">
                    {property.address}, {property.number}
                    {property.complement && ` - ${property.complement}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">CEP</p>
                  <p className="text-slate-900">{property.cep}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Estado</p>
                  <p className="text-slate-900">{property.state}</p>
                </div>
              </CardContent>
            </Card>

            {/* Tenant Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-emerald-600" />
                  <CardTitle>Inquilino</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-slate-600">Nome</p>
                  <p className="font-semibold text-slate-900">{tenant.name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">CPF</p>
                  <p className="text-slate-900">{tenant.cpf}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Telefone</p>
                  <p className="text-slate-900">{tenant.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">E-mail</p>
                  <p className="text-slate-900">{tenant.email}</p>
                </div>
              </CardContent>
            </Card>

            {/* Contract Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  <CardTitle>Dados do Contrato</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-slate-600">Data de Início</p>
                  <p className="text-slate-900">{formatDate(rental.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Data de Término</p>
                  <p className="text-slate-900">{formatDate(rental.endDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Dia de Pagamento</p>
                  <p className="text-slate-900">Dia {rental.paymentDay} de cada mês</p>
                </div>
              </CardContent>
            </Card>

            {/* Financial Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <CardTitle>Valores</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-slate-600">Aluguel Mensal</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrency(rental.monthlyRent)}
                  </p>
                </div>
                {rental.hasMotorcycleSpot && rental.motorcycleSpotValue && (
                  <div>
                    <p className="text-sm text-slate-600">Vaga de Moto</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {formatCurrency(rental.motorcycleSpotValue)}
                    </p>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-sm text-slate-600">Valor Total Mensal</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(totalValue)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Observations */}
          {rental.observations && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-slate-600" />
                  <CardTitle>Observações</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 whitespace-pre-wrap">{rental.observations}</p>
              </CardContent>
            </Card>
          )}

          {/* Attachments */}
          {rental.attachments && rental.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Paperclip className="h-5 w-5 text-slate-600" />
                  <CardTitle>Anexos ({rental.attachments.length})</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rental.attachments.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-slate-50 rounded">
                      <Paperclip className="h-4 w-4 text-slate-500" />
                      <span className="text-sm text-slate-700">{file}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <Button onClick={openEditDialog} className="flex items-center space-x-2">
              <Edit className="h-4 w-4" />
              <span>Editar</span>
            </Button>
            
            {rental.status === "active" && (
              <Button 
                onClick={() => setShowEndDialog(true)}
                variant="outline"
                className="flex items-center space-x-2 border-amber-500 text-amber-700 hover:bg-amber-50"
              >
                <XCircle className="h-4 w-4" />
                <span>Encerrar Locação</span>
              </Button>
            )}
            
            <Button 
              onClick={handleDelete}
              variant="destructive"
              className="flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Excluir</span>
            </Button>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Locação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-property">Imóvel *</Label>
                  <Select value={editPropertyId} onValueChange={setEditPropertyId} required>
                    <SelectTrigger id="edit-property">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProperties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.local} - {p.address}, {p.number}
                          {p.complement && ` - ${p.complement}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tenant">Inquilino *</Label>
                  <Select value={editTenantId} onValueChange={setEditTenantId} required>
                    <SelectTrigger id="edit-tenant">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-start-date">Data de Início *</Label>
                  <Input
                    id="edit-start-date"
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-end-date">Data de Término *</Label>
                  <Input
                    id="edit-end-date"
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-payment-day">Dia de Pagamento (1-28) *</Label>
                  <Input
                    id="edit-payment-day"
                    type="number"
                    min="1"
                    max="28"
                    value={editPaymentDay}
                    onChange={(e) => setEditPaymentDay(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-monthly-rent">Valor Mensal *</Label>
                  <Input
                    id="edit-monthly-rent"
                    value={editMonthlyRent}
                    onChange={(e) => setEditMonthlyRent(applyCurrencyMask(e.target.value))}
                    placeholder="R$ 0,00"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-motorcycle-spot"
                  checked={editHasMotorcycleSpot}
                  onCheckedChange={(checked) => {
                    setEditHasMotorcycleSpot(checked as boolean);
                    if (!checked) setEditMotorcycleSpotValue("");
                  }}
                />
                <Label htmlFor="edit-motorcycle-spot" className="cursor-pointer">
                  Possui Vaga de Moto
                </Label>
              </div>

              {editHasMotorcycleSpot && (
                <div className="space-y-2">
                  <Label htmlFor="edit-motorcycle-value">Valor da Vaga de Moto *</Label>
                  <Input
                    id="edit-motorcycle-value"
                    value={editMotorcycleSpotValue}
                    onChange={(e) => setEditMotorcycleSpotValue(applyCurrencyMask(e.target.value))}
                    placeholder="R$ 0,00"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-observations">Observações</Label>
                <Textarea
                  id="edit-observations"
                  value={editObservations}
                  onChange={(e) => setEditObservations(e.target.value)}
                  placeholder="Detalhes do contrato, condições especiais, etc."
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Button type="submit" className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Salvar</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  className="flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Cancelar</span>
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* End Rental Dialog */}
        <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Encerrar Locação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-slate-600">
                Tem certeza que deseja encerrar esta locação? Esta ação irá:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                <li>Alterar o status da locação para "Encerrada"</li>
                <li>Liberar o imóvel (status: Disponível)</li>
                <li>Liberar o inquilino (status: Vago)</li>
              </ul>
              <div className="flex items-center space-x-2 pt-4">
                <Button onClick={handleEndRental} variant="destructive">
                  Confirmar Encerramento
                </Button>
                <Button variant="outline" onClick={() => setShowEndDialog(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}