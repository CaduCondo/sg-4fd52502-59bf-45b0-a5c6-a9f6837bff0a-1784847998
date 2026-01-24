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
import { AlertCircle, AlertTriangle, Info, Trash2, XCircle } from "lucide-react";

type ConfirmVariant = "default" | "destructive" | "warning" | "info";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

const variantConfig = {
  default: {
    icon: Info,
    iconColor: "text-blue-600 dark:text-blue-400",
    buttonClass: "bg-blue-600 hover:bg-blue-700",
  },
  destructive: {
    icon: Trash2,
    iconColor: "text-red-600 dark:text-red-400",
    buttonClass: "bg-red-600 hover:bg-red-700",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-amber-600 dark:text-amber-400",
    buttonClass: "bg-amber-600 hover:bg-amber-700",
  },
  info: {
    icon: AlertCircle,
    iconColor: "text-slate-600 dark:text-slate-400",
    buttonClass: "bg-slate-600 hover:bg-slate-700",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={config.buttonClass}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}