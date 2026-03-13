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
import { RoleMenuPermission, SystemUser, Location } from "@/types";
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
import { useToast } from "@/hooks/use-toast";

interface PermissionsTabProps {
  users: SystemUser[];
  locations: Location[];
  roleMenuPermissions: RoleMenuPermission[];
  isLoading: boolean;
  onUpdateRoleMenuPermission: (role: string, menuItem: string, hasAccess: boolean) => Promise<boolean>;
  onSaveLocationPermissions: (userId: string, locationIds: string[]) => Promise<boolean>;
  onSaveFeeExemptions: (locationIds: string[]) => Promise<boolean>;
  getUserLocationPermissions: (userId: string) => Promise<string[]>;
  getFeeExemptions: () => Promise<string[]>;
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
  getFeeExemptions,
}: PermissionsTabProps) {
  const { toast } = useToast();
  const [selectedUserForLocations, setSelectedUserForLocations] = useState<SystemUser | null>(null);
  const [isFeeExemptionDialogOpen, setIsFeeExemptionDialogOpen] = useState(false);
  const [userLocationPermissions, setUserLocationPermissions] = useState<string[]>([]);
  const [isLocationPermissionsDialogOpen, setIsLocationPermissionsDialogOpen] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [permissionsSet, setPermissionsSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newSet = new Set<string>();
    roleMenuPermissions.forEach(perm => {
      const key = `${perm.role}-${perm.menu_id}`;
      newSet.add(key);
    });
    setPermissionsSet(newSet);
  }, [roleMenuPermissions]);

  const hasPermission = (role: string, menuItem: string): boolean => {
    const key = `${role}-${menuItem}`;
    return permissionsSet.has(key);
  };

  const togglePermission = async (role: string, menuItem: string) => {
    if (isSaving) return;
    setIsSaving(true);
    const key = `${role}-${menuItem}`;
    const currentHasAccess = hasPermission(role, menuItem);
    const newHasAccess = !currentHasAccess;

    setPermissionsSet(prev => {
      const newSet = new Set(prev);
      if (newHasAccess) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
      return newSet;
    });

    try {
      const success = await onUpdateRoleMenuPermission(role, menuItem, newHasAccess);
      if (!success) {
        setPermissionsSet(prev => {
          const newSet = new Set(prev);
          if (currentHasAccess) {
            newSet.add(key);
          } else {
            newSet.delete(key);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error("Erro ao alternar permissão:", error);
      setPermissionsSet(prev => {
        const newSet = new Set(prev);
        if (currentHasAccess) {
          newSet.add(key);
        } else {
          newSet.delete(key);
        }
        return newSet;
      });
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
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

  const openFeeExemptionDialog = () => {
    setIsFeeExemptionDialogOpen(true);
  };

  const handleSaveFeeExemptions = async (locationIds: string[]) => {
    return await onSaveFeeExemptions(locationIds);
  };

  return (
    <div className="space-y-4">
      {/* Permissões de Menu */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            Permissões de Menu por Perfil
          </CardTitle>
          <CardDescription className="text-xs">Controle o acesso de cada perfil aos menus do sistema</CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[140px] font-semibold text-xs py-2">Menu</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role} className="text-center font-semibold text-xs py-2">
                      {roleLabels[role]}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((menuItem) => (
                  <TableRow key={menuItem} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-xs py-2">{menuLabels[menuItem]}</TableCell>
                    {roles.map((role) => {
                      const hasAccess = hasPermission(role, menuItem);
                      return (
                        <TableCell key={role} className="text-center py-2">
                          <button
                            onClick={() => togglePermission(role, menuItem)}
                            className="inline-flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50"
                            disabled={isLoading || isSaving}
                          >
                            {hasAccess ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
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
        </CardContent>
      </Card>

      {/* Permissões de Locais por Usuário */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Permissões de Local (Financeiros) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" />
              Permissões de Locais
            </CardTitle>
            <CardDescription className="text-xs">Usuários Financeiros</CardDescription>
          </CardHeader>
          <CardContent className="pb-3">
            {users.filter((u) => u.role === "financial").length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-xs">
                Nenhum usuário financeiro
              </div>
            ) : (
              <div className="space-y-2">
                {users
                  .filter((u) => u.role === "financial")
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 border rounded-lg hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-xs truncate">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-[10px] px-2 ml-2 flex-shrink-0"
                        onClick={() => openLocationPermissionsDialog(user)}
                      >
                        Gerenciar
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Isenção de Taxa (Configuração Global) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4" />
              Isenção de Taxa Admin
            </CardTitle>
            <CardDescription className="text-xs">
              Configure quais locais são isentos de taxa de administração.
              Esta configuração se aplica a todos os corretores.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3 flex flex-col justify-center items-center h-[120px]">
            <Button 
              variant="outline" 
              className="w-full max-w-xs gap-2"
              onClick={openFeeExemptionDialog}
            >
              <SettingsIcon className="h-4 w-4" />
              Gerenciar Locais Isentos
            </Button>
            <p className="text-[10px] text-muted-foreground mt-2 text-center max-w-xs">
              Locais selecionados não gerarão cobrança de taxa de administração no sistema.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Permissões de Local */}
      <Dialog open={isLocationPermissionsDialogOpen} onOpenChange={setIsLocationPermissionsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Permissões de Locais - {selectedUserForLocations?.name}</DialogTitle>
            <DialogDescription className="text-xs">Selecione os locais que este usuário pode visualizar</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {isLoadingPermissions ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Carregando...</div>
            ) : locations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">Nenhum local cadastrado</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-3">
                {locations.map((location) => (
                  <div key={location.id} className="flex items-center gap-2 p-2 border rounded hover:bg-accent/50">
                    <Checkbox
                      id={`loc-${location.id}`}
                      checked={userLocationPermissions.includes(location.id)}
                      onCheckedChange={() => handleToggleLocationPermission(location.id)}
                    />
                    <label htmlFor={`loc-${location.id}`} className="flex-1 cursor-pointer">
                      <p className="font-medium text-sm">{location.name}</p>
                      <p className="text-xs text-muted-foreground">{location.city}, {location.state}</p>
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
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Isenção de Taxa */}
      {isFeeExemptionDialogOpen && (
        <FeeExemptionDialog
          open={isFeeExemptionDialogOpen}
          onOpenChange={setIsFeeExemptionDialogOpen}
          locations={locations}
          onSave={handleSaveFeeExemptions}
          getExemptions={getFeeExemptions}
        />
      )}
    </div>
  );
}