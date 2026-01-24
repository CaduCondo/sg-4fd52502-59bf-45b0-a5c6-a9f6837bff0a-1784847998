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
import { Check, Edit2, X, Printer, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/masks";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface DepositInstallmentData {
  id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  pix_code: string | null;
  rental: {
    has_partner_broker: boolean;
    security_deposit: number;
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

type SortField = "local" | "complement" | "tenant" | "installment" | "securityDeposit" | "hasPartner" | "amount";
type SortDirection = "asc" | "desc" | null;

export function DepositInstallmentsTable() {
  const { toast } = useToast();
  const [installments, setInstallments] = useState<DepositInstallmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPixCode, setEditPixCode] = useState("");
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
          rental:rentals (
            has_partner_broker,
            security_deposit,
            status,
            tenant:tenants (
              name
            ),
            property:properties (
              complement,
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
          status: item.rental?.status || "active",
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
    if (statusFilter !== "all") {
      filtered = installments.filter(item => item.rental.status === statusFilter);
    }

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

  if (loading) {
    return <div className="p-4 text-center">Carregando cauções...</div>;
  }

  return (
    <Card className="mt-8 border-slate-200 shadow-sm overflow-hidden">
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
                  <SelectItem value="completed">Finalizadas</SelectItem>
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
                sortedData.map((item) => (
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
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}