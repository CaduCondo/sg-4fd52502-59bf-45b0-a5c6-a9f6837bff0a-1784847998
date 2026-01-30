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
  onSave: (property: Partial<Property>) => Promise<void>;
}

export function PropertyFormDialog({ open, onOpenChange, property, onSave }: PropertyFormDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Property>>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    property_type: "apartment" as PropertyType,
    bedrooms: 0,
    bathrooms: 0,
    area: 0,
    rent_amount: 0,
    condominium_fee: 0,
    iptu: 0,
    status: "available" as PropertyStatus,
    description: "",
    photos: [],
    broker_fee_percentage: 0,
    has_furniture: false,
    allows_pets: false,
    has_parking: false,
  });

  // Initialize form when property changes
  useEffect(() => {
    if (property) {
      console.log("🏠 Carregando dados do imóvel para edição:", property);
      
      setFormData({
        name: property.name || "",
        address: property.address || "",
        city: property.city || "",
        state: property.state || "",
        zip_code: property.zip_code || "",
        property_type: property.property_type || "apartment",
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        area: property.area || 0,
        rent_amount: property.rent_amount || 0,
        condominium_fee: property.condominium_fee || 0,
        iptu: property.iptu || 0,
        status: property.status || "available",
        description: property.description || "",
        photos: property.photos || [],
        broker_fee_percentage: property.broker_fee_percentage || 0,
        // CRITICAL: Initialize checkboxes with saved values
        has_furniture: property.has_furniture || false,
        allows_pets: property.allows_pets || false,
        has_parking: property.has_parking || false,
      });

      setImages(property.photos || []);
      
      console.log("✅ Checkboxes inicializados:", {
        has_furniture: property.has_furniture,
        allows_pets: property.allows_pets,
        has_parking: property.has_parking,
      });
    } else {
      // Reset form for new property
      setFormData({
        name: "",
        address: "",
        city: "",
        state: "",
        zip_code: "",
        property_type: "apartment",
        bedrooms: 0,
        bathrooms: 0,
        area: 0,
        rent_amount: 0,
        condominium_fee: 0,
        iptu: 0,
        status: "available",
        description: "",
        photos: [],
        broker_fee_percentage: 0,
        has_furniture: false,
        allows_pets: false,
        has_parking: false,
      });
      setImages([]);
    }
  }, [property, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Erro ao fazer upload");

        const data = await response.json();
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      setFormData({ ...formData, photos: newImages });

      toast({
        title: "Sucesso",
        description: "Imagens enviadas com sucesso",
      });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar imagens",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    setFormData({ ...formData, photos: newImages });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("💾 Salvando imóvel com dados:", formData);
    console.log("📋 Checkboxes sendo salvos:", {
      has_furniture: formData.has_furniture,
      allows_pets: formData.allows_pets,
      has_parking: formData.has_parking,
    });

    setLoading(true);

    try {
      await onSave({
        ...formData,
        photos: images,
      });

      toast({
        title: "Sucesso",
        description: property ? "Imóvel atualizado com sucesso" : "Imóvel criado com sucesso",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar imóvel:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar imóvel",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{property ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Imóvel *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Apartamento Centro"
                  required
                />
              </div>

              <div>
                <Label htmlFor="property_type">Tipo de Imóvel *</Label>
                <Select
                  value={formData.property_type}
                  onValueChange={(value) => setFormData({ ...formData, property_type: value as PropertyType })}
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
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, número, complemento"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">Cidade *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="state">Estado *</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="SP"
                  maxLength={2}
                  required
                />
              </div>

              <div>
                <Label htmlFor="zip_code">CEP *</Label>
                <Input
                  id="zip_code"
                  value={formData.zip_code}
                  onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                  placeholder="00000-000"
                  required
                />
              </div>
            </div>
          </div>

          {/* Características */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Características</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bedrooms">Quartos</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min="0"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="bathrooms">Banheiros</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min="0"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <Label htmlFor="area">Área (m²)</Label>
                <Input
                  id="area"
                  type="number"
                  min="0"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Checkboxes com estado controlado */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_furniture"
                  checked={formData.has_furniture}
                  onCheckedChange={(checked) => {
                    console.log("🪑 Mobiliado alterado:", checked);
                    setFormData({ ...formData, has_furniture: checked === true });
                  }}
                />
                <Label htmlFor="has_furniture" className="cursor-pointer">
                  Mobiliado
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allows_pets"
                  checked={formData.allows_pets}
                  onCheckedChange={(checked) => {
                    console.log("🐕 Aceita pets alterado:", checked);
                    setFormData({ ...formData, allows_pets: checked === true });
                  }}
                />
                <Label htmlFor="allows_pets" className="cursor-pointer">
                  Aceita Pets
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_parking"
                  checked={formData.has_parking}
                  onCheckedChange={(checked) => {
                    console.log("🚗 Garagem alterada:", checked);
                    setFormData({ ...formData, has_parking: checked === true });
                  }}
                />
                <Label htmlFor="has_parking" className="cursor-pointer">
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
                <Label htmlFor="rent_amount">Valor do Aluguel *</Label>
                <Input
                  id="rent_amount"
                  value={applyBRLMask(formData.rent_amount?.toString() || "0")}
                  onChange={(e) => {
                    const numericValue = parseFloat(e.target.value.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
                    setFormData({ ...formData, rent_amount: numericValue });
                  }}
                  placeholder="R$ 0,00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="condominium_fee">Condomínio</Label>
                <Input
                  id="condominium_fee"
                  value={applyBRLMask(formData.condominium_fee?.toString() || "0")}
                  onChange={(e) => {
                    const numericValue = parseFloat(e.target.value.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
                    setFormData({ ...formData, condominium_fee: numericValue });
                  }}
                  placeholder="R$ 0,00"
                />
              </div>

              <div>
                <Label htmlFor="iptu">IPTU</Label>
                <Input
                  id="iptu"
                  value={applyBRLMask(formData.iptu?.toString() || "0")}
                  onChange={(e) => {
                    const numericValue = parseFloat(e.target.value.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
                    setFormData({ ...formData, iptu: numericValue });
                  }}
                  placeholder="R$ 0,00"
                />
              </div>

              <div>
                <Label htmlFor="broker_fee_percentage">Taxa de Corretagem (%)</Label>
                <Input
                  id="broker_fee_percentage"
                  value={applyPercentageMask(formData.broker_fee_percentage?.toString() || "0")}
                  onChange={(e) => {
                    const numericValue = parseFloat(e.target.value.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
                    setFormData({ ...formData, broker_fee_percentage: numericValue });
                  }}
                  placeholder="0%"
                />
              </div>
            </div>
          </div>

          {/* Status e Descrição */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as PropertyStatus })}
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
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o imóvel..."
                rows={4}
              />
            </div>
          </div>

          {/* Fotos */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Fotos</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <label className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
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
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}