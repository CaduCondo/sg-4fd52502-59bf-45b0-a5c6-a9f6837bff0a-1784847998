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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/masks";
import { Button } from "@/components/ui/button";
import { Download, Printer, Pencil } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

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
    monthly_rent: number;
    garage_value: number;
    security_deposit: number;
    has_partner_broker: boolean;
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

export function DepositInstallmentsTable({
  userRole,
  allowedLocationIds = [],
}: DepositInstallmentsTableProps) {
  const [data, setData] = useState<DepositInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
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
        console.log("🔍 === INÍCIO BUSCA PARCELAS DE CAUÇÃO ===");

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
              monthly_rent,
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

        // Filtrar por status de locação se necessário
        let filteredData = installmentsData;
        if (statusFilter === "active") {
          filteredData = installmentsData.filter(
            (inst) => inst.rental?.status === "active"
          );
        }

        console.log("✅ Dados filtrados:", filteredData.length);
        setData(filteredData as DepositInstallment[]);
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
  }, [isAdmin, statusFilter, toast]);

  const handleUpdateField = async (
    installmentId: string,
    field: string,
    value: string | number
  ) => {
    try {
      const updateData: any = {};
      
      if (field === "amount" || field === "partner_commission" || field === "internal_commission") {
        updateData[field] = parseFloat(value.toString()) || 0;
      } else {
        updateData[field] = value;
      }

      const { error } = await supabase
        .from("deposit_installments")
        .update(updateData)
        .eq("id", installmentId);

      if (error) throw error;

      // Atualizar estado local
      setData((prevData) =>
        prevData.map((item) =>
          item.id === installmentId ? { ...item, ...updateData } : item
        )
      );

      toast({
        title: "Sucesso",
        description: "Valor atualizado com sucesso!",
      });

      setEditingCell(null);
    } catch (error) {
      console.error("❌ Erro ao atualizar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o valor.",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    const excelData = data.map((inst) => ({
      Local: inst.rental?.property?.location?.name || "-",
      Complemento: inst.rental?.property?.complement || "-",
      Inquilino: inst.rental?.tenant?.name || "-",
      "Valor Aluguel": (inst.rental?.monthly_rent || 0) + (inst.rental?.garage_value || 0),
      "Valor Total Caução": inst.rental?.security_deposit || 0,
      "Corretor Parceiro": inst.rental?.has_partner_broker ? "Sim" : "Não",
      "Valor Pg Corretagem Parceiro": inst.partner_commission || 0,
      "Valor Pg Corretagem Interno": inst.internal_commission || 0,
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

  const totalExpected = data.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const totalReceived = data
    .filter((inst) => inst.status === "paid")
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);
  
  const totalPartnerCommission = data.reduce((acc, curr) => acc + (curr.partner_commission || 0), 0);
  const totalInternalCommission = data.reduce((acc, curr) => acc + (curr.internal_commission || 0), 0);
  const totalCommission = totalPartnerCommission + totalInternalCommission;
  
  const netRevenue = totalReceived - totalCommission;

  // ✅ Agrupa parcelas por rental_id
  const groupedData = data.reduce((acc, inst) => {
    if (!acc[inst.rental_id]) {
      acc[inst.rental_id] = [];
    }
    acc[inst.rental_id].push(inst);
    return acc;
  }, {} as Record<string, DepositInstallment[]>);

  // ✅ Ordena parcelas dentro de cada grupo por installment_number
  Object.values(groupedData).forEach((group) => {
    group.sort((a, b) => a.installment_number - b.installment_number);
  });

  // ✅ NOVO: Converte para array e ordena grupos pela data da primeira parcela
  // Isso garante que as parcelas da mesma locação fiquem SEMPRE JUNTAS
  const sortedGroups = Object.entries(groupedData)
    .sort((a, b) => {
      // Usa a data da primeira parcela de cada grupo para ordenar
      const dateA = new Date(a[1][0].due_date || a[1][0].payment_date || "");
      const dateB = new Date(b[1][0].due_date || b[1][0].payment_date || "");
      return dateA.getTime() - dateB.getTime();
    })
    .map(([_, group]) => group); // Retorna apenas os grupos (arrays de parcelas)

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                    <SelectItem value="active">Ativos</SelectItem>
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
                  <TableHead className="text-right">
                    Valor Pg Corretor Parceiro
                  </TableHead>
                  <TableHead className="text-right">
                    Valor Pg Corretor Interno
                  </TableHead>
                  <TableHead className="text-center">Parcela</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead className="text-right">Valor Parcela</TableHead>
                  <TableHead>Código PIX</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedGroups.map((group) =>
                  group.map((inst, index) => {
                    const bgColor = inst.pix_code && inst.pix_code.trim() !== "" ? "bg-green-50" : "bg-red-50";
                    const groupTotalDeposit = group.reduce((acc, curr) => acc + (curr.amount || 0), 0);
                    
                    return (
                    <TableRow
                      key={inst.id}
                    >
                      {/* ✅ CÉLULAS MESCLADAS - Só aparecem na 1ª parcela do grupo */}
                      {index === 0 && (
                        <>
                          <TableCell className="font-medium" rowSpan={group.length}>
                            <div
                              className="max-w-[150px] truncate"
                              title={inst.rental?.property?.location?.name}
                            >
                              {inst.rental?.property?.location?.name || "-"}
                            </div>
                          </TableCell>
                          <TableCell rowSpan={group.length}>
                            <div
                              className="max-w-[100px] truncate"
                              title={inst.rental?.property?.complement}
                            >
                              {inst.rental?.property?.complement || "-"}
                            </div>
                          </TableCell>
                          <TableCell rowSpan={group.length}>
                            <div
                              className="max-w-[120px] truncate"
                              title={inst.rental?.tenant?.name}
                            >
                              {inst.rental?.tenant?.name || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right" rowSpan={group.length}>
                            {formatCurrency(
                              (inst.rental?.monthly_rent || 0) +
                                (inst.rental?.garage_value || 0)
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold" rowSpan={group.length}>
                            {formatCurrency(groupTotalDeposit)}
                          </TableCell>
                          <TableCell rowSpan={group.length}>
                            {inst.rental?.has_partner_broker ? "Sim" : "Não"}
                          </TableCell>
                          <TableCell className="text-right" rowSpan={group.length}>
                            {editingCell?.id === inst.id &&
                            editingCell?.field === "partner_commission" ? (
                              <Input
                                type="number"
                                step="0.01"
                                defaultValue={inst.partner_commission}
                                onBlur={(e) =>
                                  handleUpdateField(
                                    inst.id,
                                    "partner_commission",
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateField(
                                      inst.id,
                                      "partner_commission",
                                      (e.target as HTMLInputElement).value
                                    );
                                  }
                                }}
                                autoFocus
                                className="w-24 h-8"
                              />
                            ) : (
                              <div
                                className="flex items-center justify-end gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                                onClick={() =>
                                  setEditingCell({
                                    id: inst.id,
                                    field: "partner_commission",
                                  })
                                }
                              >
                                <span>{formatCurrency(inst.partner_commission)}</span>
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right" rowSpan={group.length}>
                            {editingCell?.id === inst.id &&
                            editingCell?.field === "internal_commission" ? (
                              <Input
                                type="number"
                                step="0.01"
                                defaultValue={inst.internal_commission}
                                onBlur={(e) =>
                                  handleUpdateField(
                                    inst.id,
                                    "internal_commission",
                                    e.target.value
                                  )
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateField(
                                      inst.id,
                                      "internal_commission",
                                      (e.target as HTMLInputElement).value
                                    );
                                  }
                                }}
                                autoFocus
                                className="w-24 h-8"
                              />
                            ) : (
                              <div
                                className="flex items-center justify-end gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                                onClick={() =>
                                  setEditingCell({
                                    id: inst.id,
                                    field: "internal_commission",
                                  })
                                }
                              >
                                <span>{formatCurrency(inst.internal_commission)}</span>
                                <Pencil className="h-3 w-3 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                        </>
                      )}

                      {/* ✅ CÉLULAS NÃO MESCLADAS - Aparecem em todas as linhas */}
                      <TableCell className={`text-center font-semibold border-l border-l-2 border-gray-300 ${bgColor}`}>
                        {inst.installment_number}/{inst.total_installments}
                      </TableCell>
                      <TableCell className={bgColor}>
                        {inst.payment_date
                          ? new Date(inst.payment_date).toLocaleDateString("pt-BR")
                          : "-"}
                      </TableCell>
                      <TableCell className={`text-right ${bgColor}`}>
                        {editingCell?.id === inst.id &&
                        editingCell?.field === "amount" ? (
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={inst.amount}
                            onBlur={(e) =>
                              handleUpdateField(inst.id, "amount", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdateField(
                                  inst.id,
                                  "amount",
                                  (e.target as HTMLInputElement).value
                                );
                              }
                            }}
                            autoFocus
                            className="w-28 h-8"
                          />
                        ) : (
                          <div
                            className="flex items-center justify-end gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                            onClick={() =>
                              setEditingCell({ id: inst.id, field: "amount" })
                            }
                          >
                            <span className="font-semibold text-green-600">
                              {formatCurrency(inst.amount)}
                            </span>
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={bgColor}>
                        {editingCell?.id === inst.id &&
                        editingCell?.field === "pix_code" ? (
                          <Input
                            type="text"
                            defaultValue={inst.pix_code || ""}
                            onBlur={(e) =>
                              handleUpdateField(inst.id, "pix_code", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdateField(
                                  inst.id,
                                  "pix_code",
                                  (e.target as HTMLInputElement).value
                                );
                              }
                            }}
                            autoFocus
                            className="w-32 h-8"
                          />
                        ) : (
                          <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                            onClick={() =>
                              setEditingCell({ id: inst.id, field: "pix_code" })
                            }
                          >
                            <span className="truncate max-w-[100px]">
                              {inst.pix_code || "-"}
                            </span>
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
                )}
                {/* ✅ LINHA DE TOTAIS */}
                <TableRow className="bg-muted font-bold border-t-2 border-gray-400">
                  <TableCell colSpan={4} className="text-right pr-4">TOTAIS</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalExpected)}</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{formatCurrency(totalPartnerCommission)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalInternalCommission)}</TableCell>
                  <TableCell className="border-l border-l-2 border-gray-300"></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{formatCurrency(totalExpected)}</TableCell>
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