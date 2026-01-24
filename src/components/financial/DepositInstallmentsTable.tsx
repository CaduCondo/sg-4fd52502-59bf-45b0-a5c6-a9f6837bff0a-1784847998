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
import { Download, Printer, ArrowUpDown, Edit2, Check, X } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

interface DepositInstallmentData {
  id: string;
  rental_id: string;
  installment_number: number;
  total_installments: number;
  installment_total: number;
  amount: number;
  pix_code: string | null;
  partner_commission: number;
  internal_commission: number;
  rental: {
    has_partner_broker: boolean;
    security_deposit: number;
    is_active: boolean;
    property_id: string;
    monthly_rent: number;
    garage_value: number | null;
    tenant: {
      name: string;
    };
    property: {
      complement: string;
      location_id: string;
      location: {
        name: string;
      };
    };
  };
}

type SortField =
  | "location"
  | "complement"
  | "tenant"
  | "rentalAmount"
  | "securityDeposit"
  | "hasPartner"
  | "installment"
  | "amount"
  | "pixCode";
type SortDirection = "asc" | "desc" | null;

interface DepositInstallmentsTableProps {
  userRole: string;
  allowedLocationIds?: string[];
}

export function DepositInstallmentsTable({
  userRole,
  allowedLocationIds,
}: DepositInstallmentsTableProps) {
  const [data, setData] = useState<DepositInstallmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [editingCommission, setEditingCommission] = useState<{
    id: string;
    field: "partner" | "internal";
    value: string;
  } | null>(null);
  const { toast } = useToast();

  const isAdmin = userRole === "admin";

  useEffect(() => {
    fetchData();
  }, [statusFilter, allowedLocationIds]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const query = supabase
        .from("deposit_installments")
        .select(
          `
          id,
          installment_number,
          total_installments,
          installment_total,
          amount,
          pix_code,
          partner_commission,
          internal_commission,
          rental_id,
          rental:rentals(
            has_partner_broker,
            security_deposit,
            is_active,
            property_id,
            monthly_rent,
            garage_value,
            tenant:tenants(name),
            property:properties(
              complement,
              location_id,
              location:locations(name)
            )
          )
        `
        )
        .order("created_at", { ascending: false });

      const { data: installments, error } = await query;

      if (error) throw error;

      let filteredData = installments || [];

      // Filtro de status
      if (statusFilter === "active") {
        filteredData = filteredData.filter(
          (item: DepositInstallmentData) => item.rental?.is_active === true
        );
      } else if (statusFilter === "inactive") {
        filteredData = filteredData.filter(
          (item: DepositInstallmentData) => item.rental?.is_active === false
        );
      }

      // Filtro de localização para não-admin
      if (!isAdmin && allowedLocationIds && allowedLocationIds.length > 0) {
        filteredData = filteredData.filter((item: DepositInstallmentData) =>
          allowedLocationIds.includes(item.rental?.property?.location_id)
        );
      }

      setData(filteredData);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados de caução.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortedData = () => {
    if (!sortField || !sortDirection) return data;

    const sorted = [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "location":
          aValue = a.rental?.property?.location?.name || "";
          bValue = b.rental?.property?.location?.name || "";
          break;
        case "complement":
          aValue = a.rental?.property?.complement || "";
          bValue = b.rental?.property?.complement || "";
          break;
        case "tenant":
          aValue = a.rental?.tenant?.name || "";
          bValue = b.rental?.tenant?.name || "";
          break;
        case "rentalAmount":
          aValue = (a.rental?.monthly_rent || 0) + (a.rental?.garage_value || 0);
          bValue = (b.rental?.monthly_rent || 0) + (b.rental?.garage_value || 0);
          break;
        case "securityDeposit":
          aValue = a.rental?.security_deposit || 0;
          bValue = b.rental?.security_deposit || 0;
          break;
        case "hasPartner":
          aValue = a.rental?.has_partner_broker ? 1 : 0;
          bValue = b.rental?.has_partner_broker ? 1 : 0;
          break;
        case "installment":
          aValue = a.installment_number;
          bValue = b.installment_number;
          break;
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "pixCode":
          aValue = a.pix_code || "";
          bValue = b.pix_code || "";
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  };

  const handleEditCommission = async (
    id: string,
    field: "partner" | "internal",
    value: string
  ) => {
    try {
      const numericValue = parseFloat(value) || 0;
      const updateField =
        field === "partner" ? "partner_commission" : "internal_commission";

      const { error } = await supabase
        .from("deposit_installments")
        .update({ [updateField]: numericValue })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Comissão atualizada com sucesso!",
      });

      fetchData();
      setEditingCommission(null);
    } catch (error) {
      console.error("Erro ao atualizar comissão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a comissão.",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    const sortedData = getSortedData();

    const excelData = sortedData.map((item) => ({
      Local: item.rental?.property?.location?.name || "-",
      Complemento: item.rental?.property?.complement || "-",
      Inquilino: item.rental?.tenant?.name || "-",
      "Valor Aluguel": (item.rental?.monthly_rent || 0) + (item.rental?.garage_value || 0),
      "Valor Total Caução": item.rental?.security_deposit || 0,
      "Corretor Parceiro": item.rental?.has_partner_broker ? "Sim" : "Não",
      "Valor Pg Corretagem Parceiro": item.partner_commission || 0,
      "Valor Pg Corretagem Interno": item.internal_commission || 0,
      Parcela: `${item.installment_number}/${item.total_installments}`,
      "Valor Parcela": item.amount,
      "Código PIX": item.pix_code || "-",
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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    return (
      <ArrowUpDown
        className={`ml-2 h-4 w-4 ${
          sortDirection === "asc" ? "rotate-180" : ""
        }`}
      />
    );
  };

  const sortedData = getSortedData();

  // Agrupar por rental_id
  const groupedByRental = sortedData.reduce((acc, item) => {
    if (!acc[item.rental_id]) {
      acc[item.rental_id] = [];
    }
    acc[item.rental_id].push(item);
    return acc;
  }, {} as Record<string, DepositInstallmentData[]>);

  // Calcular totais para os cards (apenas admin)
  const totalExpected = sortedData.reduce((sum, item) => sum + item.amount, 0);
  const totalReceived = sortedData.reduce((sum, item) => {
    if (item.pix_code && item.pix_code.trim() !== "") {
      return sum + item.amount;
    }
    return sum;
  }, 0);
  const adminFee = sortedData.reduce(
    (sum, item) =>
      sum + (item.partner_commission || 0) + (item.internal_commission || 0),
    0
  );
  const netRevenue = totalReceived - adminFee;

  // Total da coluna Valor Parcela
  const totalAmountColumn = sortedData.reduce((sum, item) => sum + item.amount, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de totais - apenas para admin */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Bruto Esperado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalExpected)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Bruto Recebido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(totalReceived)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Administração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(adminFee)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receita Líquida
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(netRevenue)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Detalhamento dos Cauções</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                >
                  Ativas
                </Button>
                <Button
                  variant={statusFilter === "inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("inactive")}
                >
                  Inativas
                </Button>
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Todas
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("location")}
                  >
                    <div className="flex items-center">
                      Local
                      <SortIcon field="location" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("complement")}
                  >
                    <div className="flex items-center">
                      Complemento
                      <SortIcon field="complement" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("tenant")}
                  >
                    <div className="flex items-center">
                      Inquilino
                      <SortIcon field="tenant" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("rentalAmount")}
                  >
                    <div className="flex items-center">
                      Valor Aluguel
                      <SortIcon field="rentalAmount" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("securityDeposit")}
                  >
                    <div className="flex items-center">
                      Valor Total Caução
                      <SortIcon field="securityDeposit" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("hasPartner")}
                  >
                    <div className="flex items-center">
                      Corretor Parceiro?
                      <SortIcon field="hasPartner" />
                    </div>
                  </TableHead>
                  <TableHead>Valor Pg Corretagem Parceiro</TableHead>
                  <TableHead>Valor Pg Corretagem Interno</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("installment")}
                  >
                    <div className="flex items-center">
                      Parcela
                      <SortIcon field="installment" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center">
                      Valor Parcela
                      <SortIcon field="amount" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("pixCode")}
                  >
                    <div className="flex items-center">
                      Código PIX
                      <SortIcon field="pixCode" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(groupedByRental).map((group) =>
                  group.map((item, index) => (
                    <TableRow key={item.id}>
                      {/* Colunas mescladas - renderizadas apenas na primeira linha do grupo */}
                      {index === 0 && (
                        <>
                          <TableCell
                            rowSpan={group.length}
                            className="align-top font-medium"
                          >
                            {item.rental?.property?.location?.name || "-"}
                          </TableCell>
                          <TableCell rowSpan={group.length} className="align-top">
                            {item.rental?.property?.complement || "-"}
                          </TableCell>
                          <TableCell rowSpan={group.length} className="align-top">
                            {item.rental?.tenant?.name || "-"}
                          </TableCell>
                          <TableCell rowSpan={group.length} className="align-top">
                            {formatCurrency(
                              (item.rental?.monthly_rent || 0) +
                                (item.rental?.garage_value || 0)
                            )}
                          </TableCell>
                          <TableCell rowSpan={group.length} className="align-top">
                            {formatCurrency(item.rental?.security_deposit || 0)}
                          </TableCell>
                          <TableCell rowSpan={group.length} className="align-top">
                            {item.rental?.has_partner_broker ? "Sim" : "Não"}
                          </TableCell>
                          <TableCell rowSpan={group.length} className="align-top">
                            {editingCommission?.id === item.id &&
                            editingCommission?.field === "partner" ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-24 px-2 py-1 border rounded"
                                  value={editingCommission.value}
                                  onChange={(e) =>
                                    setEditingCommission({
                                      ...editingCommission,
                                      value: e.target.value,
                                    })
                                  }
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleEditCommission(
                                      item.id,
                                      "partner",
                                      editingCommission.value
                                    )
                                  }
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingCommission(null)}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{formatCurrency(item.partner_commission || 0)}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setEditingCommission({
                                      id: item.id,
                                      field: "partner",
                                      value: (item.partner_commission || 0).toString(),
                                    })
                                  }
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell rowSpan={group.length} className="align-top">
                            {editingCommission?.id === item.id &&
                            editingCommission?.field === "internal" ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  className="w-24 px-2 py-1 border rounded"
                                  value={editingCommission.value}
                                  onChange={(e) =>
                                    setEditingCommission({
                                      ...editingCommission,
                                      value: e.target.value,
                                    })
                                  }
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    handleEditCommission(
                                      item.id,
                                      "internal",
                                      editingCommission.value
                                    )
                                  }
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingCommission(null)}
                                >
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>
                                  {formatCurrency(item.internal_commission || 0)}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setEditingCommission({
                                      id: item.id,
                                      field: "internal",
                                      value: (item.internal_commission || 0).toString(),
                                    })
                                  }
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </>
                      )}

                      {/* Colunas individuais - renderizadas em todas as linhas */}
                      <TableCell>
                        {item.installment_number}/{item.total_installments}
                      </TableCell>
                      <TableCell>{formatCurrency(item.amount)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {item.pix_code || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}

                {/* Linha de totais */}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={9} className="text-right">
                    Total:
                  </TableCell>
                  <TableCell>{formatCurrency(totalAmountColumn)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}