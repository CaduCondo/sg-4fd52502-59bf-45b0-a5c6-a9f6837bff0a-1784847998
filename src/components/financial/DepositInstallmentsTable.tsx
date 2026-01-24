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
import { Check, Edit2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/masks";
import { useToast } from "@/hooks/use-toast";

interface DepositInstallmentData {
  id: string;
  installment_number: number;
  total_installments: number;
  amount: number;
  pix_code: string | null;
  rental: {
    has_partner_broker: boolean;
    security_deposit: number;
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

export function DepositInstallmentsTable() {
  const { toast } = useToast();
  const [installments, setInstallments] = useState<DepositInstallmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPixCode, setEditPixCode] = useState("");

  useEffect(() => {
    fetchInstallments();
  }, []);

  const fetchInstallments = async () => {
    try {
      setLoading(true);
      
      // Query manual para garantir joins corretos
      const { data, error } = await supabase
        .from("deposit_installments")
        .select(`
          id,
          installment_number,
          total_installments,
          amount,
          pix_code,
          rental:rentals (
            has_partner_broker,
            security_deposit,
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

      // Transformar dados para o formato esperado (lidando com arrays retornados pelos joins)
      const formattedData = (data || []).map((item: any) => ({
        id: item.id,
        installment_number: item.installment_number,
        total_installments: item.total_installments,
        amount: item.amount,
        pix_code: item.pix_code,
        rental: {
          has_partner_broker: item.rental?.has_partner_broker,
          security_deposit: item.rental?.security_deposit,
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

  if (loading) {
    return <div className="p-4 text-center">Carregando cauções...</div>;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Detalhamento dos Cauções</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Local</TableHead>
                <TableHead>Complemento</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Parcela</TableHead>
                <TableHead>Código PIX</TableHead>
                <TableHead>Valor Total Caução</TableHead>
                <TableHead>Corretor Parceiro?</TableHead>
                <TableHead className="text-right">Valor Parcela</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {installments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24">
                    Nenhum registro de caução parcelado encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                installments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.rental.property.location.name}</TableCell>
                    <TableCell>{item.rental.property.complement || "-"}</TableCell>
                    <TableCell>{item.rental.tenant.name}</TableCell>
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
                          <span className="text-sm font-mono text-muted-foreground">
                            {item.pix_code || "Sem código"}
                          </span>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                            onClick={() => startEditing(item.id, item.pix_code)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatCurrency(item.rental.security_deposit || 0)}</TableCell>
                    <TableCell>
                      {item.rental.has_partner_broker ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Sim</Badge>
                      ) : (
                        <Badge variant="secondary">Não</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
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