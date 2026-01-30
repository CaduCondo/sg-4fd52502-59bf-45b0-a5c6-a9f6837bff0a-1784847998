import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Property, PropertyStatus, PropertyType } from "@/types";
import { Camera, X } from "lucide-react";
import { applyBRLMask, applyPercentageMask } from "@/lib/masks";

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property?: Property | null;
  onSave?: (property: Partial<Property>) => Promise<void>; // Make optional
  // Props adicionais para compatibilidade com o uso em properties.tsx
  onSubmit?: (e: React.FormEvent) => Promise<void>;
  formData?: any;
  setFormData?: any;
  isEditMode?: boolean;
  locations?: any[];
  handleNumberChange?: any;
  handleImageUpload?: any;
  removeImage?: any;
  isSubmitting?: boolean;
  viewOnly?: boolean;
  onEdit?: () => void;
}

export function PropertyFormDialog({ 
  open, 
  onOpenChange, 
  property, 
  onSave,
  // Props opcionais vindas do uso em properties.tsx (modo legado)
  onSubmit,
  formData: externalFormData,
  setFormData: setExternalFormData,
  isEditMode,
  locations,
  handleNumberChange,
  handleImageUpload: externalHandleImageUpload,
  removeImage: externalRemoveImage,
  isSubmitting,
  viewOnly,
  onEdit
}: PropertyFormDialogProps) {
  const { toast } = useToast();
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalImages, setInternalImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state interno (usado quando não há formData externo)
  const [internalFormData, setInternalFormData] = useState<Partial<Property>>({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    propertyType: "apartment" as PropertyType,
    rooms: 0,
    bathrooms: 0,
    area: 0,
    rentAmount: 0,
    condominiumFee: 0,
    iptu: 0,
    status: "available" as PropertyStatus,
    description: "",
    photos: [],
    brokerFeePercentage: 0,
    hasFurniture: false,
    acceptsPets: false,
    hasGarage: false,
  });

  // Usar dados externos se disponíveis, senão usar internos
  const data = externalFormData || internalFormData;
  const setData = setExternalFormData || setInternalFormData;
  const loading = isSubmitting || internalLoading;
  const images = externalFormData ? (externalFormData.images || []) : internalImages;

  // Initialize form when property changes (apenas para modo interno)
  useEffect(() => {
    if (!externalFormData && property) {
      console.log("🏠 Carregando dados do imóvel para edição (Modo Interno):", property);
      
      setInternalFormData({
        name: property.name || property.propertyIdentifier || "",
        address: property.address || "",
        city: property.city || property.locationDetails?.city || "",
        state: property.state || property.locationDetails?.state || "",
        zipCode: property.zipCode || property.zip_code || "",
        propertyType: (property.propertyType || property.property_type || "apartment") as PropertyType,
        rooms: property.rooms || property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        area: property.area || 0,
        rentAmount: property.rentAmount || property.rent_amount || property.value || 0,
        condominiumFee: property.condominiumFee || property.condominium_fee || 0,
        iptu: property.iptu || 0,
        status: (property.status || "available") as PropertyStatus,
        description: property.description || "",
        photos: property.photos || property.images || [],
        brokerFeePercentage: property.brokerFeePercentage || property.broker_fee_percentage || 0,
        // CRITICAL: Initialize checkboxes with saved values, checking all aliases
        hasFurniture: property.hasFurniture || property.has_furniture || false,
        acceptsPets: property.acceptsPets || property.allows_pets || property.accepts_pets || false,
        hasGarage: property.hasGarage || property.has_parking || property.has_garage || false,
      });

      setInternalImages(property.photos || property.images || []);
    } else if (!externalFormData && !property) {
      // Reset form
      setInternalFormData({
        name: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        propertyType: "apartment",
        rooms: 0,
        bathrooms: 0,
        area: 0,
        rentAmount: 0,
        condominiumFee: 0,
        iptu: 0,
        status: "available",
        description: "",
        photos: [],
        brokerFeePercentage: 0,
        hasFurniture: false,
        acceptsPets: false,
        hasGarage: false,
      });
      setInternalImages([]);
    }
  }, [property, open, externalFormData]);

  // Handler para upload de imagem interno
  const handleInternalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Erro ao fazer upload");
        const data = await response.json();
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const newImages = [...internalImages, ...uploadedUrls];
      setInternalImages(newImages);
      setInternalFormData(prev => ({ ...prev, photos: newImages }));
      toast({ title: "Sucesso", description: "Imagens enviadas com sucesso" });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({ title: "Erro", description: "Erro ao enviar imagens", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    if (externalRemoveImage) {
      externalRemoveImage(index);
    } else {
      const newImages = internalImages.filter((_, i) => i !== index);
      setInternalImages(newImages);
      setInternalFormData(prev => ({ ...prev, photos: newImages }));
    }
  };

  const handleInternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      await onSubmit(e);
      return;
    }
    
    setInternalLoading(true);
    try {
      if (onSave) {
        await onSave({
          ...internalFormData,
          photos: internalImages,
          // Ensure aliases are set for compatibility
          has_furniture: internalFormData.hasFurniture,
          accepts_pets: internalFormData.acceptsPets,
          allows_pets: internalFormData.acceptsPets,
          has_garage: internalFormData.hasGarage,
          has_parking: internalFormData.hasGarage,
        });
        toast({ title: "Sucesso", description: property ? "Imóvel atualizado" : "Imóvel criado" });
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({ title: "Erro", description: "Erro ao salvar imóvel", variant: "destructive" });
    } finally {
      setInternalLoading(false);
    }
  };

  const propertyTypes: { value: PropertyType; label: string }[] = [
    { value: "apartment", label: "Apartamento" },
    { value: "house", label: "Casa" },
    { value: "commercial", label: "Comercial" },
    { value: "land", label: "Terreno" },
    { value: "farm", label: "Chácara/Fazenda" },
  ];

  const propertyStatuses: { value: PropertyStatus; label: string }[] = [
    { value: "available", label: "Disponível" },
    { value: "rented", label: "Alugado" },
    { value: "maintenance", label: "Em Manutenção" },
  ];

  // Helper to handle field changes safely
  const updateField = (field: string, value: any) => {
    if (setData) {
      setData((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  // Safe accessors for form data (handles both camelCase and snake_case / mixed structures)
  const getVal = (field: string, alias?: string) => {
    return data[field] !== undefined ? data[field] : (alias ? data[alias] : "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {viewOnly ? "Detalhes do Imóvel" : (property || isEditMode ? "Editar Imóvel" : "Novo Imóvel")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleInternalSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Imóvel *</Label>
                <Input
                  id="name"
                  value={getVal("name", "property_identifier")}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="Ex: Apartamento Centro"
                  required
                  disabled={viewOnly}
                />
              </div>

              <div>
                <Label htmlFor="propertyType">Tipo de Imóvel *</Label>
                <Select
                  value={getVal("propertyType", "property_type") || "apartment"}
                  onValueChange={(value) => updateField("propertyType", value)}
                  disabled={viewOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Endereço *</Label>
              <Input
                id="address"
                value={getVal("address")}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Rua, número, complemento"
                required
                disabled={viewOnly}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={getVal("city")}
                  onChange={(e) => updateField("city", e.target.value)}
                  required
                  disabled={viewOnly}
                />
              </div>

              <div>
                <Label htmlFor="state">Estado *</Label>
                <Input
                  id="state"
                  value={getVal("state")}
                  onChange={(e) => updateField("state", e.target.value)}
                  placeholder="SP"
                  maxLength={2}
                  required
                  disabled={viewOnly}
                />
              </div>

              <div>
                <Label htmlFor="zipCode">CEP *</Label>
                <Input
                  id="zipCode"
                  value={getVal("zipCode", "zip_code")}
                  onChange={(e) => updateField("zipCode", e.target.value)}
                  placeholder="00000-000"
                  required
                  disabled={viewOnly}
                />
              </div>
            </div>
          </div>

          {/* Características */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Características</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rooms">Quartos</Label>
                <Input
                  id="rooms"
                  type="number"
                  min="0"
                  value={getVal("rooms", "bedrooms")}
                  onChange={(e) => updateField("rooms", parseInt(e.target.value) || 0)}
                  disabled={viewOnly}
                />
              </div>

              <div>
                <Label htmlFor="bathrooms">Banheiros</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  value={getVal("bathrooms")}
                  onChange={(e) => updateField("bathrooms", parseInt(e.target.value) || 0)}
                  disabled={viewOnly}
                />
              </div>

              <div>
                <Label htmlFor="area">Área (m²)</Label>
                <Input
                  id="area"
                  type="number"
                  min="0"
                  value={getVal("area")}
                  onChange={(e) => updateField("area", parseFloat(e.target.value) || 0)}
                  disabled={viewOnly}
                />
              </div>
            </div>

            {/* Checkboxes com estado controlado */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasFurniture"
                  checked={getVal("hasFurniture", "has_furniture")}
                  onCheckedChange={(checked) => {
                    console.log("🪑 Mobiliado alterado:", checked);
                    updateField("hasFurniture", checked === true);
                    updateField("has_furniture", checked === true);
                  }}
                  disabled={viewOnly}
                />
                <Label htmlFor="hasFurniture" className="cursor-pointer">
                  Mobiliado
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acceptsPets"
                  checked={getVal("acceptsPets", "acceptsPets") || getVal("allows_pets", "accepts_pets")}
                  onCheckedChange={(checked) => {
                    console.log("🐕 Aceita pets alterado:", checked);
                    updateField("acceptsPets", checked === true);
                    updateField("allows_pets", checked === true);
                    updateField("accepts_pets", checked === true);
                  }}
                  disabled={viewOnly}
                />
                <Label htmlFor="acceptsPets" className="cursor-pointer">
                  Aceita Pets
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasGarage"
                  checked={getVal("hasGarage", "has_garage") || getVal("has_parking", "hasGarage")}
                  onCheckedChange={(checked) => {
                    console.log("🚗 Garagem alterada:", checked);
                    updateField("hasGarage", checked === true);
                    updateField("has_garage", checked === true);
                    updateField("has_parking", checked === true);
                  }}
                  disabled={viewOnly}
                />
                <Label htmlFor="hasGarage" className="cursor-pointer">
                  Garagem
                </Label>
              </div>
            </div>
          </div>

          {/* Valores */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Valores</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rentAmount">Valor do Aluguel *</Label>
                <Input
                  id="rentAmount"
                  value={applyBRLMask((getVal("rentAmount", "rent_amount") || getVal("value") || 0).toString())}
                  onChange={(e) => {
                    const numericValue = parseFloat(e.target.value.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
                    updateField("rentAmount", numericValue);
                    updateField("rent_amount", numericValue);
                    updateField("value", numericValue);
                  }}
                  placeholder="R$ 0,00"
                  required
                  disabled={viewOnly}
                />
              </div>

              <div>
                <Label htmlFor="condominiumFee">Condomínio</Label>
                <Input
                  id="condominiumFee"
                  value={applyBRLMask((getVal("condominiumFee", "condominium_fee") || 0).toString())}
                  onChange={(e) => {
                    const numericValue = parseFloat(e.target.value.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
                    updateField("condominiumFee", numericValue);
                    updateField("condominium_fee", numericValue);
                  }}
                  placeholder="R$ 0,00"
                  disabled={viewOnly}
                />
              </div>

              <div>
                <Label htmlFor="iptu">IPTU</Label>
                <Input
                  id="iptu"
                  value={applyBRLMask((getVal("iptu") || 0).toString())}
                  onChange={(e) => {
                    const numericValue = parseFloat(e.target.value.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
                    updateField("iptu", numericValue);
                  }}
                  placeholder="R$ 0,00"
                  disabled={viewOnly}
                />
              </div>

              <div>
                <Label htmlFor="brokerFeePercentage">Taxa de Corretagem (%)</Label>
                <Input
                  id="brokerFeePercentage"
                  value={applyPercentageMask((getVal("brokerFeePercentage", "broker_fee_percentage") || 0).toString())}
                  onChange={(e) => {
                    const numericValue = parseFloat(e.target.value.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
                    updateField("brokerFeePercentage", numericValue);
                    updateField("broker_fee_percentage", numericValue);
                  }}
                  placeholder="0%"
                  disabled={viewOnly}
                />
              </div>
            </div>
          </div>

          {/* Status e Descrição */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={getVal("status") || "available"}
                onValueChange={(value) => updateField("status", value as PropertyStatus)}
                disabled={viewOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {propertyStatuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={getVal("description")}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Descreva o imóvel..."
                rows={4}
                disabled={viewOnly}
              />
            </div>
          </div>

          {/* Fotos */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Fotos</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((image: string, index: number) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  {!viewOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              {!viewOnly && (
                <label className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={externalHandleImageUpload || handleInternalImageUpload}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <div className="text-center">
                    <Camera className="h-8 w-8 mx-auto text-gray-400" />
                    <span className="text-sm text-gray-500 mt-2">
                      {uploadingImage ? "Enviando..." : "Adicionar Fotos"}
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {viewOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!viewOnly && (
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            )}
            {viewOnly && onEdit && (
              <Button type="button" onClick={onEdit}>
                Editar
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}