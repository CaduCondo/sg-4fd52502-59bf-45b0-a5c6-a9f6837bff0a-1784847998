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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Usuários do Sistema</h2>
        <Button onClick={() => openUserDialog()} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando usuários...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "admin"
                            ? "default"
                            : user.role === "financial"
                            ? "secondary"
                            : "outline"
                        }
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
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : ""
                        }
                      >
                        {user.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openUserDialog(user)}>
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onToggleStatus(user)}
                          className={`h-8 w-8 ${
                            !user.active
                              ? "text-green-600 hover:text-green-700 hover:bg-green-50"
                              : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          }`}
                          title={user.active ? "Bloquear" : "Desbloquear"}
                        >
                          <Unlock className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onResetPassword(user.id)}
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Zerar Senha"
                        >
                          <Key className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setUserToDelete(user)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.name}</strong>? Esta ação não pode ser desfeita e removerá todos os dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              onClick={async (e) => {
                (e.target as HTMLButtonElement).blur();
                await handleConfirmDelete();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}