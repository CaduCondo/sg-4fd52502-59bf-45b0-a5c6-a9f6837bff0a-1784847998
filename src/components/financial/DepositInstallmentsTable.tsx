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
  rental: {
    has_partner_broker: boolean;
    security_deposit: number;
    is_active: boolean;
    property_id: string;
    location_id: string;
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

type SortField = "local" | "complement" | "tenant" | "installment" | "securityDeposit" | "hasPartner" | "amount";
type SortDirection = "asc" | "desc" | null;

export function DepositInstallmentsTable() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [installments, setInstallments] = useState<DepositInstallmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPixCode, setEditPixCode] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [config, setConfig] = useState<any>(null);
  const [exemptLocationIds, setExemptLocationIds] = useState<string[]>([]);

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
          rental:rentals (
            has_partner_broker,
            security_deposit,
            is_active,
            property_id,
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
        rental: {
          has_partner_broker: item.rental?.has_partner_broker,
          security_deposit: item.rental?.security_deposit,
          is_active: item.rental?.is_active ?? true,
          property_id: item.rental?.property_id,
          location_id: item.rental?.property?.location_id,
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

      // Buscar configurações e isenções para cálculo de taxa
      if (user) {
        const { data: configData } = await supabase
          .from("configs")
          .select("*")
          .maybeSingle();
        
        setConfig(configData);

        const { data: exemptions } = await supabase
          .from("user_fee_exemptions")
          .select("location_id")
          .eq("user_id", user.id);
        
        setExemptLocationIds(exemptions?.map(e => e.location_id) || []);
      }
    } catch (error) {
      console.error("Erro ao buscar parcelas do caução:", error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (id: string, currentCode: string | null) => {
    setEditingId(id);
    setEditPixCode(currentCode || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
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
      
      setEditingId(null);
    } catch (error) {
      console.error("Erro ao salvar PIX:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o código PIX.",
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
    // Filter by status
    let filtered = installments;
    if (statusFilter === "active") {
      filtered = installments.filter(item => item.rental.is_active === true);
    } else if (statusFilter === "inactive") {
      filtered = installments.filter(item => item.rental.is_active === false);
    }
    // statusFilter === "all" não filtra

    // Sort
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
      "Parcela": `${item.installment_number}/${item.total_installments}`,
      "Código PIX": item.pix_code || "-",
      "Valor Total Caução": item.rental.security_deposit || 0,
      "Corretor Parceiro": item.rental.has_partner_broker ? "Sim" : "Não",
      "Valor Parcela": item.amount,
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    
    ws["!cols"] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 20 },
      { wch: 10 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
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
    // Total esperado = soma de todos os cauções (security_deposit)
    const totalExpected = sortedData.reduce((sum, item) => {
      return sum + (item.rental.security_deposit || 0);
    }, 0);

    // Total recebido = soma de todas as parcelas
    const totalReceived = sortedData.reduce((sum, item) => {
      return sum + item.amount;
    }, 0);

    // Taxa adm considerando isenções
    const adminFee = sortedData.reduce((sum, item) => {
      // Verificar se location está isento
      if (exemptLocationIds.includes(item.rental.location_id)) {
        return sum;
      }
      
      const feeRate = config ? (config.admin_fee_percentage || 0) / 100 : 0.05;
      return sum + (item.amount * feeRate);
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

  if (loading) {
    return <div className="p-4 text-center">Carregando cauções...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards - Apenas para Admin */}
      {user?.role === "admin" && (
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
                    {formatCurrency(depositKPIs.totalExpected)}
                  </div>
                  <p className="text-xs text-blue-500 mt-1">Total de cauções</p>
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
                    {formatCurrency(depositKPIs.totalReceived)}
                  </div>
                  <p className="text-xs text-green-600 mt-1">Parcelas recebidas</p>
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
                    {formatCurrency(depositKPIs.adminFee)}
                  </div>
                  <p className="text-xs text-purple-600 mt-1">5% da receita</p>
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
                    {formatCurrency(depositKPIs.netRevenue)}
                  </div>
                  <p className="text-xs text-indigo-600 mt-1">Receita após taxa administrativa</p>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      )}

      {/* Tabela */}
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
          <div className="rounded-md">
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
                    onClick={() => handleSort("installment")}
                  >
                    <div className="flex items-center">
                      Parcela
                      <SortIcon field="installment" />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Código PIX
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
                    className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right cursor-pointer hover:bg-slate-100"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="flex items-center justify-end">
                      Valor Parcela
                      <SortIcon field="amount" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24 text-slate-500">
                      Nenhum registro de caução parcelado encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {sortedData.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="font-medium text-slate-900">
                          {item.rental.property.location.name}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {item.rental.property.complement || "-"}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {item.rental.tenant.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {item.installment_number}/{item.total_installments}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {editingId === item.id ? (
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
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={cancelEditing}>
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
                                onClick={() => startEditing(item.id, item.pix_code)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {formatCurrency(item.rental.security_deposit || 0)}
                        </TableCell>
                        <TableCell>
                          {item.rental.has_partner_broker ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Sim</Badge>
                          ) : (
                            <Badge variant="outline">Não</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(item.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Linha de Totais */}
                    <TableRow className="bg-slate-100 font-bold border-t-2 border-slate-300">
                      <TableCell colSpan={7} className="text-right text-slate-900 uppercase tracking-wide">
                        Total:
                      </TableCell>
                      <TableCell className="text-right text-green-700 text-lg">
                        {formatCurrency(depositKPIs.totalReceived)}
                      </TableCell>
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