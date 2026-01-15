import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Lightbox } from "@/components/Lightbox";
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  // End contract state
  const [endDate, setEndDate] = useState("");
  
  // Lightbox state
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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
      
      // Populate edit form states
      setEditPropertyId(found.propertyId);
      setEditTenantId(found.tenantId);
      setEditStartDate(found.startDate);
      setEditEndDate(found.endDate);
      setEditPaymentDay(found.paymentDay.toString()); // Convert number to string
      setEditMonthlyRent(formatCurrency(found.monthlyRent));
      setEditObservations(found.observations || "");
      setEditHasMotorcycleSpot(found.hasMotorcycleSpot || false);
      setEditMotorcycleSpotValue(found.motorcycleSpotValue ? formatCurrency(found.motorcycleSpotValue) : "");
    }
  };

  const openEditDialog = () => {
    if (!rental) return;

    const properties = propertyStorage.getAll();
    const tenants = tenantStorage.getAll();
    
    setAvailableProperties(properties.filter(p => p.isActive || p.id === rental.propertyId));
    setAvailableTenants(tenants.filter(t => t.isActive || t.id === rental.tenantId));

    setEditPropertyId(rental.propertyId);
    setEditTenantId(rental.tenantId);
    setEditStartDate(rental.startDate);
    setEditEndDate(rental.endDate);
    setEditPaymentDay(rental.paymentDay.toString()); // Convert number to string
    setEditMonthlyRent(formatCurrency(rental.monthlyRent));
    setEditObservations(rental.observations || "");
    setEditHasMotorcycleSpot(rental.hasMotorcycleSpot || false);
    setEditMotorcycleSpotValue(rental.motorcycleSpotValue ? formatCurrency(rental.motorcycleSpotValue) : "");
    
    setShowEditDialog(true);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental) return;

    const monthlyRent: number = parseFloat(editMonthlyRent.replace(/[^\d,]/g, "").replace(",", "."));
    const motorcycleSpotValue: number = editHasMotorcycleSpot ? parseFloat(editMotorcycleSpotValue.replace(/[^\d,]/g, "").replace(",", ".")) : 0;
    const paymentDay: number = parseInt(editPaymentDay, 10);

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
      paymentDay: paymentDay,
      monthlyRent: monthlyRent,
      value: monthlyRent,
      hasGarage: false,
      observations: editObservations,
      hasMotorcycleSpot: editHasMotorcycleSpot,
      motorcycleSpotValue: editHasMotorcycleSpot ? motorcycleSpotValue : undefined,
      isActive: rental.isActive,
      attachments: rental.attachments,
      createdAt: rental.createdAt
    };

    // Update statuses if property or tenant changed
    // We don't need to manually update status strings anymore if we rely on "Linked to Rental" logic,
    // BUT the current codebase might still rely on some flags.
    // However, the prompt asked to use "isActive" for "Soft Delete / Availability toggle".
    // For now, let's remove the calls to updateStatus that pass strings like "available"/"occupied"
    // because those methods were removed or changed signature in storage.ts to take boolean.
    
    /* 
    if (rental.propertyId !== editPropertyId) {
       // logic removed
    }
    */

    rentalStorage.update(updatedRental);
    
    // Regenerate payments if dates or values changed
    if (
      rental.startDate !== editStartDate ||
      rental.endDate !== editEndDate ||
      rental.paymentDay !== paymentDay || // Both should be numbers here
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

  const handleDelete = () => {
    if (!rental) return;

    // Update statuses - Removed as per new logic (availability derived or manual toggle)
    // propertyStorage.updateStatus(rental.propertyId, "available"); 
    // tenantStorage.updateStatus(rental.tenantId, "vacant");
    
    // Remove all payments for this rental
    const allPayments = paymentStorage.getAll();
    const filteredPayments = allPayments.filter(p => p.rentalId !== rental.id);
    localStorage.setItem("rentals_payments", JSON.stringify(filteredPayments));
    
    // Delete rental
    rentalStorage.delete(rental.id);
    
    setShowDeleteDialog(false);
    router.push("/rentals");
  };

  const handleEndContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rental) return;

    // Update rental status to ended (isActive = false)
    rentalStorage.updateStatus(rental.id, false);
    
    // We don't update property/tenant status automatically anymore 
    // as they remain "Active" (available for new rent) unless manually deactivated.

    setShowEndDialog(false);
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
  };

  const statusLabels = {
    active: "Ativa",
    ended: "Encerrada",
  };
  
  // Helper to get key
  const statusKey = rental.isActive ? 'active' : 'ended';

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
            <Badge className={statusColors[statusKey]}>
              {statusLabels[statusKey]}
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {rental.attachments.map((file, index) => {
                    const isImage = file.type?.startsWith("image/");
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          setLightboxIndex(index);
                          setShowLightbox(true);
                        }}
                        className="group relative aspect-square bg-slate-100 rounded-lg overflow-hidden border-2 border-slate-200 hover:border-blue-500 transition-all cursor-pointer"
                      >
                        {isImage ? (
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            <Paperclip className="h-8 w-8 text-slate-400 mb-2" />
                            <span className="text-xs text-slate-600 font-medium px-2 text-center">
                              {file.name}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </button>
                    );
                  })}
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
            
            {rental.isActive && (
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
              onClick={() => setShowDeleteDialog(true)}
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
                    setEditHasMotorcycleSpot(checked === true); // Ensure boolean
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

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-slate-600">
                Tem certeza que deseja excluir esta locação? Esta ação:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                <li>Removerá permanentemente a locação</li>
                <li>Alterará o status do imóvel para "Disponível"</li>
                <li>Alterará o status do inquilino para "Vago"</li>
                <li>Removerá todos os pagamentos associados</li>
                <li><strong>Esta ação não pode ser desfeita</strong></li>
              </ul>
              <div className="flex items-center space-x-2 pt-4">
                <Button onClick={handleDelete} variant="destructive">
                  Confirmar Exclusão
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* End Contract Dialog */}
        <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Encerrar Contrato de Locação</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEndContract} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="end-date">Data de Encerramento *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <p className="text-sm text-amber-800 font-medium mb-2">
                  Ao encerrar este contrato:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
                  <li>O status da locação será alterado para "Encerrada"</li>
                  <li>O status do imóvel será alterado para "Disponível"</li>
                  <li>O status do inquilino será alterado para "Inativo"</li>
                </ul>
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <Button type="submit" className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4" />
                  <span>Confirmar Encerramento</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEndDialog(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Lightbox for Attachments */}
        {showLightbox && rental.attachments && (
          <Lightbox
            files={rental.attachments?.map(a => ({
              name: a.name, 
              url: a.url, 
              type: a.type || 'application/octet-stream' // Ensure type string
            })) || []}
            initialIndex={lightboxIndex}
            onClose={() => setShowLightbox(false)}
          />
        )}
      </Layout>
    </>
  );
}