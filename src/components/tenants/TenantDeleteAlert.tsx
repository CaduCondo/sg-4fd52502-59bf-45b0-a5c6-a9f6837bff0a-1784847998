import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tenant } from "@/types";
import { Button } from "@/components/ui/button";

interface TenantDeleteAlertProps {
  open: boolean;
  tenant: Tenant | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TenantDeleteAlert({ open, tenant, onConfirm, onCancel }: TenantDeleteAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o inquilino <strong>{tenant?.name}</strong>?
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <Button onClick={(e) => { onConfirm(); (e.target as HTMLElement).blur(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Excluir
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}