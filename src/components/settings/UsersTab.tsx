import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Plus, Edit, Trash2, Key, Ban, CheckCircle, Lock } from "lucide-react";
import { UserDialog } from "./UserDialog";
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
import { SystemUser } from "@/types";
import { forceDialogCleanup } from "@/lib/forceCleanup";

interface UsersTabProps {
  users: SystemUser[];
  isLoading: boolean;
  onCreateUser: (userData: Partial<SystemUser>) => Promise<boolean>;
  onUpdateUser: (id: string, userData: Partial<SystemUser>) => Promise<boolean>;
  onDeleteUser: (id: string) => Promise<boolean>;
  onResetPassword: (id: string) => Promise<boolean>;
  onToggleStatus: (id: string) => Promise<boolean>;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  broker: "Corretor",
  financial: "Financeiro",
};

// Helper para determinar o status real do usuário
function getUserStatus(user: SystemUser): {
  type: "blocked_temp" | "inactive" | "active";
  label: string;
  variant: "destructive" | "secondary" | "default";
  icon: typeof Lock | typeof Ban | typeof CheckCircle;
  timeLeft?: string;
} {
  // PRIORIDADE 1: Verificar bloqueio temporário (por tentativas de senha)
  if (user.blocked_until) {
    const blockedDate = new Date(user.blocked_until);
    const now = new Date();
    
    if (blockedDate > now) {
      const minutesLeft = Math.ceil((blockedDate.getTime() - now.getTime()) / 60000);
      return {
        type: "blocked_temp",
        label: "Bloqueado Temporariamente",
        variant: "destructive",
        icon: Lock,
        timeLeft: `${minutesLeft} min`,
      };
    }
  }
  
  // PRIORIDADE 2: Verificar se foi desativado permanentemente pelo admin
  if (!user.active) {
    return {
      type: "inactive",
      label: "Inativo",
      variant: "secondary",
      icon: Ban,
    };
  }
  
  // PRIORIDADE 3: Está ativo
  return {
    type: "active",
    label: "Ativo",
    variant: "default",
    icon: CheckCircle,
  };
}

export function UsersTab({
  users,
  isLoading,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onResetPassword,
  onToggleStatus,
}: UsersTabProps) {
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | undefined>();
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setIsUserDialogOpen(true);
  };

  const handleEditUser = (user: SystemUser) => {
    setSelectedUser(user);
    setIsUserDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setIsUserDialogOpen(false);
      setSelectedUser(undefined);
      
      // Use centralized cleanup with multiple attempts
      setTimeout(() => {
        forceDialogCleanup();
      }, 100);
      
      setTimeout(() => {
        forceDialogCleanup();
      }, 300);
      
      setTimeout(() => {
        forceDialogCleanup();
      }, 500);
    } else {
      setIsUserDialogOpen(true);
    }
  };

  const handleDeleteClick = (user: SystemUser) => {
    setUserToDelete(user);
  };

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      await onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  const handleToggleActive = async (userId: string) => {
    await onToggleStatus(userId);
  };

  const handleResetPassword = async (userId: string) => {
    await onResetPassword(userId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usuários do Sistema</CardTitle>
              <CardDescription>Gerencie os usuários e suas permissões de acesso</CardDescription>
            </div>
            <Button onClick={handleAddUser} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando usuários...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum usuário cadastrado</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const status = getUserStatus(user);
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{roleLabels[user.role]}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge 
                              variant={status.variant} 
                              className={`gap-1 w-fit ${
                                status.type === "active" ? "bg-green-600" : ""
                              }`}
                            >
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                            {status.timeLeft && (
                              <span className="text-xs text-muted-foreground">
                                Desbloqueio em {status.timeLeft}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(user.id)}>
                                {user.active ? (
                                  <>
                                    <Ban className="mr-2 h-4 w-4" />
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Ativar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                                <Key className="mr-2 h-4 w-4" />
                                Resetar Senha
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteClick(user)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserDialog
        open={isUserDialogOpen}
        onOpenChange={handleDialogClose}
        user={selectedUser}
        onSave={selectedUser ? (data) => onUpdateUser(selectedUser.id, data) : onCreateUser}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}