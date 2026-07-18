import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, parseCurrencyToNumber } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Download, Printer, Pencil, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface DepositInstallment {
  id: string;
  rental_id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  pix_code: string | null;
  partner_commission: number;
  internal_commission: number;
  payment_date: string | null;
  status: string;
  due_date: string | null;
  rental: {
    rent_value: number;
    garage_value: number;
    security_deposit: number;
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
  };
}

interface DepositInstallmentsTableProps {
  userRole: string;
  allowedLocationIds?: string[];
}

type SortField = "location" | "complement" | "tenant" | "rentValue" | "totalDeposit" | "rent" | "deposit" | "partner" | "partnerCommission" | "internalCommission" | "installment" | "date" | "amount" | "pix" | "rental_property" | "tenant_name" | "installment_number" | "due_date" | "payment_date" | "status" | "dueDate" | "paymentDate";
type SortDirection = "asc" | "desc" | null;

export function DepositInstallmentsTable({
  userRole,
  allowedLocationIds = [],
}: DepositInstallmentsTableProps) {
  const [data, setData] = useState<DepositInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const { toast } = useToast();

  // 🔥 CORREÇÃO: Permitir acesso para admin E broker
  const isAdmin = userRole === "admin" || userRole === "broker";

  // SortIcon component
  const SortIcon = useCallback(({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-30" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-4 w-4 ml-1" />;
    }
    return <ArrowDown className="h-4 w-4 ml-1" />;
  }, [sortField, sortDirection]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("🔍 === INÍCIO BUSCA PARCELAS DE CAUÇÃO ===");

        // 🔥 CRÍTICO: Buscar TODAS as parcelas de caução, sem filtrar por status de rental aqui
        const query = supabase
          .from("deposit_installments")
          .select(`
            id,
            rental_id,
            installment_number,
            total_installments,
            amount,
            pix_code,
            partner_commission,
            internal_commission,
            payment_date,
            status,
            due_date,
            rental:rentals!rental_id(
              id,
              rent_value,
              garage_value,
              security_deposit,
              has_partner_broker,
              status,
              tenant:tenants(name),
              property:properties(
                complement,
                location:locations(name)
              )
            )
          `)
          .order("due_date", { ascending: true, nullsFirst: false });

        const { data: installmentsData, error } = await query;

        if (error) {
          console.error("❌ Erro na query:", error);
          throw error;
        }

        console.log("✅ Query executada com sucesso");
        console.log("📊 Total de parcelas:", installmentsData?.length || 0);

        if (!installmentsData || installmentsData.length === 0) {
          console.log("⚠️ Nenhuma parcela encontrada");
          setData([]);
          setLoading(false);
          return;
        }

        // Type assertion em duas etapas - bypass do tipo complexo do Supabase
        console.log("✅ Dados carregados, total:", installmentsData.length);
        setData(installmentsData as unknown as DepositInstallment[]);
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
  }, [isAdmin, toast]); // Removido statusFilter do array de dependências

  // 🔥 FILTRAR DADOS APÓS CARREGAMENTO, BASEADO NO FILTRO SELECIONADO
  const filteredData = useMemo(() => {
    if (statusFilter === "all") {
      console.log("📊 Mostrando TODAS as locações:", data.length);
      return data;
    } else if (statusFilter === "active") {
      const activeData = data.filter((inst) => inst.rental?.status === "active");
      console.log("📊 Mostrando locações ATIVAS:", activeData.length);
      return activeData;
    } else if (statusFilter === "inactive") {
      const inactiveData = data.filter((inst) => inst.rental?.status !== "active");
      console.log("📊 Mostrando locações INATIVAS:", inactiveData.length);
      return inactiveData;
    }
    return data;
  }, [data, statusFilter]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      // Ciclo: asc → desc → null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }, [sortField, sortDirection]);

  const handleUpdateField = useCallback(async (
    installmentId: string,
    field: string,
    value: string | number
  ) => {
    try {
      const updateData: any = {};
      
      if (field === "pix_code") {
        updateData.pix_code = value;
      } else if (field === "partner_commission") {
        updateData.partner_commission = value;
      } else if (field === "internal_commission") {
        updateData.internal_commission = value;
      } else if (field === "amount") {
        updateData.amount = value;
      }

      const { error } = await supabase
        .from("deposit_installments")
        .update(updateData)
        .eq("id", installmentId);

      if (error) throw error;

      // Atualizar estado local
      setData(prevData =>
        prevData.map(item =>
          item.id === installmentId
            ? { ...item, [field]: value }
            : item
        )
      );

      toast({
        title: "Atualizado com sucesso",
        description: `Campo ${field} foi atualizado.`,
      });
    } catch (error) {
      console.error("Erro ao atualizar campo:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error instanceof Error ? error.message : "Ocorreu um erro desconhecido",
      });
    }
  }, [toast]);

  const exportToExcel = useCallback(() => {
    const excelData = data.map((inst) => ({
      Local: inst.rental?.property?.location?.name || "-",
      Complemento: inst.rental?.property?.complement || "-",
      Inquilino: inst.rental?.tenant?.name || "-",
      "Valor Aluguel": inst.rental?.rent_value || 0,
      "Valor Total Caução": inst.rental?.security_deposit || 0,
      "Corretor Parceiro": inst.rental?.has_partner_broker ? "Sim" : "Não",
      "Valor Pg Corretor Parceiro": inst.partner_commission || 0,
      "Valor Pg Corretor Interno": inst.internal_commission || 0,
      Parcela: `${inst.installment_number}/${inst.total_installments}`,
      "Data Pagamento": inst.payment_date || "-",
      "Valor Parcela": inst.amount || 0,
      "Código PIX": inst.pix_code || "-",
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
  }, [data, toast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // ✅ Agrupa parcelas por rental_id (MEMOIZADO)
  const groupedData = useMemo(() => {
    return filteredData.reduce((acc, inst) => {
      if (!acc[inst.rental_id]) {
        acc[inst.rental_id] = [];
      }
      acc[inst.rental_id].push(inst);
      return acc;
    }, {} as Record<string, DepositInstallment[]>);
  }, [filteredData]);

  // ✅ Ordena parcelas dentro de cada grupo (MEMOIZADO)
  useMemo(() => {
    Object.values(groupedData).forEach((group) => {
      group.sort((a, b) => a.installment_number - b.installment_number);
    });
  }, [groupedData]);

  // ✅ Converte para array e ordena grupos (MEMOIZADO)
  const sortedGroups = useMemo(() => {
    let groups = Object.entries(groupedData)
      .sort((a, b) => {
        const dateA = new Date(a[1][0].due_date || a[1][0].payment_date || "");
        const dateB = new Date(b[1][0].due_date || b[1][0].payment_date || "");
        return dateA.getTime() - dateB.getTime();
      })
      .map(([_, group]) => group);

    // ✅ Aplicar ordenação customizada se houver
    if (sortField && sortDirection) {
      groups = [...groups].sort((groupA, groupB) => {
        const instA = groupA[0];
        const instB = groupB[0];
        let comparison = 0;

        switch (sortField) {
          case "location":
            comparison = (instA.rental?.property?.location?.name || "").localeCompare(
              instB.rental?.property?.location?.name || ""
            );
            break;
          case "complement":
            comparison = (instA.rental?.property?.complement || "").localeCompare(
              instB.rental?.property?.complement || ""
            );
            break;
          case "tenant":
            comparison = (instA.rental?.tenant?.name || "").localeCompare(
              instB.rental?.tenant?.name || ""
            );
            break;
          case "rent":
            comparison = (instA.rental?.rent_value || 0) - (instB.rental?.rent_value || 0);
            break;
          case "deposit":
            const depositA = groupA.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            const depositB = groupB.reduce((acc, curr) => acc + (curr.amount || 0), 0);
            comparison = depositA - depositB;
            break;
          case "partner":
            comparison = (instA.rental?.has_partner_broker ? 1 : 0) - (instB.rental?.has_partner_broker ? 1 : 0);
            break;
          case "partnerCommission":
            comparison = (instA.partner_commission || 0) - (instB.partner_commission || 0);
            break;
          case "internalCommission":
            comparison = (instA.internal_commission || 0) - (instB.internal_commission || 0);
            break;
          case "installment":
            comparison = instA.installment_number - instB.installment_number;
            break;
          case "date":
            const dateA = new Date(instA.payment_date || instA.due_date || "");
            const dateB = new Date(instB.payment_date || instB.due_date || "");
            comparison = dateA.getTime() - dateB.getTime();
            break;
          case "amount":
            comparison = (instA.amount || 0) - (instB.amount || 0);
            break;
          case "pix":
            comparison = (instA.pix_code || "").localeCompare(instB.pix_code || "");
            break;
        }

        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return groups;
  }, [groupedData, sortField, sortDirection]);

  // Achatar os grupos para cálculo de totais (MEMOIZADO)
  const visibleData = useMemo(() => sortedGroups.flatMap(group => group), [sortedGroups]);

  // Calcular rowSpan para cada linha (para mesclar células da mesma locação)
  const rowSpanMap = useMemo(() => {
    const map = new Map<string, { start: number; count: number }>();
    const grouped = new Map<string, number[]>();

    // Agrupar índices por rental_id
    visibleData.forEach((item, index) => {
      const rentalId = item.rental_id;
      if (!grouped.has(rentalId)) {
        grouped.set(rentalId, []);
      }
      grouped.get(rentalId)!.push(index);
    });

    // Calcular rowSpan para cada grupo
    grouped.forEach((indices, rentalId) => {
      if (indices.length > 0) {
        map.set(rentalId, {
          start: indices[0],
          count: indices.length,
        });
      }
    });

    return map;
  }, [visibleData]);

  // Helper para verificar se deve renderizar a célula
  const shouldRenderCell = useCallback((rentalId: string, currentIndex: number): boolean => {
    const info = rowSpanMap.get(rentalId);
    if (!info) return true;
    return info.start === currentIndex;
  }, [rowSpanMap]);

  // Helper para obter rowSpan
  const getRowSpan = useCallback((rentalId: string): number => {
    const info = rowSpanMap.get(rentalId);
    return info ? info.count : 1;
  }, [rowSpanMap]);

  const sortedData = useMemo(() => {
  }, [visibleData]);

  const { totalExpected, totalReceived, totalPartnerCommission, totalInternalCommission, totalCommission, netRevenue } = useMemo(() => {
    const totalExpected = visibleData.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalReceived = visibleData
      .filter((inst) => inst.pix_code && inst.pix_code.trim() !== "")
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalPartnerCommission = visibleData.reduce((acc, curr) => acc + (curr.partner_commission || 0), 0);
    const totalInternalCommission = visibleData.reduce((acc, curr) => acc + (curr.internal_commission || 0), 0);
    const totalCommission = totalPartnerCommission + totalInternalCommission;
    const netRevenue = totalReceived - totalCommission;

    return {
      totalExpected,
      totalReceived,
      totalPartnerCommission,
      totalInternalCommission,
      totalCommission,
      netRevenue
    };
  }, [visibleData]);

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
          Acesso restrito a administradores e corretores.
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

  return (
    <>
      <div id="deposits-print-content" style={{ backgroundColor: 'white', padding: '10px' }}>
        {/* Título para impressão */}
        <div className="mb-2">
          <h1 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#000' }}>
            Relatório de Cauções - {statusFilter === "active" ? "Locações Ativas" : statusFilter === "inactive" ? "Locações Inativas" : "Todas as Locações"}
          </h1>
        </div>
        
        {/* Cards de Resumo */}
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4" style={{ marginBottom: '10px' }}>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
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
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
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
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Comissão
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalCommission)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Soma das comissões parceiro + interno
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
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
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">📋 Detalhamento dos Cauções</CardTitle>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Status Locação</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativas</SelectItem>
                      <SelectItem value="inactive">Inativas</SelectItem>
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" /> Imprimir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToExcel}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" /> Exportar Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort("location")}>
                      <div className="flex items-center gap-1">
                        Local
                        <SortIcon field="location" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort("complement")}>
                      <div className="flex items-center gap-1">
                        Complemento
                        <SortIcon field="complement" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100" onClick={() => handleSort("tenant")}>
                      <div className="flex items-center gap-1">
                        Inquilino
                        <SortIcon field="tenant" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 text-right" onClick={() => handleSort("rentValue")}>
                      <div className="flex items-center justify-end gap-1">
                        Valor Aluguel
                        <SortIcon field="rentValue" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 text-right" onClick={() => handleSort("totalDeposit")}>
                      <div className="flex items-center justify-end gap-1">
                        Valor Total Caução
                        <SortIcon field="totalDeposit" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 text-center" onClick={() => handleSort("partner")}>
                      <div className="flex items-center justify-center gap-1">
                        Corretor Parceiro?
                        <SortIcon field="partner" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 text-right" onClick={() => handleSort("partnerCommission")}>
                      <div className="flex items-center justify-end gap-1">
                        Valor Parceiro
                        <SortIcon field="partnerCommission" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 text-right" onClick={() => handleSort("internalCommission")}>
                      <div className="flex items-center justify-end gap-1">
                        Valor Corretor
                        <SortIcon field="internalCommission" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 text-center" onClick={() => handleSort("installment")}>
                      <div className="flex items-center justify-center gap-1">
                        Parcela
                        <SortIcon field="installment" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 text-center" onClick={() => handleSort("status")}>
                      <div className="flex items-center justify-center gap-1">
                        Status
                        <SortIcon field="status" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 text-center" onClick={() => handleSort("dueDate")}>
                      <div className="flex items-center justify-center gap-1">
                        Data Vencimento
                        <SortIcon field="dueDate" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 text-center" onClick={() => handleSort("paymentDate")}>
                      <div className="flex items-center justify-center gap-1">
                        Data Pagamento
                        <SortIcon field="paymentDate" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-gray-100 text-right" onClick={() => handleSort("amount")}>
                      <div className="flex items-center justify-end gap-1">
                        Valor
                        <SortIcon field="amount" />
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      Código PIX
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleData.map((installment, index) => {
                    const rental = installment.rental;
                    const property = rental?.property;
                    const tenant = rental?.tenant;
                    const location = property?.location;
                    const rentalId = installment.rental_id;

                    // Calcular valor total do caução (soma de todas as parcelas desta locação)
                    const allInstallmentsForRental = data.filter(i => i.rental_id === rentalId);
                    const totalDepositValue = allInstallmentsForRental.reduce((sum, i) => sum + (i.amount || 0), 0);

                    return (
                      <TableRow key={installment.id} className="hover:bg-gray-50">
                        {/* Local - mesclado */}
                        {shouldRenderCell(rentalId, index) && (
                          <TableCell rowSpan={getRowSpan(rentalId)}>
                            {location?.name || "N/A"}
                          </TableCell>
                        )}
                        
                        {/* Complemento - mesclado */}
                        {shouldRenderCell(rentalId, index) && (
                          <TableCell rowSpan={getRowSpan(rentalId)}>
                            {property?.complement || "-"}
                          </TableCell>
                        )}
                        
                        {/* Inquilino - mesclado */}
                        {shouldRenderCell(rentalId, index) && (
                          <TableCell rowSpan={getRowSpan(rentalId)}>
                            {tenant?.name || "N/A"}
                          </TableCell>
                        )}

                        {/* Valor Aluguel - mesclado */}
                        {shouldRenderCell(rentalId, index) && (
                          <TableCell className="text-right" rowSpan={getRowSpan(rentalId)}>
                            {formatCurrency(rental?.rent_value || 0)}
                          </TableCell>
                        )}

                        {/* Valor Total Caução - mesclado */}
                        {shouldRenderCell(rentalId, index) && (
                          <TableCell className="text-right font-semibold" rowSpan={getRowSpan(rentalId)}>
                            {formatCurrency(totalDepositValue)}
                          </TableCell>
                        )}
                        
                        {/* Corretor Parceiro - mesclado */}
                        {shouldRenderCell(rentalId, index) && (
                          <TableCell className="text-center" rowSpan={getRowSpan(rentalId)}>
                            {rental?.has_partner_broker ? "Sim" : "Não"}
                          </TableCell>
                        )}
                        
                        {/* Valor Parceiro - mesclado e editável */}
                        {shouldRenderCell(rentalId, index) && (
                          <TableCell className="text-right" rowSpan={getRowSpan(rentalId)}>
                            {rental?.has_partner_broker ? (
                              editingCell?.id === installment.id && editingCell?.field === "partner_commission" ? (
                                <Input
                                  type="text"
                                  className="w-full h-9 text-right text-sm border-2 border-blue-500"
                                  value={formatCurrency(installment.partner_commission || 0)}
                                  onChange={(e) => {
                                    const value = parseCurrencyToNumber(e.target.value);
                                    handleUpdateField(installment.id, "partner_commission", value);
                                  }}
                                  onBlur={() => setEditingCell(null)}
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className="cursor-pointer hover:bg-blue-50 px-3 py-2 rounded block text-right"
                                  onClick={() => setEditingCell({ id: installment.id, field: "partner_commission" })}
                                >
                                  {formatCurrency(installment.partner_commission || 0)}
                                </span>
                              )
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        )}
                        
                        {/* Valor Corretor - mesclado e editável */}
                        {shouldRenderCell(rentalId, index) && (
                          <TableCell className="text-right" rowSpan={getRowSpan(rentalId)}>
                            {editingCell?.id === installment.id && editingCell?.field === "internal_commission" ? (
                              <Input
                                type="text"
                                className="w-full h-9 text-right text-sm border-2 border-blue-500"
                                value={formatCurrency(installment.internal_commission || 0)}
                                onChange={(e) => {
                                  const value = parseCurrencyToNumber(e.target.value);
                                  handleUpdateField(installment.id, "internal_commission", value);
                                }}
                                onBlur={() => setEditingCell(null)}
                                autoFocus
                              />
                            ) : (
                              <span
                                className="cursor-pointer hover:bg-blue-50 px-3 py-2 rounded block text-right"
                                onClick={() => setEditingCell({ id: installment.id, field: "internal_commission" })}
                              >
                                {formatCurrency(installment.internal_commission || 0)}
                              </span>
                            )}
                          </TableCell>
                        )}

                        {/* Parcela - NÃO mesclado */}
                        <TableCell className="text-center font-medium">
                          {installment.installment_number}/{installment.total_installments}
                        </TableCell>

                        {/* Status - NÃO mesclado */}
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              installment.status === "paid"
                                ? "bg-green-100 text-green-700 border-green-300"
                                : installment.status === "overdue"
                                ? "bg-red-100 text-red-700 border-red-300"
                                : "bg-yellow-100 text-yellow-700 border-yellow-300"
                            }
                          >
                            {installment.status === "paid"
                              ? "Pago"
                              : installment.status === "overdue"
                              ? "Atrasado"
                              : "Pendente"}
                          </Badge>
                        </TableCell>
                        
                        {/* Data Vencimento - NÃO mesclado - LÓGICA CORRETA */}
                        <TableCell className="text-center">
                          {(() => {
                            // Lógica: 1/1 usa deposit_payment_date, 2/X usa deposit_installment2_payment_date, 3/X usa deposit_installment3_payment_date
                            let dateToDisplay = installment.due_date;
                            
                            if (rental) {
                              if (installment.installment_number === 1 && rental.deposit_payment_date) {
                                dateToDisplay = rental.deposit_payment_date;
                              } else if (installment.installment_number === 2 && rental.deposit_installment2_payment_date) {
                                dateToDisplay = rental.deposit_installment2_payment_date;
                              } else if (installment.installment_number === 3 && rental.deposit_installment3_payment_date) {
                                dateToDisplay = rental.deposit_installment3_payment_date;
                              }
                            }
                            
                            return dateToDisplay
                              ? new Date(dateToDisplay).toLocaleDateString("pt-BR")
                              : "-";
                          })()}
                        </TableCell>
                        
                        {/* Data Pagamento - NÃO mesclado */}
                        <TableCell className="text-center">
                          {installment.payment_date
                            ? new Date(installment.payment_date).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        
                        {/* Valor - NÃO mesclado e editável */}
                        <TableCell className="text-right font-semibold">
                          {editingCell?.id === installment.id && editingCell?.field === "amount" ? (
                            <Input
                              type="text"
                              className="w-full h-9 text-right text-sm font-semibold border-2 border-blue-500"
                              value={formatCurrency(installment.amount)}
                              onChange={(e) => {
                                const value = parseCurrencyToNumber(e.target.value);
                                handleUpdateField(installment.id, "amount", value);
                              }}
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:bg-blue-50 px-3 py-2 rounded block text-right"
                              onClick={() => setEditingCell({ id: installment.id, field: "amount" })}
                            >
                              {formatCurrency(installment.amount)}
                            </span>
                          )}
                        </TableCell>
                        
                        {/* Código PIX - NÃO mesclado e editável */}
                        <TableCell className="text-center text-xs">
                          {editingCell?.id === installment.id && editingCell?.field === "pix_code" ? (
                            <Input
                              type="text"
                              className="w-full h-9 text-center text-xs border-2 border-blue-500"
                              value={installment.pix_code || ""}
                              onChange={(e) => {
                                handleUpdateField(installment.id, "pix_code", e.target.value);
                              }}
                              onBlur={() => setEditingCell(null)}
                              autoFocus
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:bg-blue-50 px-3 py-2 rounded block text-center"
                              onClick={() => setEditingCell({ id: installment.id, field: "pix_code" })}
                            >
                              {installment.pix_code || "-"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}