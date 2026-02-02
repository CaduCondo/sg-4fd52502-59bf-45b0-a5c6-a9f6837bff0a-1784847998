import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Download, Printer, ArrowUpDown, ArrowUp, ArrowDown, Edit2, Check, X, BarChart3, DollarSign, HeartHandshake, Target, FileText } from "lucide-react";
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
import { applyMoneyMask, parseCurrencyToFloat } from "@/lib/masks";

const formatDateWithoutTimezone = (dateString: string | null): string => {
  if (!dateString) return "-";
  
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  
  return "-";
};

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
  payment_date: string | null;
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
  allowedLocationIds = [],
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
    let isMounted = true;

    const fetchData = async () => {
      if (!isAdmin) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        if (isMounted) setLoading(true);

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
            payment_date,
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

        if (statusFilter === "active") {
          filteredData = filteredData.filter(
            (item: DepositInstallmentData) => item.rental?.is_active === true
          );
        } else if (statusFilter === "inactive") {
          filteredData = filteredData.filter(
            (item: DepositInstallmentData) => item.rental?.is_active === false
          );
        }

        if (!isAdmin && allowedLocationIds.length > 0) {
          filteredData = filteredData.filter((item: DepositInstallmentData) =>
            allowedLocationIds.includes(item.rental?.property?.location_id)
          );
        }

        if (isMounted) {
          setData(filteredData);
          setLoading(false);
        }
      } catch (error) {
        console.error("❌ Erro ao buscar dados de cauções:", error);
        if (isMounted) {
          toast({
            title: "Erro ao carregar dados",
            description: "Não foi possível carregar os dados de caução.",
            variant: "destructive",
          });
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [statusFilter, isAdmin, toast]);

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
      const numericValue = parseCurrencyToFloat(value);
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

      setData(prevData =>
        prevData.map(item =>
          item.id === id
            ? { ...item, [updateField]: numericValue }
            : item
        )
      );
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
      const { error } = await supabase
        .from("deposit_installments")
        .update({ pix_code: value })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Código PIX atualizado com sucesso!",
      });

      setData(prevData =>
        prevData.map(item =>
          item.id === id ? { ...item, pix_code: value } : item
        )
      );
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
      "Data Pagamento": formatDateWithoutTimezone(item.payment_date),
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

  if (loading) {
    return (
      <ScrollReveal delay={0.6}>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Carregando dados dos cauções...</p>
          </CardContent>
        </Card>
      </ScrollReveal>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const sortedData = getSortedData();
  const groupedByRental = sortedData.reduce((acc, item) => {
    if (!acc[item.rental_id]) {
      acc[item.rental_id] = [];
    }
    acc[item.rental_id].push(item);
    return acc;
  }, {} as Record<string, DepositInstallmentData[]>);

  const uniqueRentals = Object.values(groupedByRental).map(group => group[0]);

  const totalExpected = sortedData.reduce((sum, item) => sum + item.amount, 0);
  const totalReceived = sortedData.reduce((sum, item) => {
    if (item.pix_code && item.pix_code.trim() !== "") {
      return sum + item.amount;
    }
    return sum;
  }, 0);
  
  const adminFee = uniqueRentals.reduce(
    (sum, item) =>
      sum + (item.partner_commission || 0) + (item.internal_commission || 0),
    0
  );
  
  const netRevenue = totalReceived - adminFee;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ScrollReveal delay={0.2}>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    Valor Bruto Esperado
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(totalExpected)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Soma de todos os recebimentos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Valor Bruto Recebido
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalReceived)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Todos os pagamentos recebidos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.4}>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4 text-red-600" />
                    Comissão
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(adminFee)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Soma das comissões parceiro + interno
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        <ScrollReveal delay={0.5}>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    Receita Líquida
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(netRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Receita após taxa administrativa
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>

      <ScrollReveal delay={0.6}>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <FileText className="h-6 w-6" />
                  Detalhamento dos Cauções
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="status-filter" className="text-sm font-medium">
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
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToExcel}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportar Excel
                  </Button>
                </div>
              </div>
            </div>

            {Object.keys(groupedByRental).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum dado de caução encontrado para o filtro selecionado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort("location")}
                      >
                        <div className="flex items-center">
                          Local
                          <SortIcon field="location" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort("complement")}
                      >
                        <div className="flex items-center">
                          Complemento
                          <SortIcon field="complement" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort("tenant")}
                      >
                        <div className="flex items-center">
                          Inquilino
                          <SortIcon field="tenant" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer text-right"
                        onClick={() => handleSort("rentalAmount")}
                      >
                        <div className="flex items-center justify-end">
                          Valor Aluguel
                          <SortIcon field="rentalAmount" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer text-right"
                        onClick={() => handleSort("securityDeposit")}
                      >
                        <div className="flex items-center justify-end">
                          Valor Total Caução
                          <SortIcon field="securityDeposit" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort("hasPartner")}
                      >
                        <div className="flex items-center">
                          Corretor Parceiro
                          <SortIcon field="hasPartner" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        Valor Pg Corretagem Parceiro
                      </TableHead>
                      <TableHead className="text-right">
                        Valor Pg Corretagem Interno
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSort("installment")}
                      >
                        <div className="flex items-center">
                          Parcela
                          <SortIcon field="installment" />
                        </div>
                      </TableHead>
                      <TableHead>
                        Data Pagamento
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer text-right"
                        onClick={() => handleSort("amount")}
                      >
                        <div className="flex items-center justify-end">
                          Valor Parcela
                          <SortIcon field="amount" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
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
                    {Object.entries(groupedByRental).map(([rentalId, installments]) => {
                      const firstInstallment = installments[0];
                      const rowSpan = installments.length;
                      const totalCaucaoValue = installments.reduce((sum, inst) => sum + inst.amount, 0);

                      return installments.map((installment, index) => {
                        const isPaid = installment.pix_code && installment.pix_code.trim() !== "";
                        const rowBgClass = isPaid ? "bg-green-50" : "bg-red-50";
                        
                        return (
                          <TableRow key={installment.id}>
                            {index === 0 && (
                              <>
                                <TableCell rowSpan={rowSpan} className="font-medium">
                                  <div className="max-w-[200px]">
                                    <div className="font-medium truncate">
                                      {firstInstallment.rental?.property?.location?.name || "-"}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell rowSpan={rowSpan}>
                                  <div className="text-sm text-muted-foreground truncate">
                                    {firstInstallment.rental?.property?.complement || "-"}
                                  </div>
                                </TableCell>
                                <TableCell rowSpan={rowSpan}>
                                  {firstInstallment.rental?.tenant?.name || "-"}
                                </TableCell>
                                <TableCell rowSpan={rowSpan} className="text-right">
                                  {formatCurrency((firstInstallment.rental?.monthly_rent || 0) + (firstInstallment.rental?.garage_value || 0))}
                                </TableCell>
                                <TableCell rowSpan={rowSpan} className="text-right">
                                  {formatCurrency(totalCaucaoValue)}
                                </TableCell>
                                <TableCell rowSpan={rowSpan}>
                                  {firstInstallment.rental?.has_partner_broker ? "Sim" : "Não"}
                                </TableCell>
                                <TableCell rowSpan={rowSpan} className="text-right">
                                  {editingCommission?.id === firstInstallment.id && editingCommission?.field === "partner" ? (
                                    <div className="flex items-center gap-3">
                                      <Input
                                        value={editingCommission.value}
                                        onChange={(e) => {
                                          const masked = applyMoneyMask(e.target.value);
                                          setEditingCommission({ ...editingCommission, value: masked });
                                        }}
                                        className="h-9 text-sm text-right min-w-[200px]"
                                        autoFocus
                                      />
                                      <Button
                                        size="default"
                                        variant="ghost"
                                        onClick={() => handleEditCommission(firstInstallment.id, "partner", editingCommission.value)}
                                        className="h-9 w-9 p-0 hover:bg-green-100 transition-colors"
                                        title="Salvar comissão"
                                      >
                                        <Check className="h-5 w-5 text-green-600" />
                                      </Button>
                                      <Button
                                        size="default"
                                        variant="ghost"
                                        onClick={() => setEditingCommission(null)}
                                        className="h-9 w-9 p-0 hover:bg-red-100 transition-colors"
                                        title="Cancelar edição"
                                      >
                                        <X className="h-5 w-5 text-red-600" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-3">
                                      <span className="font-medium">
                                        {formatCurrency(firstInstallment.partner_commission || 0)}
                                      </span>
                                      <Button
                                        size="default"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingCommission({
                                            id: firstInstallment.id,
                                            field: "partner",
                                            value: applyMoneyMask(String(firstInstallment.partner_commission || 0))
                                          });
                                        }}
                                        className="h-9 w-9 p-0 hover:bg-slate-100 transition-colors"
                                        title="Editar comissão"
                                      >
                                        <Edit2 className="h-5 w-5 text-slate-600" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell rowSpan={rowSpan} className="text-right">
                                  {editingCommission?.id === firstInstallment.id && editingCommission?.field === "internal" ? (
                                    <div className="flex items-center gap-3">
                                      <Input
                                        value={editingCommission.value}
                                        onChange={(e) => {
                                          const masked = applyMoneyMask(e.target.value);
                                          setEditingCommission({ ...editingCommission, value: masked });
                                        }}
                                        className="h-9 text-sm text-right min-w-[200px]"
                                        autoFocus
                                      />
                                      <Button
                                        size="default"
                                        variant="ghost"
                                        onClick={() => handleEditCommission(firstInstallment.id, "internal", editingCommission.value)}
                                        className="h-9 w-9 p-0 hover:bg-green-100 transition-colors"
                                        title="Salvar comissão"
                                      >
                                        <Check className="h-5 w-5 text-green-600" />
                                      </Button>
                                      <Button
                                        size="default"
                                        variant="ghost"
                                        onClick={() => setEditingCommission(null)}
                                        className="h-9 w-9 p-0 hover:bg-red-100 transition-colors"
                                        title="Cancelar edição"
                                      >
                                        <X className="h-5 w-5 text-red-600" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-3">
                                      <span className="font-medium">
                                        {formatCurrency(firstInstallment.internal_commission || 0)}
                                      </span>
                                      <Button
                                        size="default"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingCommission({
                                            id: firstInstallment.id,
                                            field: "internal",
                                            value: applyMoneyMask(String(firstInstallment.internal_commission || 0))
                                          });
                                        }}
                                        className="h-9 w-9 p-0 hover:bg-slate-100 transition-colors"
                                        title="Editar comissão"
                                      >
                                        <Edit2 className="h-5 w-5 text-slate-600" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </>
                            )}
                            <TableCell className={rowBgClass}>
                              {installment.installment_number}/{installment.total_installments}
                            </TableCell>
                            <TableCell className={rowBgClass}>
                              {formatDateWithoutTimezone(installment.payment_date)}
                            </TableCell>
                            <TableCell className={`text-right font-semibold text-green-600 ${rowBgClass}`}>
                              {formatCurrency(installment.amount)}
                            </TableCell>
                            <TableCell className={rowBgClass}>
                              {editingPixCode?.id === installment.id ? (
                                <div className="flex items-center gap-3">
                                  <Input
                                    value={editingPixCode.value}
                                    onChange={(e) => {
                                      setEditingPixCode({
                                        ...editingPixCode,
                                        value: e.target.value
                                      });
                                    }}
                                    placeholder="Digite o código PIX"
                                    className="h-9 text-sm border-2 border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all min-w-[250px] bg-white"
                                    autoFocus
                                  />
                                  <Button
                                    size="default"
                                    variant="ghost"
                                    onClick={() => handleEditPixCode(installment.id, editingPixCode.value)}
                                    className="h-9 w-9 p-0 hover:bg-green-100 transition-colors"
                                    title="Salvar código PIX"
                                  >
                                    <Check className="h-5 w-5 text-green-600" />
                                  </Button>
                                  <Button
                                    size="default"
                                    variant="ghost"
                                    onClick={() => setEditingPixCode(null)}
                                    className="h-9 w-9 p-0 hover:bg-red-100 transition-colors"
                                    title="Cancelar edição"
                                  >
                                    <X className="h-5 w-5 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-600 max-w-xs truncate text-sm font-mono">
                                    {installment.pix_code || "-"}
                                  </span>
                                  <Button
                                    size="default"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingPixCode({
                                        id: installment.id,
                                        value: installment.pix_code || ""
                                      });
                                    }}
                                    className="h-9 w-9 p-0 hover:bg-slate-100 transition-colors"
                                    title="Editar código PIX"
                                  >
                                    <Edit2 className="h-5 w-5 text-slate-600" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      });
                    })}
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell colSpan={4} className="text-right">
                        Totais:
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          uniqueRentals.reduce((sum, item) => {
                            const rentalInstallments = groupedByRental[item.rental_id] || [];
                            const totalCaucao = rentalInstallments.reduce((s, inst) => s + inst.amount, 0);
                            return sum + totalCaucao;
                          }, 0)
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          uniqueRentals.reduce((sum, item) => sum + (item.partner_commission || 0), 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          uniqueRentals.reduce((sum, item) => sum + (item.internal_commission || 0), 0)
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell></TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(
                          sortedData.reduce((sum, item) => sum + item.amount, 0)
                        )}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  );
}