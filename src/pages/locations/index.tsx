import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  MapPin, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Map,
  Filter
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { locationService } from "@/services/locationService";
import type { Location } from "@/types";

export default function LocationsList() {
  const router = useRouter();
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const data = await locationService.getAll();
      setLocations(data);
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de locais.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover o local "${name}"?`)) return;

    try {
      await locationService.delete(id);
      toast({
        title: "Sucesso",
        description: "Local removido com sucesso!",
      });
      loadLocations();
    } catch (error) {
      console.error("Erro ao deletar local:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover local.",
        variant: "destructive",
      });
    }
  };

  const filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.state.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <MapPin className="h-8 w-8 text-emerald-600" />
              Locais
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as regiões e locais de atuação da imobiliária
            </p>
          </div>
          
          <Link href="/locations/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" />
              Novo Local
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>Locais Cadastrados</CardTitle>
                <CardDescription>
                  {locations.length} locais ativos no sistema
                </CardDescription>
              </div>
              
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, cidade ou estado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Local</TableHead>
                    <TableHead>Cidade/UF</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Carregando locais...
                      </TableCell>
                    </TableRow>
                  ) : filteredLocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Nenhum local encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLocations.map((location) => (
                      <TableRow key={location.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Map className="h-4 w-4 text-slate-400" />
                            {location.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {location.city} - {location.state}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {location.street}
                          {location.number ? `, ${location.number}` : ""}
                          {location.neighborhood ? ` - ${location.neighborhood}` : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/locations/${location.id}`}>
                              <Button variant="ghost" size="icon" title="Editar">
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Excluir"
                              onClick={() => handleDelete(location.id, location.name)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}