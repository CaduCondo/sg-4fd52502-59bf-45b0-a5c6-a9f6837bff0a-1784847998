import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { LocationExpense, Location } from "@/types";
import { locationExpenseService } from "@/services/locationExpenseService";
import { formatCurrency, applyRealMask, parseCurrencyToNumber } from "@/lib/masks";

interface LocationExpensesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  location: Location;
}

export function LocationExpensesDialog({ open, onOpenChange, location }: LocationExpensesDialogProps) {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<LocationExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [expenseType, setExpenseType] = useState<string>("water");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceMonth, setReferenceMonth] = useState(new Date().getMonth() + 1);
  const [referenceYear, setReferenceYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (open) {
      loadExpenses();
    }
  }, [open, location.id]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await locationExpenseService.getByLocation(location.id);
      setExpenses(data);
    } catch (error) {
      console.error("Error loading expenses:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as contas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!amount || parseCurrencyToNumber(amount) <= 0) {
      toast({
        title: "Erro",
        description: "Informe um valor válido.",
        variant: "destructive",
      });
      return;
    }

    try {
      const expenseData: Partial<LocationExpense> = {
        locationId: location.id,
        expenseType: expenseType as any,
        description,
        amount: parseCurrencyToNumber(amount),
        referenceMonth,
        referenceYear,
        status: "pending",
      };

      if (editingId) {
        await locationExpenseService.update(editingId, expenseData);
        toast({
          title: "Sucesso",
          description: "Conta atualizada com sucesso.",
        });
      } else {
        await locationExpenseService.create(expenseData);
        toast({
          title: "Sucesso",
          description: "Conta cadastrada com sucesso.",
        });
      }

      resetForm();
      loadExpenses();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a conta.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (expense: LocationExpense) => {
    setEditingId(expense.id);
    setExpenseType(expense.expenseType);
    setDescription(expense.description || "");
    setAmount(formatCurrency(expense.amount));
    setReferenceMonth(expense.referenceMonth);
    setReferenceYear(expense.referenceYear);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return;

    try {
      await locationExpenseService.delete(id);
      toast({
        title: "Sucesso",
        description: "Conta excluída com sucesso.",
      });
      loadExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conta.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setExpenseType("water");
    setDescription("");
    setAmount("");
    setReferenceMonth(new Date().getMonth() + 1);
    setReferenceYear(new Date().getFullYear());
  };

  const getExpenseTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      water: "Água",
      electricity: "Luz",
      gas: "Gás",
      internet: "Internet",
      maintenance: "Manutenção",
      other: "Outros",
    };
    return labels[type] || type;
  };

  const getMonthName = (month: number) => {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return months[month - 1];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Contas a Pagar - {location.name}</DialogTitle>
            {!isAdding && (
              <Button onClick={() => setIsAdding(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {isAdding && (
            <div className="p-4 border rounded-lg space-y-4 bg-muted/20">
              <div className="grid grid-cols-6 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs">Tipo de Conta *</Label>
                  <Select value={expenseType} onValueChange={setExpenseType}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="water">Água</SelectItem>
                      <SelectItem value="electricity">Luz</SelectItem>
                      <SelectItem value="gas">Gás</SelectItem>
                      <SelectItem value="internet">Internet</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                      <SelectItem value="other">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Mês *</Label>
                  <Select value={referenceMonth.toString()} onValueChange={(v) => setReferenceMonth(parseInt(v))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          {getMonthName(i + 1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Ano *</Label>
                  <Select value={referenceYear.toString()} onValueChange={(v) => setReferenceYear(parseInt(v))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026, 2027, 2028].map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label className="text-xs">Valor *</Label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(applyRealMask(e.target.value))}
                    placeholder="R$ 0,00"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Conta de luz do mês"
                  className="h-9 text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm" className="flex-1">
                  <Check className="h-4 w-4 mr-2" />
                  {editingId ? "Atualizar" : "Adicionar"}
                </Button>
                <Button variant="outline" onClick={resetForm} size="sm" className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[100px]">Período</TableHead>
                  <TableHead className="text-right w-[120px]">Valor</TableHead>
                  <TableHead className="text-center w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma conta cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{getExpenseTypeLabel(expense.expenseType)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{expense.description || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {getMonthName(expense.referenceMonth)}/{expense.referenceYear}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-sm">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {expenses.length > 0 && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold">Total de Contas:</span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}