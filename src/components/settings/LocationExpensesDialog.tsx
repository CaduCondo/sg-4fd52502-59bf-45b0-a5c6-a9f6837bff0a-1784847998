import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Filter } from "lucide-react";
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpense, setEditingExpense] = useState<LocationExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<LocationExpense | null>(null);

  // Filtros
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Form
  const [expenseType, setExpenseType] = useState<string>("water");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceMonth, setReferenceMonth] = useState(new Date().getMonth() + 1);
  const [referenceYear, setReferenceYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (open) {
      loadExpenses();
    }
  }, [open, location.id, filterMonth, filterYear]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await locationExpenseService.getByLocation(location.id);
      
      // Filtrar por mês e ano
      const filtered = data.filter(
        (exp) => exp.referenceMonth === filterMonth && exp.referenceYear === filterYear
      );
      
      setExpenses(filtered);
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
      const selectedDate = new Date(`${referenceYear}-${referenceMonth}-01`);
      // Salvar mês como 1-12 (Janeiro = 1)
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();

      const expenseData = {
        locationId: location.id,
        expenseType: expenseType as LocationExpense["expenseType"],
        description,
        amount: parseCurrencyToNumber(amount),
        referenceMonth: month,
        referenceYear: year,
        status: "pending" as LocationExpense["status"],
      };

      if (editingExpense) {
        await locationExpenseService.update(editingExpense.id, expenseData);
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

  const handleView = (expense: LocationExpense) => {
    setEditingExpense(expense);
    setExpenseType(expense.expenseType);
    setDescription(expense.description || "");
    setAmount(formatCurrency(expense.amount));
    setReferenceMonth(expense.referenceMonth);
    setReferenceYear(expense.referenceYear);
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await locationExpenseService.delete(id);
      toast({
        title: "Sucesso",
        description: "Conta excluída com sucesso.",
      });
      setExpenseToDelete(null);
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
    setIsFormOpen(false);
    setIsEditing(false);
    setEditingExpense(null);
    setExpenseToDelete(null);
    setExpenseType("water");
    setDescription("");
    setAmount("");
    setReferenceMonth(new Date().getMonth() + 1);
    setReferenceYear(new Date().getFullYear());
  };

  const handleNewExpense = () => {
    resetForm();
    setIsEditing(true);
    setIsFormOpen(true);
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
    <>
      <Dialog open={open && !isFormOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contas a Pagar - {location.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Filtrar por:</Label>
              <Select value={filterMonth.toString()} onValueChange={(v) => setFilterMonth(parseInt(v))}>
                <SelectTrigger className="h-9 w-32">
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
              <Select value={filterYear.toString()} onValueChange={(v) => setFilterYear(parseInt(v))}>
                <SelectTrigger className="h-9 w-28">
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

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center w-24">Ações</TableHead>
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
                        Nenhuma conta cadastrada para {getMonthName(filterMonth)}/{filterYear}
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((expense) => (
                      <TableRow 
                        key={expense.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleView(expense)}
                      >
                        <TableCell>
                          <Badge variant="outline">{getExpenseTypeLabel(expense.expenseType)}</Badge>
                        </TableCell>
                        <TableCell>{expense.description || "-"}</TableCell>
                        <TableCell>
                          {getMonthName(expense.referenceMonth)}/{expense.referenceYear}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpenseToDelete(expense);
                              }}
                              className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
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
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total de Contas ({getMonthName(filterMonth)}/{filterYear}):</span>
                  <span className="text-xl font-bold text-red-600">
                    {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button size="sm" onClick={handleNewExpense}>
              Nova Conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingExpense && !isEditing
                ? "Visualização da Conta a Pagar"
                : editingExpense && isEditing
                ? "Edição da Conta a Pagar"
                : "Inclusão de Conta a Pagar"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-6 gap-3">
              <div className="space-y-2 col-span-2">
                <Label>Tipo</Label>
                <Select value={expenseType} onValueChange={setExpenseType} disabled={!isEditing && !!editingExpense}>
                  <SelectTrigger className="h-9">
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
                <Label>Mês</Label>
                <Select 
                  value={referenceMonth.toString()} 
                  onValueChange={(v) => setReferenceMonth(parseInt(v))}
                  disabled={!isEditing && !!editingExpense}
                >
                  <SelectTrigger className="h-9">
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
                <Label>Ano</Label>
                <Select 
                  value={referenceYear.toString()} 
                  onValueChange={(v) => setReferenceYear(parseInt(v))}
                  disabled={!isEditing && !!editingExpense}
                >
                  <SelectTrigger className="h-9">
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
                <Label>Valor</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(applyRealMask(e.target.value))}
                  placeholder="R$ 0,00"
                  disabled={!isEditing && !!editingExpense}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Conta de luz do mês"
                disabled={!isEditing && !!editingExpense}
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter>
            {editingExpense && !isEditing ? (
              <>
                <Button variant="outline" onClick={() => resetForm()}>
                  Fechar
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  Editar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => resetForm()}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  {editingExpense ? "Salvar" : "Adicionar"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.
              {expenseToDelete && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="font-medium">{getExpenseTypeLabel(expenseToDelete.expenseType)}</p>
                  <p className="text-sm text-muted-foreground">
                    {getMonthName(expenseToDelete.referenceMonth)}/{expenseToDelete.referenceYear} - {formatCurrency(expenseToDelete.amount)}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => expenseToDelete && handleDelete(expenseToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}