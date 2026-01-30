import { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { RoleMenuPermission, UserLocationPermission, SystemUser, Location } from "@/types";
import { FeeExemptionDialog } from "./FeeExemptionDialog";
import { 
  CheckCircle2, 
  XCircle, 
  User, 
  Settings as SettingsIcon,
  MapPin, 
  Shield, 
  DollarSign 
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PermissionsTabProps {
  users: SystemUser[];
  locations: Location[];
  roleMenuPermissions: RoleMenuPermission[];
  isLoading: boolean;
  onUpdateRoleMenuPermission: (role: string, menuItem: string, hasAccess: boolean) => Promise<boolean>;
  onSaveLocationPermissions: (userId: string, locationIds: string[]) => Promise<boolean>;
  onSaveFeeExemptions: (userId: string, locationIds: string[]) => Promise<boolean>;
  getUserLocationPermissions: (userId: string) => Promise<string[]>;
  getUserFeeExemptions: (userId: string) => Promise<string[]>;
}

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  broker: "Corretor",
  financial: "Financeiro",
};

const menuLabels: Record<string, string> = {
  dashboard: "Dashboard",
  properties: "Imóveis",
  tenants: "Inquilinos",
  rentals: "Locações",
  payments: "Recebimentos",
  financial: "Financeiro",
  settings: "Configurações",
};

const menuItems = ["dashboard", "properties", "tenants", "rentals", "payments", "financial", "settings"];
const roles = ["admin", "broker", "financial"];

export function PermissionsTab({
  users,
  locations,
  roleMenuPermissions,
  isLoading,
  onUpdateRoleMenuPermission,
  onSaveLocationPermissions,
  onSaveFeeExemptions,
  getUserLocationPermissions,
  getUserFeeExemptions,
}: PermissionsTabProps) {
  const [selectedUserForLocations, setSelectedUserForLocations] = useState<SystemUser | null>(null);
  const [selectedUserForFeeExemption, setSelectedUserForFeeExemption] = useState<SystemUser | null>(null);
  const [userLocationPermissions, setUserLocationPermissions] = useState<string[]>([]);
  const [isLocationPermissionsDialogOpen, setIsLocationPermissionsDialogOpen] = useState(false);
  const [isFeeExemptionDialogOpen, setIsFeeExemptionDialogOpen] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

  const getMenuPermission = (role: string, menuItem: string): boolean => {
    // Check if property is menu_item or menu_id based on Type definition
    const perm = roleMenuPermissions.find((p) => p.role === role && (p.menu_id === menuItem || (p as any).menu_item === menuItem));
    // Fallback safely if property names vary in DB types vs Frontend types
    return perm ? ((perm as any).can_access ?? (perm as any).has_access ?? false) : false;
  };

  const togglePermission = async (role: string, menuItem: string) => {
    const hasAccess = getMenuPermission(role, menuItem);
    await onUpdateRoleMenuPermission(role, menuItem, !hasAccess);
  };

  const openLocationPermissionsDialog = async (user: SystemUser) => {
    setSelectedUserForLocations(user);
    setIsLoadingPermissions(true);
    try {
      const permissions = await getUserLocationPermissions(user.id);
      setUserLocationPermissions(permissions);
      setIsLocationPermissionsDialogOpen(true);
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
    } finally {
      setIsLoadingPermissions(false);
    }
  };

  const handleToggleLocationPermission = (locationId: string) => {
    setUserLocationPermissions((prev) =>
      prev.includes(locationId) ? prev.filter((id) => id !== locationId) : [...prev, locationId]
    );
  };

  const handleSaveLocationPermissions = async () => {
    if (!selectedUserForLocations) return;
    const success = await onSaveLocationPermissions(selectedUserForLocations.id, userLocationPermissions);
    if (success) {
      setIsLocationPermissionsDialogOpen(false);
    }
  };

  const openFeeExemptionDialog = (user: SystemUser) => {
    setSelectedUserForFeeExemption(user);
    setIsFeeExemptionDialogOpen(true);
  };

  const handleSaveFeeExemptions = async (locationIds: string[]) => {
    if (!selectedUserForFeeExemption) return false;
    return await onSaveFeeExemptions(selectedUserForFeeExemption.id, locationIds);
  };

  return (
    <div className="space-y-6">
      {/* Permissões de Menu por Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões de Menu por Perfil
          </CardTitle>
          <CardDescription>Controle quais menus cada perfil de usuário pode acessar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Menu</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role} className="text-center">
                      {roleLabels[role]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((menuItem) => (
                  <TableRow key={menuItem}>
                    <TableCell className="font-medium">{menuLabels[menuItem]}</TableCell>
                    {roles.map((role) => {
                      const hasAccess = getMenuPermission(role, menuItem);
                      return (
                        <TableCell key={role} className="text-center">
                          <button
                            onClick={() => togglePermission(role, menuItem)}
                            className="inline-flex items-center justify-center"
                          >
                            {hasAccess ? (
                              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                            )}
                          </button>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            💡 <strong>Dica:</strong> Clique nos ícones para habilitar/desabilitar o acesso de cada perfil aos menus do sistema.
          </p>
        </CardContent>
      </Card>

      {/* Permissões de Local por Usuário Financeiro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Permissões de Local (Usuários Financeiros)
          </CardTitle>
          <CardDescription>
            Defina quais locais cada usuário financeiro pode visualizar na página Financeiro
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.filter((u) => u.role === "financial").length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum usuário com perfil Financeiro cadastrado</div>
          ) : (
            <div className="space-y-3">
              {users
                .filter((u) => u.role === "financial")
                .map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        {user.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => openLocationPermissionsDialog(user)}>
                      <MapPin className="h-3 w-3" />
                      Gerenciar Locais
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Isenção de Taxa de Administração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Isenção de Taxa de Administração
          </CardTitle>
          <CardDescription>Defina quais locais cada corretor NÃO receberá taxa de administração</CardDescription>
        </CardHeader>
        <CardContent>
          {users.filter((u) => u.role === "broker").length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum corretor cadastrado</div>
          ) : (
            <div className="space-y-4">
              {users
                .filter((u) => u.role === "broker")
                .map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{user.name}</h4>
                        <p className="text-sm text-muted-foreground">Configurar locais sem taxa de administração</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openFeeExemptionDialog(user)}>
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      Configurar Isenção
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Permissões de Locais */}
      <Dialog open={isLocationPermissionsDialogOpen} onOpenChange={setIsLocationPermissionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Locais - {selectedUserForLocations?.name}</DialogTitle>
            <DialogDescription>Selecione os locais que este usuário pode visualizar na página Financeiro</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingPermissions ? (
              <div className="text-center py-8 text-muted-foreground">Carregando locais...</div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum local cadastrado</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-4">
                {locations.map((location) => (
                  <div key={location.id} className="flex items-center gap-3 p-3 border rounded hover:bg-accent/50 transition-colors">
                    <Checkbox
                      id={`perm-${location.id}`}
                      checked={userLocationPermissions.includes(location.id)}
                      onCheckedChange={() => handleToggleLocationPermission(location.id)}
                    />
                    <label htmlFor={`perm-${location.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium">{location.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {location.city}, {location.state}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLocationPermissionsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLocationPermissions} className="bg-emerald-600 hover:bg-emerald-700">
              Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Isenção de Taxa */}
      <FeeExemptionDialog
        open={isFeeExemptionDialogOpen}
        onOpenChange={setIsFeeExemptionDialogOpen}
        user={selectedUserForFeeExemption || undefined}
        locations={locations}
        onSave={handleSaveFeeExemptions}
        getUserExemptions={getUserFeeExemptions}
      />
    </div>
  );
}