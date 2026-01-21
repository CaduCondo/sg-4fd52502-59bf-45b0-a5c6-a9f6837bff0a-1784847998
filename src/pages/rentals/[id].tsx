import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { propertyService, tenantService, paymentService } from "@/services";
import type { Rental, Property, Tenant } from "@/types";
import { ArrowLeft, Edit, Save, X, Trash2, Camera, Paperclip, Download, Eye, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { applyRealMask, formatCurrency } from "@/lib/masks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttachmentViewer } from "@/components/AttachmentViewer";
import { 
  getById as getRentalById, 
  update as updateRental, 
  remove as deleteRental 
} from "@/services/rentalService";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/contexts/AuthContext";
import { update as updateProperty } from "@/services/propertyService";
import { update as updateTenant } from "@/services/tenantService";
import { getAll as getAllProperties } from "@/services/propertyService";
import { getAll as getAllTenants } from "@/services/tenantService";
import { getAll as getAllLocations } from "@/services/locationService";
import type { Location } from "@/types";

export default function RentalDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  const [editPropertyId, setEditPropertyId] = useState("");
  const [editTenantId, setEditTenantId] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editPaymentDay, setEditPaymentDay] = useState("");
  const [editHasGarage, setEditHasGarage] = useState(false);
  const [editGarageValue, setEditGarageValue] = useState("");
  const [editAttachments, setEditAttachments] = useState<string[]>([]);

  useEffect(() => {
    if (id && id !== "new") {
      loadData();
    } else if (id === "new") {
      setLoading(false);
      router.push("/rentals");
    }
  }, [id, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rentalData, propertiesData, tenantsData, locationsData] = await Promise.all([
        getRentalById(id as string),
        getAllProperties(),
        getAllTenants(),
        getAllLocations(),
      ]);
      
      if (!rentalData) {
        toast({ 
          title: "Erro", 
          description: "Locação não encontrada", 
          variant: "destructive" 
        });
        router.push("/rentals");
        return;
      }

      const [propertyData, tenantData] = await Promise.all([
        propertyService.getById(rentalData.propertyId),
        tenantService.getById(rentalData.tenantId),
      ]);

      setRental(rentalData);
      setProperty(propertyData || null);
      setTenant(tenantData || null);
      setProperties(propertiesData);
      setTenants(tenantsData);
      setLocations(locationsData);

      setEditPropertyId(rentalData.propertyId);
      setEditTenantId(rentalData.tenantId);
      setEditStartDate(rentalData.startDate);
      setEditEndDate(rentalData.endDate || "");
      setEditPaymentDay(rentalData.paymentDay.toString());
      setEditHasGarage(rentalData.hasGarage || false);
      setEditGarageValue(rentalData.garageValue ? applyRealMask((rentalData.garageValue * 100).toString()) : "");
      setEditAttachments(rentalData.attachments || []);
    } catch (error) {
      console.error("Error loading rental:", error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível carregar os dados da locação", 
        variant: "destructive" 
      });
      router.push("/rentals");
    } finally {
      setLoading(false);
    }
  };

  const getLocationName = (locationId: string) => {
    const location = locations.find((loc) => loc.id === locationId);
    return location?.name || "Local não encontrado";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;
      setEditAttachments([...editAttachments, base64String]);
      toast({
        title: "Arquivo anexado",
        description: `${file.name} foi anexado com sucesso.`,
      });
    };

    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      const base64String = reader.result as string;
      setEditAttachments([...editAttachments, base64String]);
      toast({
        title: "Foto capturada",
        description: "Foto anexada com sucesso.",
      });
    };

    reader.readAsDataURL(file);
  };

  const removeAttachment = (index: number) => {
    setEditAttachments(editAttachments.filter((_, i) => i !== index));
    toast({
      title: "Anexo removido",
      description: "Anexo removido com sucesso.",
    });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    loadData();
  };

  const handleSave = async () => {
    if (!rental) return;

    try {
      const selectedProperty = properties.find((p) => p.id === editPropertyId);
      if (!selectedProperty) {
        throw new Error("Imóvel não encontrado");
      }

      const propertyValue = selectedProperty.value || 0;
      const garageValue = editHasGarage ? parseFloat(editGarageValue.replace(/\./g, "").replace(",", ".") || "0") : 0;
      const totalValue = propertyValue + garageValue;

      const updatedRental: Rental = {
        ...rental,
        propertyId: editPropertyId,
        tenantId: editTenantId,
        startDate: editStartDate,
        endDate: editEndDate || null,
        paymentDay: parseInt(editPaymentDay),
        monthlyRent: propertyValue,
        value: totalValue,
        hasGarage: editHasGarage,
        garageValue: editHasGarage ? garageValue : undefined,
        attachments: editAttachments,
      };

      await updateRental(rental.id, updatedRental);
      
      // Update future payments if value changed
      await paymentService.updateFuturePaymentsOnRentalValueChange(rental.id, totalValue);
      
      // Update future payments if payment day changed
      if (rental.paymentDay !== parseInt(editPaymentDay)) {
        await paymentService.updateFuturePaymentsOnPaymentDayChange(rental.id, parseInt(editPaymentDay));
      }
      
      setRental(updatedRental);
      setIsEditing(false);
      
      toast({ 
        title: "Sucesso!", 
        description: "Locação atualizada com sucesso" 
      });
      
      loadData();
    } catch (error) {
      console.error("Error updating rental:", error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível atualizar a locação", 
        variant: "destructive" 
      });
    }
  };

  const handleEndRental = async () => {
    if (!rental || !property || !tenant) return;

    try {
      await updateRental(rental.id, { isActive: false });
      await updateProperty(property.id, { status: "available" });
      await updateTenant(tenant.id, { status: "active" });

      toast({
        title: "Sucesso",
        description: "Locação encerrada com sucesso.",
      });

      setIsEndDialogOpen(false);
      router.push("/rentals");
    } catch (error) {
      console.error("Error ending rental:", error);
      toast({
        title: "Erro",
        description: "Não foi possível encerrar a locação.",
        variant: "destructive",
      });
    }
  };

  const calculatedTotal = () => {
    const selectedProperty = properties.find((p) => p.id === editPropertyId);
    const propertyValue = selectedProperty?.value || 0;
    const garage = editHasGarage ? parseFloat(editGarageValue.replace(/\./g, "").replace(",", ".") || "0") : 0;
    return propertyValue + garage;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!rental || !property || !tenant) {
    if (id === "new") {
      return (
        <Layout>
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Redirecionando...</p>
          </div>
        </Layout>
      );
    }
    
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Locação não encontrada</p>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <SEO title={`Locação - ${property.location}`} />
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => router.push("/rentals")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button onClick={handleEdit} variant="outline">
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="destructive" onClick={() => setIsEndDialogOpen(true)}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Encerrar Contrato
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/rentals")}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Locação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="property">Imóvel *</Label>
                    <Select value={editPropertyId} onValueChange={setEditPropertyId} disabled={!isEditing}>
                      <SelectTrigger id="property">
                        <SelectValue placeholder="Selecione o imóvel" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((prop) => (
                          <SelectItem key={prop.id} value={prop.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {getLocationName(prop.locationId)}
                                {prop.complement && ` - ${prop.complement}`}
                              </span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-sm font-semibold text-emerald-600">
                                {formatCurrency(prop.value || 0)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tenant">Inquilino *</Label>
                    <Select value={editTenantId} onValueChange={setEditTenantId} disabled={!isEditing}>
                      <SelectTrigger id="tenant">
                        <SelectValue placeholder="Selecione o inquilino" />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data Início *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Data Término</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentDay">Dia Pagamento *</Label>
                    <Select value={editPaymentDay} onValueChange={setEditPaymentDay} disabled={!isEditing}>
                      <SelectTrigger id="paymentDay">
                        <SelectValue placeholder="Selecione o dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            Dia {day.toString().padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasGarage"
                      checked={editHasGarage}
                      onCheckedChange={(checked) => {
                        setEditHasGarage(checked as boolean);
                        if (!checked) {
                          setEditGarageValue("");
                        }
                      }}
                      disabled={!isEditing}
                    />
                    <Label htmlFor="hasGarage" className="cursor-pointer">
                      Vaga Garagem ?
                    </Label>
                  </div>
                  {editHasGarage && (
                    <Input
                      id="garageValue"
                      value={editGarageValue}
                      onChange={(e) => setEditGarageValue(applyRealMask(e.target.value))}
                      placeholder="R$ 0,00"
                      disabled={!isEditing}
                    />
                  )}
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-emerald-900 dark:text-emerald-100">
                        Valor do Aluguel:
                      </span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        {formatCurrency(properties.find((p) => p.id === editPropertyId)?.value || 0)}
                      </span>
                    </div>
                    {editHasGarage && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-emerald-900 dark:text-emerald-100">
                          Vaga Garagem:
                        </span>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                          {editGarageValue ? `+ ${editGarageValue}` : "+ R$ 0,00"}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-emerald-200 dark:border-emerald-800">
                      <span className="font-bold text-emerald-900 dark:text-emerald-100">
                        Valor Total:
                      </span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(calculatedTotal())}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Anexos</Label>
                    {isEditing && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("rentalCameraCapture")?.click()}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Tirar Foto
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("rentalFileUpload")?.click()}
                        >
                          <Paperclip className="mr-2 h-4 w-4" />
                          Anexar Arquivo
                        </Button>
                        <input
                          id="rentalCameraCapture"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleCameraCapture}
                        />
                        <input
                          id="rentalFileUpload"
                          type="file"
                          accept="image/*,.pdf,.doc,.docx"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </div>
                    )}
                  </div>

                  {editAttachments.length > 0 && (
                    <div className="space-y-2">
                      {editAttachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <span className="text-sm truncate flex-1">Arquivo {index + 1}</span>
                          {isEditing ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.href = attachment;
                                  link.download = `arquivo-${index + 1}.jpg`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Baixar
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.href = attachment;
                                  link.target = "_blank";
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
              <Button variant="destructive" onClick={handleEndRental}>
                Encerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}