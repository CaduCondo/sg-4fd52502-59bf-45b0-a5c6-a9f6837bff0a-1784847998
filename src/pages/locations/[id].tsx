import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { getLocationById, updateLocation } from "@/services/locationService";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save } from "lucide-react";
import { applyCepMask } from "@/lib/masks";

export default function ViewLocation() {
  const router = useRouter();
  const { id } = router.query;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [location, setLocation] = useState({
    name: "",
    zip_code: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: ""
  });

  useEffect(() => {
    if (id) {
      loadLocation();
    }
  }, [id]);

  const loadLocation = async () => {
    try {
      setIsLoading(true);
      const data = await getLocationById(id as string);
      
      setLocation({
        name: data.name || "",
        zip_code: data.zip_code || "",
        street: data.street || "",
        number: data.number || "",
        complement: data.complement || "",
        neighborhood: data.neighborhood || "",
        city: data.city || "",
        state: data.state || ""
      });
    } catch (error) {
      console.error("Error loading location:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do local.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    try {
      await updateLocation(id as string, {
        name: location.name,
        zip_code: location.zip_code,
        street: location.street,
        number: location.number,
        complement: location.complement,
        neighborhood: location.neighborhood,
        city: location.city,
        state: location.state
      });

      toast({
        title: "Sucesso",
        description: "Local atualizado com sucesso."
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating location:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar local.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? "Edição do Local" : "Visualização do Local"}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Local</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Local</Label>
                <Input
                  id="name"
                  value={location.name}
                  onChange={(e) => setLocation({ ...location, name: e.target.value })}
                  placeholder="Ex: Condomínio Solar"
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP</Label>
                <Input
                  id="zip_code"
                  value={location.zip_code}
                  onChange={(e) => setLocation({ ...location, zip_code: applyCepMask(e.target.value) })}
                  placeholder="00000-000"
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">Rua/Logradouro</Label>
                <Input
                  id="street"
                  value={location.street}
                  onChange={(e) => setLocation({ ...location, street: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={location.number}
                    onChange={(e) => setLocation({ ...location, number: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={location.complement}
                    onChange={(e) => setLocation({ ...location, complement: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={location.neighborhood}
                  onChange={(e) => setLocation({ ...location, neighborhood: e.target.value })}
                  disabled={!isEditing}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={location.city}
                    onChange={(e) => setLocation({ ...location, city: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado (UF)</Label>
                  <Input
                    id="state"
                    value={location.state}
                    onChange={(e) => setLocation({ ...location, state: e.target.value })}
                    maxLength={2}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              {!isEditing ? (
                <>
                  <Button variant="outline" onClick={() => router.back()}>
                    Fechar
                  </Button>
                  <Button onClick={() => setIsEditing(true)}>
                    Editar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}