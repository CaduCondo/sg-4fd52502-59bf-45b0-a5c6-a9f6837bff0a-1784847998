import { useState } from "react";
import { SystemUser } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Unlock, Key, Trash2 } from "lucide-react";
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

interface UsersTabProps {
  users: SystemUser[];
  isLoading: boolean;
  onCreateUser: (userData: any) => Promise<boolean>;
  onUpdateUser: (id: string, userData: any) => Promise<boolean>;
  onDeleteUser: (id: string) => Promise<boolean>;
  onToggleStatus: (user: SystemUser) => Promise<boolean>;
  onResetPassword: (userId: string) => Promise<void>;
}

export function UsersTab({
  users,
  isLoading,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onToggleStatus,
  onResetPassword,
}: UsersTabProps) {
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);

  const openUserDialog = (user?: SystemUser) => {
    setEditingUser(user || null);
    setIsUserDialogOpen(true);
  };

  const handleUserSave = async (userData: any) => {
    if (editingUser) {
      return await onUpdateUser(editingUser.id, userData);
    } else {
      return await onCreateUser(userData);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    
    try {
      const success = await onDeleteUser(userToDelete.id);
      if (success) {
        setUserToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      setUserToDelete(null);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-semibold">Usuários do Sistema</h2>
        <Button onClick={() => openUserDialog()} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 h-11 sm:h-10">
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando usuários...</div>
          ) : (
            <div className="table-wrapper">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nome</TableHead>
                    <TableHead className="min-w-[200px]">Email</TableHead>
                    <TableHead className="min-w-[100px]">Perfil</TableHead>
                    <TableHead className="min-w-[80px]">Status</TableHead>
                    <TableHead className="text-right min-w-[200px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "admin"
                              ? "default"
                              : user.role === "financial"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {user.role === "admin"
                            ? "Admin"
                            : user.role === "financial"
                            ? "Financeiro"
                            : "Corretor"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.active ? "success" : "destructive"}
                          className={
                            user.active
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs"
                              : "text-xs"
                          }
                        >
                          {user.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2 flex-wrap">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openUserDialog(user)}
                            className="h-9 px-2 sm:px-3 text-xs sm:text-sm"
                          >
                            <Edit className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline">Editar</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggleStatus(user)}
                            className={`h-9 w-9 flex-shrink-0 ${
                              !user.active
                                ? "text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                : "text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            }`}
                            title={user.active ? "Bloquear" : "Desbloquear"}
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onResetPassword(user.id)}
                            className="h-9 w-9 flex-shrink-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            title="Zerar Senha"
                          >
                            <Key className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setUserToDelete(user)}
                            className="h-9 w-9 flex-shrink-0 text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UserDialog
        open={isUserDialogOpen}
        onOpenChange={setIsUserDialogOpen}
        user={editingUser || undefined}
        onSave={handleUserSave}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong>? Esta ação não pode ser desfeita e removerá todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
            <Button
              onClick={async (e) => {
                (e.target as HTMLButtonElement).blur();
                await handleConfirmDelete();
              }}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700"
            >
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}