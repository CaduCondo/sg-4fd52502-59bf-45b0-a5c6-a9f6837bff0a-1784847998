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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Check, 
  Edit2, 
  X, 
  Printer, 
  FileSpreadsheet, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  BarChart3,
  DollarSign,
  HeartHandshake,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/masks";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import * as XLSX from "xlsx";
import { ScrollReveal } from "@/components/animations/ScrollReveal";

interface DepositInstallmentData {
  id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  pix_code: string | null;
  partner_commission: number;
  internal_commission: number;
  rental_id: string;
  rental: {
    has_partner_broker: boolean;
    security_deposit: number;
    is_active: boolean;
    property_id: string;
    location_id: string;
    rental_amount: number;
    parking_spot_amount: number | null;
    tenant: {
      name: string;
    };
    property: {
      complement: string;
      location: {
        name: string;
      };
    };
  };
}

type SortField = "local" | "complement" | "tenant" | "rentalAmount" | "installment" | "securityDeposit" | "hasPartner" | "amount" | "partnerCommission" | "internalCommission";
type SortDirection = "asc" | "desc" | null;

export function DepositInstallmentsTable() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [installments, setInstallments] = useState<DepositInstallmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPixId, setEditingPixId] = useState<string | null>(null);
  const [editPixCode, setEditPixCode] = useState("");
  const [editingPartnerCommissionId, setEditingPartnerCommissionId] = useState<string | null>(null);
  const [editPartnerCommission, setEditPartnerCommission] = useState("");
  const [editingInternalCommissionId, setEditingInternalCommissionId] = useState<string | null>(null);
  const [editInternalCommission, setEditInternalCommission] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  useEffect(() => {
    fetchInstallments();
  }, []);

  const fetchInstallments = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("deposit_installments")
        .select(`
          id,
          installment_number,
          total_installments,
          installment_total,
          amount,
          pix_code,
          partner_commission,
          internal_commission,
          rental_id,
          rental:rentals (
            has_partner_broker,
            security_deposit,
            is_active,
            property_id,
            rental_amount,
            parking_spot_amount,
            tenant:tenants (
              name
            ),
            property:properties (
              complement,
              location_id,
              location:locations (
                name
              )
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        installment_number: item.installment_number,
        total_installments: item.total_installments || item.installment_total,
        amount: item.amount,
        pix_code: item.pix_code,
        partner_commission: item.partner_commission || 0,
        internal_commission: item.internal_commission || 0,
        rental_id: item.rental_id,
        rental: {
          has_partner_broker: item.rental?.has_partner_broker,
          security_deposit: item.rental?.security_deposit,
          is_active: item.rental?.is_active ?? true,
          property_id: item.rental?.property_id,
          location_id: item.rental?.property?.location_id,
          rental_amount: item.rental?.rental_amount || 0,
          parking_spot_amount: item.rental?.parking_spot_amount || 0,
          tenant: {
            name: item.rental?.tenant?.name || "N/A"
          },
          property: {
            complement: item.rental?.property?.complement || "",
            location: {
              name: item.rental?.property?.location?.name || "N/A"
            }
          }
        }
      }));

      setInstallments(formattedData);
    } catch (error) {
      console.error("Erro ao buscar parcelas do caução:", error);
    } finally {
      setLoading(false);
    }
  };

  const startEditingPix = (id: string, currentCode: string | null) => {
    setEditingPixId(id);
    setEditPixCode(currentCode || "");
  };

  const cancelEditingPix = () => {
    setEditingPixId(null);
    setEditPixCode("");
  };

  const savePixCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from("deposit_installments")
        .update({ pix_code: editPixCode })
        .eq("id", id);

      if (error) throw error;

      setInstallments((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, pix_code: editPixCode } : item
        )
      );

      toast({
        title: "Sucesso",
        description: "Código PIX atualizado.",
      });
      
      setEditingPixId(null);
    } catch (error) {
      console.error("Erro ao salvar PIX:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o código PIX.",
        variant: "destructive",
      });
    }
  };

  const startEditingPartnerCommission = (id: string, currentValue: number) => {
    setEditingPartnerCommissionId(id);
    setEditPartnerCommission(currentValue.toString());
  };

  const cancelEditingPartnerCommission = () => {
    setEditingPartnerCommissionId(null);
    setEditPartnerCommission("");
  };

  const savePartnerCommission = async (id: string) => {
    try {
      const value = parseFloat(editPartnerCommission) || 0;
      
      const { error } = await supabase
        .from("deposit_installments")
        .update({ partner_commission: value })
        .eq("id", id);

      if (error) throw error;

      setInstallments((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, partner_commission: value } : item
        )
      );

      toast({
        title: "Sucesso",
        description: "Valor da corretagem parceiro atualizado.",
      });
      
      setEditingPartnerCommissionId(null);
    } catch (error) {
      console.error("Erro ao salvar corretagem parceiro:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o valor.",
        variant: "destructive",
      });
    }
  };

  const startEditingInternalCommission = (id: string, currentValue: number) => {
    setEditingInternalCommissionId(id);
    setEditInternalCommission(currentValue.toString());
  };

  const cancelEditingInternalCommission = () => {
    setEditingInternalCommissionId(null);
    setEditInternalCommission("");
  };

  const saveInternalCommission = async (id: string) => {
    try {
      const value = parseFloat(editInternalCommission) || 0;
      
      const { error } = await supabase
        .from("deposit_installments")
        .update({ internal_commission: value })
        .eq("id", id);

      if (error) throw error;

      setInstallments((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, internal_commission: value } : item
        )
      );

      toast({
        title: "Sucesso",
        description: "Valor da corretagem interno atualizado.",
      });
      
      setEditingInternalCommissionId(null);
    } catch (error) {
      console.error("Erro ao salvar corretagem interno:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o valor.",
        variant: "destructive",
      });
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
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

  const getFilteredAndSortedInstallments = () => {
    let filtered = installments;
    if (statusFilter === "active") {
      filtered = installments.filter(item => item.rental.is_active === true);
    } else if (statusFilter === "inactive") {
      filtered = installments.filter(item => item.rental.is_active === false);
    }

    if (!sortField || !sortDirection) return filtered;

    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "local":
          aValue = a.rental.property.location.name;
          bValue = b.rental.property.location.name;
          break;
        case "complement":
          aValue = a.rental.property.complement;
          bValue = b.rental.property.complement;
          break;
        case "tenant":
          aValue = a.rental.tenant.name;
          bValue = b.rental.tenant.name;
          break;
        case "rentalAmount":
          aValue = a.rental.rental_amount + (a.rental.parking_spot_amount || 0);
          bValue = b.rental.rental_amount + (b.rental.parking_spot_amount || 0);
          break;
        case "installment":
          aValue = a.installment_number;
          bValue = b.installment_number;
          break;
        case "securityDeposit":
          aValue = a.rental.security_deposit;
          bValue = b.rental.security_deposit;
          break;
        case "hasPartner":
          aValue = a.rental.has_partner_broker ? 1 : 0;
          bValue = b.rental.has_partner_broker ? 1 : 0;
          break;
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "partnerCommission":
          aValue = a.partner_commission;
          bValue = b.partner_commission;
          break;
        case "internalCommission":
          aValue = a.internal_commission;
          bValue = b.internal_commission;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const sortedData = getFilteredAndSortedInstallments();

    const excelData = sortedData.map(item => ({
      "Local": item.rental.property.location.name,
      "Complemento": item.rental.property.complement || "-",
      "Inquilino": item.rental.tenant.name,
      "Valor Aluguel": item.rental.rental_amount + (item.rental.parking_spot_amount || 0),
      "Valor Total Caução": item.rental.security_deposit || 0,
      "Corretor Parceiro": item.rental.has_partner_broker ? "Sim" : "Não",
      "Valor Pg Corretagem Parceiro": item.partner_commission,
      "Valor Pg Corretagem Interno": item.internal_commission,
      "Parcela": `${item.installment_number}/${item.total_installments}`,
      "Valor Parcela": item.amount,
      "Código PIX": item.pix_code || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    
    ws["!cols"] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 25 },
      { wch: 25 },
      { wch: 10 },
      { wch: 15 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalhamento dos Cauções");

    const fileName = `Detalhamento_Caucoes_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Sucesso!",
      description: "Planilha exportada com sucesso.",
    });
  };

  const sortedData = getFilteredAndSortedInstallments();

  const calculateDepositKPIs = () => {
    const totalExpected = sortedData.reduce((sum, item) => {
      return sum + item.amount;
    }, 0);

    const totalReceived = sortedData.reduce((sum, item) => {
      if (item.pix_code && item.pix_code.trim() !== "") {
        return sum + item.amount;
      }
      return sum;
    }, 0);

    const adminFee = sortedData.reduce((sum, item) => {
      return sum + (item.partner_commission || 0) + (item.internal_commission || 0);
    }, 0);

    const netRevenue = totalReceived - adminFee;

    return {
      totalExpected,
      totalReceived,
      adminFee,
      netRevenue
    };
  };

  const depositKPIs = calculateDepositKPIs();

  // Agrupar por rental_id para mesclar células
  const groupedByRental = sortedData.reduce((acc, item) => {
    if (!acc[item.rental_id]) {
      acc[item.rental_id] = [];
    }
    acc[item.rental_id].push(item);
    return acc;
  }, {} as Record<string, DepositInstallmentData[]>);

  if (loading) {
    return <div className="p-4 text-center">Carregando cauções...</div>;
  }

  return (
    <div className="space-y-6">
      {user?.role === "admin" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                    {formatCurrency(depositKPIs.totalExpected)}
                  </div>
                  <p className="text-xs text-blue-500 mt-1">Soma de todas as parcelas</p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

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
                    {formatCurrency(depositKPIs.totalReceived)}
                  </div>
                  <p className="text-xs text-green-600 mt-1">Parcelas com PIX preenchido</p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

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
                    {formatCurrency(depositKPIs.adminFee)}
                  </div>
                  <p className="text-xs text-purple-600 mt-1">Soma das corretagens</p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>

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
                    {formatCurrency(depositKPIs.netRevenue)}
                  </div>
                  <p className="text-xs text-indigo-600 mt-1">Recebido menos taxas</p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      )}

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium text-slate-700">
              Detalhamento dos Cauções
            </CardTitle>
            <div className="flex gap-2 items-center">
              <div className="w-[180px]">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 h-9">
                    <SelectValue placeholder="Status da Locação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="active">Ativas</SelectItem>
                    <SelectItem value="inactive">Inativas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="text-slate-600 hover:text-slate-900 h-9"
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-9"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                  <TableHead 
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("local")}
                  >
                    <div className="flex items-center">
                      Local
                      <SortIcon field="local" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("complement")}
                  >
                    <div className="flex items-center">
                      Complemento
                      <SortIcon field="complement" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("tenant")}
                  >
                    <div className="flex items-center">
                      Inquilino
                      <SortIcon field="tenant" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("rentalAmount")}
                  >
                    <div className="flex items-center">
                      Valor Aluguel
                      <SortIcon field="rentalAmount" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("securityDeposit")}
                  >
                    <div className="flex items-center">
                      Valor Total Caução
                      <SortIcon field="securityDeposit" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("hasPartner")}
                  >
                    <div className="flex items-center">
                      Corretor Parceiro?
                      <SortIcon field="hasPartner" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("partnerCommission")}
                  >
                    <div className="flex items-center">
                      Valor Pg Corretagem Parceiro
                      <SortIcon field="partnerCommission" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("internalCommission")}
                  >
                    <div className="flex items-center">
                      Valor Pg Corretagem Interno
                      <SortIcon field="internalCommission" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("installment")}
                  >
                    <div className="flex items-center">
                      Parcela
                      <SortIcon field="installment" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center justify-end">
                      Valor Parcela
                      <SortIcon field="amount" />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Código PIX
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center h-24 text-slate-500">
                      Nenhum registro de caução parcelado encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {Object.values(groupedByRental).map((group) =>
                      group.map((item, index) => (
                        <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                          {index === 0 && (
                            <>
                              <TableCell rowSpan={group.length} className="font-medium text-slate-900 align-top">
                                {item.rental.property.location.name}
                              </TableCell>
                              <TableCell rowSpan={group.length} className="text-slate-600 align-top">
                                {item.rental.property.complement || "-"}
                              </TableCell>
                              <TableCell rowSpan={group.length} className="text-slate-600 align-top">
                                {item.rental.tenant.name}
                              </TableCell>
                              <TableCell rowSpan={group.length} className="font-medium text-slate-900 align-top">
                                {formatCurrency(item.rental.rental_amount + (item.rental.parking_spot_amount || 0))}
                              </TableCell>
                              <TableCell rowSpan={group.length} className="font-medium text-slate-900 align-top">
                                {formatCurrency(item.rental.security_deposit || 0)}
                              </TableCell>
                              <TableCell rowSpan={group.length} className="align-top">
                                {item.rental.has_partner_broker ? (
                                  <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Sim</Badge>
                                ) : (
                                  <Badge variant="outline">Não</Badge>
                                )}
                              </TableCell>
                              <TableCell rowSpan={group.length} className="align-top">
                                {editingPartnerCommissionId === item.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editPartnerCommission}
                                      onChange={(e) => setEditPartnerCommission(e.target.value)}
                                      className="h-8 w-32"
                                      placeholder="0.00"
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => savePartnerCommission(item.id)}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={cancelEditingPartnerCommission}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 group">
                                    <span className="text-slate-900 font-medium">
                                      {formatCurrency(item.partner_commission)}
                                    </span>
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                                      onClick={() => startEditingPartnerCommission(item.id, item.partner_commission)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell rowSpan={group.length} className="align-top">
                                {editingInternalCommissionId === item.id ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={editInternalCommission}
                                      onChange={(e) => setEditInternalCommission(e.target.value)}
                                      className="h-8 w-32"
                                      placeholder="0.00"
                                    />
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => saveInternalCommission(item.id)}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={cancelEditingInternalCommission}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 group">
                                    <span className="text-slate-900 font-medium">
                                      {formatCurrency(item.internal_commission)}
                                    </span>
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                                      onClick={() => startEditingInternalCommission(item.id, item.internal_commission)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </>
                          )}
                          <TableCell>
                            <Badge variant="outline">
                              {item.installment_number}/{item.total_installments}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell>
                            {editingPixId === item.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editPixCode}
                                  onChange={(e) => setEditPixCode(e.target.value)}
                                  className="h-8 w-40"
                                  placeholder="Chave PIX"
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => savePixCode(item.id)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={cancelEditingPix}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 group">
                                <Input
                                  value={item.pix_code || ""}
                                  readOnly
                                  placeholder="Sem código"
                                  className="h-8 text-xs bg-slate-50"
                                />
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50" 
                                  onClick={() => startEditingPix(item.id, item.pix_code)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <TableCell colSpan={9} className="text-right text-slate-900 uppercase tracking-wide">
                        Total:
                      </TableCell>
                      <TableCell className="text-right text-green-700 text-lg">
                        {formatCurrency(depositKPIs.totalExpected)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}