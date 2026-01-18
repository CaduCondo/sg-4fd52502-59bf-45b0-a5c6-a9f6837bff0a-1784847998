import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { rentalService, propertyService, tenantService, paymentService } from "@/services";
import type { Rental, Property, Tenant } from "@/types";
import { ArrowLeft, Edit, Save, X, Trash2, Camera, Paperclip, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { applyRealMask, formatCurrency } from "@/lib/masks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AttachmentViewer } from "@/components/AttachmentViewer";

export default function RentalDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [rental, setRental] = useState<Rental | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editPaymentDay, setEditPaymentDay] = useState("");
  const [editMonthlyRent, setEditMonthlyRent] = useState("");
  const [editHasGarage, setEditHasGarage] = useState(false);
  const [editGarageValue, setEditGarageValue] = useState("");
  const [editAttachments, setEditAttachments] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      loadRental();
    }
  }, [id]);

  const loadRental = async () => {
    try {
      setLoading(true);
      const rentalData = await rentalService.getById(id as string);
      
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

      setEditStartDate(rentalData.startDate);
      setEditEndDate(rentalData.endDate || "");
      setEditPaymentDay(rentalData.paymentDay.toString());
      setEditMonthlyRent(applyRealMask((rentalData.monthlyRent * 100).toString()));
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
    loadRental();
  };

  const handleSave = async () => {
    if (!rental) return;

    try {
      const monthlyRent = parseFloat(editMonthlyRent.replace(/\./g, "").replace(",", "."));
      const garageValue = editHasGarage ? parseFloat(editGarageValue.replace(/\./g, "").replace(",", ".") || "0") : 0;
      const totalValue = monthlyRent + garageValue;

      const updatedRental: Rental = {
        ...rental,
        startDate: editStartDate,
        endDate: editEndDate || null,
        paymentDay: parseInt(editPaymentDay),
        monthlyRent,
        value: totalValue,
        hasGarage: editHasGarage,
        garageValue: editHasGarage ? garageValue : undefined,
        attachments: editAttachments,
      };

      await rentalService.update(updatedRental);
      
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
        description: "Locação e recebimentos atualizados com sucesso" 
      });
    } catch (error) {
      console.error("Error updating rental:", error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível atualizar a locação", 
        variant: "destructive" 
      });
    }
  };

  const handleEndContract = async () => {
    if (!rental) return;

    try {
      const updatedRental: Rental = {
        ...rental,
        isActive: false,
        endDate: new Date().toISOString().split("T")[0],
      };

      await rentalService.update(updatedRental);

      if (property) {
        await propertyService.update(property.id, { ...property, status: "available" });
      }

      if (tenant) {
        await tenantService.update({ ...tenant, status: "active" });
      }

      toast({ 
        title: "Sucesso!", 
        description: "Contrato encerrado com sucesso" 
      });
      
      router.push("/rentals");
    } catch (error) {
      console.error("Error ending contract:", error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível encerrar o contrato", 
        variant: "destructive" 
      });
    }
  };

  const handleDelete = async () => {
    if (!rental) return;

    try {
      await rentalService.delete(rental.id);

      if (property) {
        await propertyService.update(property.id, { ...property, status: "available" });
      }

      if (tenant) {
        await tenantService.update({ ...tenant, status: "active" });
      }

      toast({ 
        title: "Sucesso!", 
        description: "Locação excluída com sucesso" 
      });
      
      router.push("/rentals");
    } catch (error) {
      console.error("Error deleting rental:", error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível excluir a locação", 
        variant: "destructive" 
      });
    }
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
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Locação não encontrada</p>
        </div>
      </Layout>
    );
  }

  const totalValue = rental.monthlyRent + (rental.garageValue || 0);

  return (
    <>
      <SEO title={`Locação - ${property.location}`} />
      <Layout>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => router.push("/rentals")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex gap-2">
              {!isEditing && rental.isActive && (
                <>
                  <Button onClick={handleEdit} variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button onClick={() => setIsEndDialogOpen(true)} variant="destructive" size="sm">
                    Encerrar
                  </Button>
                </>
              )}
              {!rental.isActive && (
                <Button onClick={() => setIsDeleteDialogOpen(true)} variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </Button>
              )}
              {isEditing && (
                <>
                  <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{property.location}</CardTitle>
                  <p className="text-xs text-muted-foreground">{property.complement}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalValue)}</p>
                    <p className="text-xs text-muted-foreground">Vencimento dia {rental.paymentDay}</p>
                  </div>
                  <Badge variant={rental.isActive ? "default" : "secondary"}>
                    {rental.isActive ? "Ativa" : "Encerrada"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Inquilino</Label>
                    <p className="text-sm font-medium">{tenant.name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Documento</Label>
                    <p className="text-sm font-medium">{tenant.document || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data Início</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {new Date(rental.startDate + "T00:00:00").toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data Término</Label>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-medium">
                        {rental.endDate ? new Date(rental.endDate + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Dia Pagamento</Label>
                    {isEditing ? (
                      <Select value={editPaymentDay} onValueChange={setEditPaymentDay}>
                        <SelectTrigger className="h-8 text-sm">
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
                    ) : (
                      <p className="text-sm font-medium">Dia {rental.paymentDay}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Valor Aluguel</Label>
                    {isEditing ? (
                      <Input
                        value={editMonthlyRent}
                        onChange={(e) => setEditMonthlyRent(applyRealMask(e.target.value))}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-medium">{formatCurrency(rental.monthlyRent)}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Checkbox
                        id="hasGarage"
                        checked={editHasGarage}
                        onCheckedChange={(checked) => setEditHasGarage(checked as boolean)}
                        disabled={!isEditing}
                      />
                      <Label htmlFor="hasGarage" className="text-xs text-muted-foreground">
                        Vaga Garagem
                      </Label>
                    </div>
                    {editHasGarage && (
                      <>
                        {isEditing ? (
                          <Input
                            placeholder="Valor da vaga"
                            value={editGarageValue}
                            onChange={(e) => setEditGarageValue(applyRealMask(e.target.value))}
                            className="h-8 text-sm"
                          />
                        ) : (
                          <p className="text-sm font-medium">{formatCurrency(rental.garageValue || 0)}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground font-medium">Anexos</Label>
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
                    </div>

                    {editAttachments.length > 0 && (
                      <div className="space-y-2">
                        {editAttachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <span className="text-sm truncate flex-1">
                              Arquivo {index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!isEditing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rental.attachments && rental.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {rental.attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <span className="text-sm truncate flex-1">
                              Arquivo {index + 1}
                            </span>
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
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum anexo disponível.</p>
                    )}
                  </div>
                )}
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
              <Button variant="outline" onClick={() => setIsEndDialogOpen(false)} size="sm">
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleEndContract} size="sm">
                Encerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Excluir Locação</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir esta locação? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} size="sm">
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} size="sm">
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Layout>
    </>
  );
}