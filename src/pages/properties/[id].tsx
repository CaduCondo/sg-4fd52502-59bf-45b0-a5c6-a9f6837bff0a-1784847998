import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyInput } from "@/lib/masks";
import { AttachmentViewer } from "@/components/AttachmentViewer";

export default function PropertyDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    locationId: "",
    complement: "",
    propertyIdentifier: "",
    rooms: "",
    bathrooms: "",
    monthlyRent: "",
    description: "",
    images: [] as string[],
    hasFurniture: false,
    acceptsPets: false,
    status: "available" as "available" | "occupied" | "unavailable",
    area: "",
    hasGarage: false,
  });

  useEffect(() => {
    if (id && typeof id === "string") {
      fetchProperty(id);
      fetchLocations();
    }
  }, [id]);

  const fetchLocations = async () => {
    const { data } = await supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (data) {
      setLocations(data);
    }
  };

  const fetchProperty = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", propertyId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          locationId: data.location_id || "",
          complement: data.complement || "",
          propertyIdentifier: data.property_identifier || "",
          rooms: data.rooms?.toString() || "",
          bathrooms: data.bathrooms?.toString() || "",
          monthlyRent: data.value?.toString() || "",
          description: data.description || "",
          images: Array.isArray(data.images) ? data.images.map((img: any) => String(img)) : [],
          hasFurniture: data.has_furniture === true,
          acceptsPets: data.accepts_pets === true,
          status: (data.status as "available" | "occupied" | "unavailable") || "available",
          area: data.area?.toString() || "",
          hasGarage: data.has_garage === true,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar imóvel:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do imóvel.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberChange = (field: "rooms" | "bathrooms", value: string) => {
    const numbersOnly = value.replace(/\D/g, "");
    const limitedValue = numbersOnly.slice(0, 2);
    setFormData({ ...formData, [field]: limitedValue });
  };

  const handleMoneyChange = (value: string) => {
    const maskedValue = formatCurrencyInput(value);
    setFormData({ ...formData, monthlyRent: maskedValue });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      try {
        const response = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (response.ok) {
          const data = await response.json();
          uploadedUrls.push(data.url);
        }
      } catch (error) {
        console.error("Erro ao fazer upload da imagem:", error);
      }
    }

    setFormData({
      ...formData,
      images: [...formData.images, ...uploadedUrls],
    });
  };

  const handleRemoveImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const handleSave = async () => {
    if (!id || typeof id !== "string") return;

    setIsSaving(true);

    try {
      const payload = {
        location_id: formData.locationId,
        complement: formData.complement,
        property_identifier: formData.propertyIdentifier,
        rooms: formData.rooms ? parseInt(formData.rooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        value: formData.monthlyRent
          ? parseFloat(formData.monthlyRent.replace(/\./g, "").replace(",", "."))
          : 0,
        description: formData.description,
        images: formData.images,
        has_furniture: formData.hasFurniture,
        accepts_pets: formData.acceptsPets,
        area: formData.area ? parseFloat(formData.area.replace(",", ".")) : null,
        status: formData.status,
        has_garage: formData.hasGarage,
      };

      const { error } = await supabase
        .from("properties")
        .update(payload)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Imóvel atualizado com sucesso!",
      });

      router.push("/properties");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p>Carregando...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push("/properties")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Editar Imóvel</h1>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações do Imóvel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Linha 1: Local e Código */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="location" className="text-xs">Local *</Label>
                <Select
                  value={formData.locationId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, locationId: value })
                  }
                >
                  <SelectTrigger id="location" className="h-8 text-sm">
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="propertyIdentifier" className="text-xs">Código do Imóvel *</Label>
                <Input
                  id="propertyIdentifier"
                  value={formData.propertyIdentifier}
                  onChange={(e) =>
                    setFormData({ ...formData, propertyIdentifier: e.target.value })
                  }
                  placeholder="Ex: AP-001"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Linha 2: Complemento */}
            <div className="space-y-1">
              <Label htmlFor="complement" className="text-xs">Complemento</Label>
              <Input
                id="complement"
                value={formData.complement}
                onChange={(e) =>
                  setFormData({ ...formData, complement: e.target.value })
                }
                placeholder="Ex: Apto 102, Bloco A"
                className="h-8 text-sm"
              />
            </div>

            {/* Linha 3: Quartos, Banheiros, Área, Valor */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rooms" className="text-xs">Quartos</Label>
                <Input
                  id="rooms"
                  type="text"
                  inputMode="numeric"
                  value={formData.rooms}
                  onChange={(e) => handleNumberChange("rooms", e.target.value)}
                  placeholder="0"
                  maxLength={2}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bathrooms" className="text-xs">Banheiros</Label>
                <Input
                  id="bathrooms"
                  type="text"
                  inputMode="numeric"
                  value={formData.bathrooms}
                  onChange={(e) => handleNumberChange("bathrooms", e.target.value)}
                  placeholder="0"
                  maxLength={2}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="area" className="text-xs">Área (m²)</Label>
                <Input
                  id="area"
                  type="text"
                  inputMode="decimal"
                  value={formData.area}
                  onChange={(e) =>
                    setFormData({ ...formData, area: e.target.value })
                  }
                  placeholder="0"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="monthlyRent" className="text-xs">Valor *</Label>
                <Input
                  id="monthlyRent"
                  value={formData.monthlyRent}
                  onChange={(e) => handleMoneyChange(e.target.value)}
                  placeholder="0,00"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Linha 4: Status */}
            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "available" | "occupied" | "unavailable") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="status" className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Disponível</SelectItem>
                  <SelectItem value="occupied">Ocupado</SelectItem>
                  <SelectItem value="unavailable">Indisponível</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linha 5: Checkboxes */}
            <div className="space-y-1">
              <Label className="text-xs">Características</Label>
              <div className="flex gap-4 pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasFurniture"
                    checked={formData.hasFurniture}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hasFurniture: checked === true })
                    }
                  />
                  <Label htmlFor="hasFurniture" className="text-xs font-normal cursor-pointer">
                    Móveis Planejados
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="acceptsPets"
                    checked={formData.acceptsPets}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, acceptsPets: checked === true })
                    }
                  />
                  <Label htmlFor="acceptsPets" className="text-xs font-normal cursor-pointer">
                    Aceita Pets
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasGarage"
                    checked={formData.hasGarage}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hasGarage: checked === true })
                    }
                  />
                  <Label htmlFor="hasGarage" className="text-xs font-normal cursor-pointer">
                    Vaga Garagem
                  </Label>
                </div>
              </div>
            </div>

            {/* Linha 6: Descrição */}
            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descreva as características do imóvel..."
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            {/* Linha 7: Imagens */}
            <div className="space-y-1">
              <Label className="text-xs">Fotos do Imóvel</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("image-upload")?.click()}
                className="h-8"
              >
                <Upload className="h-3 w-3 mr-2" />
                Selecionar Fotos
              </Button>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              {formData.images.length > 0 && (
                <div className="mt-2">
                  <AttachmentViewer
                    attachments={formData.images}
                    onRemove={handleRemoveImage}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}