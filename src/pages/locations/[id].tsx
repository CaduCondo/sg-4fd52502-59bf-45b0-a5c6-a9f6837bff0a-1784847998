import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Pencil, Save } from "lucide-react";
import * as locationService from "@/services/locationService";
import { Location } from "@/types";
import { applyCepMask } from "@/lib/masks";

export default function LocationDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [form, setForm] = useState({
    name: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
  });

  useEffect(() => {
    if (id && typeof id === "string") {
      loadLocation(id);
    }
  }, [id]);

  const loadLocation = async (locationId: string) => {
    try {
      setLoading(true);
      const locations = await locationService.getAll();
      const found = locations.find((l) => l.id === locationId);
      
      if (found) {
        setLocation(found);
        setForm({
          name: found.name,
          street: found.street || "",
          number: found.number || "",
          complement: found.complement || "",
          neighborhood: found.neighborhood || "",
          city: found.city,
          state: found.state,
          zip_code: found.zip_code || "",
        });
      } else {
        toast({
          title: "Erro",
          description: "Local não encontrado.",
          variant: "destructive",
        });
        router.push("/settings?tab=locations");
      }
    } catch (error) {
      console.error("Error loading location:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o local.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          street: data.logradouro || "",
          neighborhood: data.bairro || "",
          city: data.localidade || "",
          state: data.uf || "",
        }));

        toast({
          title: "CEP encontrado",
          description: "Endereço preenchido automaticamente.",
        });
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching CEP:", error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar o CEP.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!location) return;

    try {
      await locationService.updateLocation(location.id, {
        name: form.name,
        street: form.street,
        number: form.number,
        complement: form.complement,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        is_active: location.is_active,
      });

      toast({
        title: "Sucesso",
        description: "Local atualizado com sucesso.",
      });

      setIsEditing(false);
      loadLocation(location.id);
    } catch (error) {
      console.error("Error updating location:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o local.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </Layout>
    );
  }

  if (!location) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Local não encontrado.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/settings?tab=locations")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isEditing ? "Edição do Local" : "Visualização do Local"}
              </h1>
              <p className="text-muted-foreground mt-1">{location.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)} className="gap-2">
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Local</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Local</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip_code">CEP</Label>
              <Input
                id="zip_code"
                value={form.zip_code}
                onChange={(e) => {
                  const value = applyCepMask(e.target.value);
                  setForm({ ...form, zip_code: value });
                  if (value.replace(/\D/g, "").length === 8) {
                    handleCepLookup(value);
                  }
                }}
                disabled={!isEditing}
                maxLength={9}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="street">Endereço</Label>
                <Input
                  id="street"
                  value={form.street}
                  onChange={(e) => setForm({ ...form, street: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                value={form.complement}
                onChange={(e) => setForm({ ...form, complement: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Estado</Label>
              <Select
                value={form.state}
                onValueChange={(value) => setForm({ ...form, state: value })}
                disabled={!isEditing}
              >
                <SelectTrigger id="state">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AC">Acre</SelectItem>
                  <SelectItem value="AL">Alagoas</SelectItem>
                  <SelectItem value="AP">Amapá</SelectItem>
                  <SelectItem value="AM">Amazonas</SelectItem>
                  <SelectItem value="BA">Bahia</SelectItem>
                  <SelectItem value="CE">Ceará</SelectItem>
                  <SelectItem value="DF">Distrito Federal</SelectItem>
                  <SelectItem value="ES">Espírito Santo</SelectItem>
                  <SelectItem value="GO">Goiás</SelectItem>
                  <SelectItem value="MA">Maranhão</SelectItem>
                  <SelectItem value="MT">Mato Grosso</SelectItem>
                  <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                  <SelectItem value="MG">Minas Gerais</SelectItem>
                  <SelectItem value="PA">Pará</SelectItem>
                  <SelectItem value="PB">Paraíba</SelectItem>
                  <SelectItem value="PR">Paraná</SelectItem>
                  <SelectItem value="PE">Pernambuco</SelectItem>
                  <SelectItem value="PI">Piauí</SelectItem>
                  <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                  <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                  <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                  <SelectItem value="RO">Rondônia</SelectItem>
                  <SelectItem value="RR">Roraima</SelectItem>
                  <SelectItem value="SC">Santa Catarina</SelectItem>
                  <SelectItem value="SP">São Paulo</SelectItem>
                  <SelectItem value="SE">Sergipe</SelectItem>
                  <SelectItem value="TO">Tocantins</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}