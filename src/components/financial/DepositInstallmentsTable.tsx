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
import { Download, Printer, ArrowUpDown, ArrowUp, ArrowDown, Edit2, Check, X, BarChart3, DollarSign, HeartHandshake, Target } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  const [editingPixCode, setEditingPixCode] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const { toast } = useToast();

  const isAdmin = userRole === "admin";

  useEffect(() => {
    fetchData();
  }, [statusFilter, JSON.stringify(allowedLocationIds)]);

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

  const handleEditPixCode = async (id: string, value: string) => {
    try {
      const item = data.find(d => d.id === id);
      if (!item) return;

      const { error } = await supabase
        .from("deposit_installments")
        .update({ pix_code: value })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Código PIX atualizado com sucesso!",
      });

      fetchData();
      setEditingPixCode(null);
    } catch (error) {
      console.error("Erro ao atualizar código PIX:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o código PIX.",
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
      return <ArrowUpDown className="h-4 w-4 ml-1 text-slate-400" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-4 w-4 ml-1 text-blue-600" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="h-4 w-4 ml-1 text-blue-600" />;
    }
    return <ArrowUpDown className="h-4 w-4 ml-1 text-slate-400" />;
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
      <ScrollReveal delay={0.6}>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Carregando...</p>
          </CardContent>
        </Card>
      </ScrollReveal>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de totais - apenas para admin */}
      {isAdmin && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Valor Bruto Esperado */}
          <ScrollReveal delay={0.2}>
            <Card className="border-blue-100 bg-blue-50/30 shadow-sm h-full">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Valor Bruto Esperado</span>
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">
                    {formatCurrency(totalExpected)}
                  </div>
                  <p className="text-xs text-blue-500 mt-1">Soma de todos os recebimentos</p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Card 2: Valor Bruto Recebido */}
          <ScrollReveal delay={0.3}>
            <Card className="border-green-100 bg-green-50/30 shadow-sm h-full">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Valor Bruto Recebido</span>
                </div>
                <div>
                  <div className="text-3xl font-bold text-slate-900">
                    {formatCurrency(totalReceived)}
                  </div>
                  <p className="text-xs text-green-600 mt-1">Todos os pagamentos recebidos</p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Card 3: Taxa de Administração */}
          <ScrollReveal delay={0.4}>
            <Card className="border-purple-100 bg-purple-50/30 shadow-sm h-full">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <HeartHandshake className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-600">Taxa de</span>
                    <span className="text-sm font-medium text-slate-600">Administração</span>
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-900">
                    {formatCurrency(adminFee)}
                  </div>
                  <p className="text-xs text-purple-600 mt-1">Comissões totais</p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

          {/* Card 4: Receita Líquida */}
          <ScrollReveal delay={0.5}>
            <Card className="border-indigo-100 bg-indigo-50/30 shadow-sm h-full">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Target className="h-5 w-5 text-indigo-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-600">Receita Líquida</span>
                </div>
                <div>
                  <div className="text-3xl font-bold text-indigo-900">
                    {formatCurrency(netRevenue)}
                  </div>
                  <p className="text-xs text-indigo-600 mt-1">Receita após taxa administrativa</p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      )}

      {/* Tabela */}
      <ScrollReveal delay={0.6}>
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-white pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle className="text-base font-medium text-slate-700">
                Detalhamento dos Cauções
              </CardTitle>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="status-filter" className="text-sm font-medium text-slate-700">
                    Status Locação
                  </Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value: "active" | "inactive" | "all") => setStatusFilter(value)}
                  >
                    <SelectTrigger id="status-filter" className="w-[180px]">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="inactive">Inativos</SelectItem>
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrint}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={exportToExcel}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      onClick={() => handleSort("location")}
                    >
                      <div className="flex items-center">
                        Local
                        <SortIcon field="location" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      onClick={() => handleSort("complement")}
                    >
                      <div className="flex items-center">
                        Complemento
                        <SortIcon field="complement" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      onClick={() => handleSort("tenant")}
                    >
                      <div className="flex items-center">
                        Inquilino
                        <SortIcon field="tenant" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      onClick={() => handleSort("rentalAmount")}
                    >
                      <div className="flex items-center">
                        Valor Aluguel
                        <SortIcon field="rentalAmount" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      onClick={() => handleSort("securityDeposit")}
                    >
                      <div className="flex items-center">
                        Valor Total Caução
                        <SortIcon field="securityDeposit" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      onClick={() => handleSort("hasPartner")}
                    >
                      <div className="flex items-center">
                        Corretor Parceiro?
                        <SortIcon field="hasPartner" />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Valor Pg Corretagem Parceiro
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Valor Pg Corretagem Interno
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      onClick={() => handleSort("installment")}
                    >
                      <div className="flex items-center">
                        Parcela
                        <SortIcon field="installment" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      onClick={() => handleSort("amount")}
                    >
                      <div className="flex items-center">
                        Valor Parcela
                        <SortIcon field="amount" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider"
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
                  {sortedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="h-24 text-center text-slate-500">
                        Nenhum registro encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {Object.values(groupedByRental).map((group) =>
                        group.map((item, index) => (
                          <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                            {/* Colunas mescladas - renderizadas apenas na primeira linha do grupo */}
                            {index === 0 && (
                              <>
                                <TableCell
                                  rowSpan={group.length}
                                  className="align-top font-medium text-slate-900"
                                >
                                  {item.rental?.property?.location?.name || "-"}
                                </TableCell>
                                <TableCell rowSpan={group.length} className="align-top text-slate-600">
                                  {item.rental?.property?.complement || "-"}
                                </TableCell>
                                <TableCell rowSpan={group.length} className="align-top text-slate-600">
                                  {item.rental?.tenant?.name || "-"}
                                </TableCell>
                                <TableCell rowSpan={group.length} className="align-top font-medium text-slate-900">
                                  {formatCurrency(
                                    (item.rental?.monthly_rent || 0) +
                                      (item.rental?.garage_value || 0)
                                  )}
                                </TableCell>
                                <TableCell rowSpan={group.length} className="align-top font-medium text-slate-900">
                                  {formatCurrency(item.rental?.security_deposit || 0)}
                                </TableCell>
                                <TableCell rowSpan={group.length} className="align-top text-slate-600">
                                  {item.rental?.has_partner_broker ? "Sim" : "Não"}
                                </TableCell>
                                <TableCell rowSpan={group.length} className="align-top">
                                  {editingCommission?.id === item.id &&
                                  editingCommission?.field === "partner" ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="text"
                                        className="w-32 h-8 text-xs"
                                        value={editingCommission.value}
                                        onChange={(e) => {
                                          const value = e.target.value.replace(/[^\d.,]/g, '');
                                          setEditingCommission({
                                            ...editingCommission,
                                            value: value,
                                          });
                                        }}
                                        placeholder="0,00"
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
                                      <span className="font-medium text-slate-900">
                                        {formatCurrency(item.partner_commission || 0)}
                                      </span>
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
                                      <Input
                                        type="text"
                                        className="w-32 h-8 text-xs"
                                        value={editingCommission.value}
                                        onChange={(e) => {
                                          const value = e.target.value.replace(/[^\d.,]/g, '');
                                          setEditingCommission({
                                            ...editingCommission,
                                            value: value,
                                          });
                                        }}
                                        placeholder="0,00"
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
                                      <span className="font-medium text-slate-900">
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
                            <TableCell className="font-medium text-slate-900">
                              {item.installment_number}/{item.total_installments}
                            </TableCell>
                            <TableCell className="font-medium text-slate-900">
                              {formatCurrency(item.amount)}
                            </TableCell>
                            <TableCell>
                              {editingPixCode?.id === item.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editingPixCode.value}
                                    onChange={(e) =>
                                      setEditingPixCode({
                                        ...editingPixCode,
                                        value: e.target.value,
                                      })
                                    }
                                    placeholder="Código PIX"
                                    className="h-8 text-xs min-w-[200px]"
                                    autoFocus
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleEditPixCode(item.id, editingPixCode.value)
                                    }
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingPixCode(null)}
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="max-w-xs truncate text-slate-600">
                                    {item.pix_code || "-"}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setEditingPixCode({
                                        id: item.id,
                                        value: item.pix_code || "",
                                      })
                                    }
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}

                      {/* Linha de totais */}
                      <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <TableCell colSpan={9} className="text-right text-slate-900 uppercase tracking-wide">
                          Total:
                        </TableCell>
                        <TableCell className="text-slate-900 text-lg">{formatCurrency(totalAmountColumn)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  );
}