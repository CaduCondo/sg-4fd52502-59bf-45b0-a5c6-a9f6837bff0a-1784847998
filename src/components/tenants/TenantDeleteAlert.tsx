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
import { Tenant } from "@/types";

interface TenantDeleteAlertProps {
  open: boolean;
  tenant: Tenant | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function TenantDeleteAlert({
  open,
  tenant,
  onConfirm,
  onCancel,
}: TenantDeleteAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Inquilino</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o inquilino <strong>{tenant?.name}</strong>? Esta ação não pode ser desfeita e removerá permanentemente todos os dados associados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Excluir Inquilino
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}