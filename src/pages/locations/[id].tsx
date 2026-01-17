import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, MapPin } from "lucide-react";
import { configService } from "@/services/configService";
import { applyCepMask, removeMask } from "@/lib/masks";
import type { Location } from "@/types";

export default function LocationEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    cep: "",
    address: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: ""
  });

  useEffect(() => {
    if (id && typeof id === "string") {
      loadLocation(id);
    }
  }, [id]);

  const loadLocation = async (locationId: string) => {
    try {
      setLoading(true);
      const config = await configService.getConfig();
      const foundLocation = config?.locations.find((loc) => loc.id === locationId);
      
      if (foundLocation) {
        setLocation(foundLocation);
        setFormData({
          name: foundLocation.name,
          cep: foundLocation.cep || "",
          address: foundLocation.address || "",
          number: foundLocation.number || "",
          // complement: foundLocation.complement || "", // Removido
          neighborhood: foundLocation.neighborhood || "",
          city: foundLocation.city || "",
          state: foundLocation.state || ""
        });
      } else {
        toast({
          title: "Erro",
          description: "Local não encontrado",
          variant: "destructive"
        });
        router.push("/settings");
      }
    } catch (error) {
      console.error("Error loading location:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar local",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCepBlur = async () => {
    const cep = removeMask(formData.cep);
    if (cep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            address: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || ""
          }));
        }
      } catch (error) {
        console.error("Error fetching CEP:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location) return;

    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do local é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      
      const locationData = {
        name: formData.name.trim(),
        cep: removeMask(formData.cep),
        address: formData.address.trim(),
        number: formData.number.trim(),
        // complement: formData.complement.trim(), // Removido pois não existe no tipo Location
        neighborhood: formData.neighborhood.trim(),
        city: formData.city.trim(),
        state: formData.state.trim()
      };

      // Corrigindo a chamada para updateLocation que espera o objeto completo Location
      const updatedLocation: Location = {
        ...location,
        ...locationData
      };

      await configService.updateLocation(updatedLocation);

      toast({
        title: "Sucesso",
        description: "Local atualizado com sucesso!"
      });
      router.push("/settings");
      
    } catch (error) {
      console.error("Error updating location:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar local",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/settings")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Editar Local</h1>
            <p className="text-muted-foreground">
              Atualize as informações do local cadastrado
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Dados do Local
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome do Local */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Local *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Edifício Central, Condomínio Parque das Flores"
                  required
                />
              </div>

              {/* CEP */}
              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: applyCepMask(e.target.value) })}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>

              {/* Endereço e Número */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    placeholder="123"
                  />
                </div>
              </div>

              {/* Complemento - Removido temporariamente pois não existe no tipo */}
              {/* Bairro */}
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  placeholder="Nome do bairro"
                />
              </div>

              {/* Cidade e Estado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Nome da cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/settings")}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}