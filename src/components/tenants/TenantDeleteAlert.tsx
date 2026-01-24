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
  message?: string;
}

export function TenantDeleteAlert({
  open,
  tenant,
  onConfirm,
  onCancel,
  message,
}: TenantDeleteAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Inquilino</AlertDialogTitle>
          <AlertDialogDescription>
            {message || `Tem certeza que deseja excluir o inquilino ${tenant?.name ? <strong>{tenant.name}</strong> : "selecionado"}? Esta ação não pode ser desfeita e removerá permanentemente todos os dados associados.`}
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