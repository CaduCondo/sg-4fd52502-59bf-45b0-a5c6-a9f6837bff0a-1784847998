import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, MapPin } from "lucide-react";
import { getLocationById, updateLocation, deleteLocation } from "@/services/locationService";
import { applyCepMask, removeMask } from "@/lib/masks";
import type { Location } from "@/types";

export default function LocationEditPage() {
  const router = useRouter();
  const { id } = router.query;
  const isNew = id === "new";
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    cep: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: ""
  });

  useEffect(() => {
    if (id && !isNew && typeof id === "string") {
      loadLocation();
    }
  }, [id, isNew]);

  const loadLocation = async () => {
    try {
      if (id) {
        const data = await getLocationById(id as string);
        setLocation(data);
        setFormData({
          name: data.name,
          city: data.city,
          state: data.state,
          address: data.address || "",
          zipCode: data.zipCode || ""
        });
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
            street: data.logradouro || "",
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
    
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome do local é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!formData.city.trim() || !formData.state.trim()) {
      toast({
        title: "Erro",
        description: "Cidade e Estado são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);
      
      const locationData = {
        name: formData.name.trim(),
        zip_code: removeMask(formData.cep),
        street: formData.street.trim(),
        number: formData.number.trim(),
        complement: formData.complement.trim(),
        neighborhood: formData.neighborhood.trim(),
        city: formData.city.trim(),
        state: formData.state.trim().toUpperCase()
      };

      if (isNew) {
        await locationService.create(locationData);
        toast({ title: "Sucesso", description: "Local criado com sucesso!" });
      } else {
        await updateLocation(id as string, {
          ...formData,
          // map legacy fields if needed
        });
        toast({ title: "Sucesso", description: "Local atualizado com sucesso!" });
      }

      router.push("/locations");
      
    } catch (error) {
      console.error("Error saving location:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar local",
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
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
            onClick={() => router.push("/locations")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isNew ? "Novo Local" : "Editar Local"}</h1>
            <p className="text-muted-foreground">
              {isNew ? "Cadastre uma nova região de atuação" : "Atualize as informações do local"}
            </p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              Dados do Local
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Nome do Local */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Local / Condomínio *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Edifício Central, Jd. das Flores"
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
                  <Label htmlFor="street">Endereço</Label>
                  <Input
                    id="street"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
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

              {/* Complemento e Bairro */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    placeholder="Bloco A, Apto 101"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                    placeholder="Nome do bairro"
                  />
                </div>
              </div>

              {/* Cidade e Estado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Nome da cidade"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                    placeholder="UF"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/locations")}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Salvando..." : (isNew ? "Criar Local" : "Salvar Alterações")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}