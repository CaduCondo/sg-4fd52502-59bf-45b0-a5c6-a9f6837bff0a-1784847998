import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Download, Printer, Check } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

interface RentalData {
  id: string;
  security_deposit: number;
  monthly_rent: number;
  garage_value: number;
  has_partner_broker: boolean;
  status: string;
  tenant: {
    name: string;
  };
  property: {
    complement: string;
    location: {
      name: string;
    };
  };
}

interface DepositInstallmentsTableProps {
  userRole: string;
  allowedLocationIds?: string[];
}

export function DepositInstallmentsTable({
  userRole,
  allowedLocationIds = [],
}: DepositInstallmentsTableProps) {
  const [data, setData] = useState<RentalData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const isAdmin = userRole === "admin";

  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("🔍 === INÍCIO BUSCA CAUÇÕES ===");

        const { data: rentalsData, error } = await supabase
          .from("rentals")
          .select(`
            id,
            security_deposit,
            monthly_rent,
            garage_value,
            has_partner_broker,
            status,
            tenant:tenants(name),
            property:properties(
              complement,
              location:locations(name)
            )
          `)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("❌ Erro na query:", error);
          throw error;
        }

        console.log("✅ Query executada com sucesso");
        console.log("📊 Total de rentals:", rentalsData?.length || 0);

        if (!rentalsData || rentalsData.length === 0) {
          console.log("⚠️ Nenhum rental encontrado");
          setData([]);
          setLoading(false);
          return;
        }

        const mappedData: RentalData[] = rentalsData.map((rental) => ({
          id: rental.id,
          security_deposit: rental.security_deposit || 0,
          monthly_rent: rental.monthly_rent || 0,
          garage_value: rental.garage_value || 0,
          has_partner_broker: rental.has_partner_broker || false,
          status: rental.status,
          tenant: {
            name: rental.tenant?.name || "Sem inquilino"
          },
          property: {
            complement: rental.property?.complement || "Sem complemento",
            location: {
              name: rental.property?.location?.name || "Sem localização"
            }
          }
        }));

        console.log("✅ Dados mapeados:", mappedData.length);
        setData(mappedData);
        setLoading(false);
      } catch (error) {
        console.error("❌ Erro ao buscar dados:", error);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados de caução.",
          variant: "destructive",
        });
        setData([]);
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, toast]);

  const exportToExcel = () => {
    const excelData = data.map((rental) => ({
      Local: rental.property?.location?.name || "-",
      Complemento: rental.property?.complement || "-",
      Inquilino: rental.tenant?.name || "-",
      "Valor Aluguel": (rental.monthly_rent || 0) + (rental.garage_value || 0),
      "Valor Total Caução": rental.security_deposit || 0,
      "Corretor Parceiro": rental.has_partner_broker ? "Sim" : "Não",
      Status: rental.status === "active" ? "Ativa" : "Devolvida",
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cauções");

    const today = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `Detalhamento_Caucoes_${today}.xlsx`);

    toast({
      title: "Sucesso",
      description: "Planilha exportada com sucesso!",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando dados...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Acesso restrito a administradores.
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Nenhum dado de caução encontrado.
        </CardContent>
      </Card>
    );
  }

  const activeRentals = data.filter(r => r.status === "active");
  const inactiveRentals = data.filter(r => r.status === "terminated");

  const totalExpected = data.reduce((acc, curr) => acc + (curr.security_deposit || 0), 0);
  const totalReceived = totalExpected;
  const adminCommission = totalExpected * 0.10;
  const netRevenue = totalReceived - adminCommission;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Valor Bruto Esperado</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalExpected)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Valor Bruto Recebido</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceived)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Comissão</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(adminCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Receita Líquida</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(netRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
        <Button variant="outline" size="sm" onClick={exportToExcel} className="gap-2">
          <Download className="h-4 w-4" /> Exportar Excel
        </Button>
      </div>

      {/* Tabela de Cauções Ativos */}
      {activeRentals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-6 w-6 text-green-600" />
              Detalhamento dos Cauções - LOCAÇÕES ATIVAS ({activeRentals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Local</TableHead>
                    <TableHead>Complemento</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead className="text-right">Valor Aluguel</TableHead>
                    <TableHead className="text-right">Valor Total Caução</TableHead>
                    <TableHead>Corretor Parceiro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeRentals.map((rental) => (
                    <TableRow key={rental.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-[150px] truncate" title={rental.property?.location?.name}>
                          {rental.property?.location?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[100px] truncate" title={rental.property?.complement}>
                          {rental.property?.complement || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[120px] truncate" title={rental.tenant?.name}>
                          {rental.tenant?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency((rental.monthly_rent || 0) + (rental.garage_value || 0))}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(rental.security_deposit || 0)}
                      </TableCell>
                      <TableCell>
                        {rental.has_partner_broker ? "Sim" : "Não"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Cauções Devolvidos */}
      {inactiveRentals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-6 w-6 text-blue-600" />
              Detalhamento dos Cauções - LOCAÇÕES INATIVAS/FINALIZADAS ({inactiveRentals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Local</TableHead>
                    <TableHead>Complemento</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead className="text-right">Valor Aluguel</TableHead>
                    <TableHead className="text-right">Valor Total Caução</TableHead>
                    <TableHead>Corretor Parceiro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inactiveRentals.map((rental) => (
                    <TableRow key={rental.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-[150px] truncate" title={rental.property?.location?.name}>
                          {rental.property?.location?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[100px] truncate" title={rental.property?.complement}>
                          {rental.property?.complement || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[120px] truncate" title={rental.tenant?.name}>
                          {rental.tenant?.name || "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency((rental.monthly_rent || 0) + (rental.garage_value || 0))}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        {formatCurrency(rental.security_deposit || 0)}
                      </TableCell>
                      <TableCell>
                        {rental.has_partner_broker ? "Sim" : "Não"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}