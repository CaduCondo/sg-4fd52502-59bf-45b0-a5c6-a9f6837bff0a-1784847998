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
  const { toast } = useToast();
  const [selectedUserForLocations, setSelectedUserForLocations] = useState<SystemUser | null>(null);
  const [selectedUserForFeeExemption, setSelectedUserForFeeExemption] = useState<SystemUser | null>(null);
  const [userLocationPermissions, setUserLocationPermissions] = useState<string[]>([]);
  const [isLocationPermissionsDialogOpen, setIsLocationPermissionsDialogOpen] = useState(false);
  const [isFeeExemptionDialogOpen, setIsFeeExemptionDialogOpen] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [permissionsSet, setPermissionsSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log("🔄 Sincronizando permissões:", roleMenuPermissions);
    const newSet = new Set<string>();
    
    roleMenuPermissions.forEach(perm => {
      const key = `${perm.role}-${perm.menu_id}`;
      newSet.add(key);
    });
    
    console.log("📊 Set de permissões criado:", Array.from(newSet));
    setPermissionsSet(newSet);
  }, [roleMenuPermissions]);

  const hasPermission = (role: string, menuItem: string): boolean => {
    const key = `${role}-${menuItem}`;
    const has = permissionsSet.has(key);
    console.log(`🔍 Verificando permissão: ${key} = ${has}`);
    return has;
  };

  const togglePermission = async (role: string, menuItem: string) => {
    if (isSaving) {
      console.log("⏳ Já está salvando, aguarde...");
      return;
    }
    
    setIsSaving(true);
    const key = `${role}-${menuItem}`;
    const currentHasAccess = hasPermission(role, menuItem);
    const newHasAccess = !currentHasAccess;
    
    console.log(`🔄 Toggle: ${key}, Atual: ${currentHasAccess}, Novo: ${newHasAccess}`);
    
    setPermissionsSet(prev => {
      const newSet = new Set(prev);
      if (newHasAccess) {
        newSet.add(key);
      } else {
        newSet.delete(key);
      }
      console.log("📊 Novo set:", Array.from(newSet));
      return newSet;
    });
    
    try {
      const success = await onUpdateRoleMenuPermission(role, menuItem, newHasAccess);
      
      if (!success) {
        console.log("❌ Falha ao salvar, revertendo...");
        setPermissionsSet(prev => {
          const newSet = new Set(prev);
          if (currentHasAccess) {
            newSet.add(key);
          } else {
            newSet.delete(key);
          }
          return newSet;
        });
      } else {
        console.log("✅ Permissão salva com sucesso!");
      }
    } catch (error) {
      console.error("❌ Erro ao alternar permissão:", error);
      
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Shield className="h-5 w-5 flex-shrink-0" />
            <span>Permissões de Menu por Perfil</span>
          </CardTitle>
          <CardDescription className="text-sm">Controle quais menus cada perfil de usuário pode acessar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border table-wrapper">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px] sm:w-[200px] font-semibold">Menu</TableHead>
                  {roles.map((role) => (
                    <TableHead key={role} className="text-center min-w-[100px] font-semibold">
                      <span className="hidden sm:inline">{roleLabels[role]}</span>
                      <span className="sm:hidden text-xs">{roleLabels[role].substring(0, 5)}</span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {menuItems.map((menuItem) => (
                  <TableRow key={menuItem}>
                    <TableCell className="font-medium text-sm">{menuLabels[menuItem]}</TableCell>
                    {roles.map((role) => {
                      const hasAccess = hasPermission(role, menuItem);
                      return (
                        <TableCell key={role} className="text-center">
                          <button
                            onClick={() => togglePermission(role, menuItem)}
                            className="inline-flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 touch-target"
                            disabled={isLoading || isSaving}
                          >
                            {hasAccess ? (
                              <CheckCircle2 className="h-6 w-6 sm:h-7 sm:w-7 text-green-600 dark:text-green-400" />
                            ) : (
                              <XCircle className="h-6 w-6 sm:h-7 sm:w-7 text-red-600 dark:text-red-400" />
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
          <p className="text-xs sm:text-sm text-muted-foreground mt-4">
            💡 <strong>Dica:</strong> Clique nos ícones para habilitar/desabilitar o acesso de cada perfil aos menus do sistema.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <MapPin className="h-5 w-5 flex-shrink-0" />
            <span>Permissões de Local (Usuários Financeiros)</span>
          </CardTitle>
          <CardDescription className="text-sm">
            Defina quais locais cada usuário financeiro pode visualizar no Dashboard e na página Financeiro
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.filter((u) => u.role === "financial").length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Nenhum usuário com perfil Financeiro cadastrado</div>
          ) : (
            <div className="space-y-3">
              {users
                .filter((u) => u.role === "financial")
                .map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                        <User className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">{user.name}</span>
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 w-full sm:w-auto h-10 sm:h-9 flex-shrink-0" 
                      onClick={() => openLocationPermissionsDialog(user)}
                    >
                      <MapPin className="h-3 w-3" />
                      Gerenciar Locais
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <DollarSign className="h-5 w-5 flex-shrink-0" />
            <span>Isenção de Taxa de Administração</span>
          </CardTitle>
          <CardDescription className="text-sm">Defina quais locais cada corretor NÃO receberá taxa de administração</CardDescription>
        </CardHeader>
        <CardContent>
          {users.filter((u) => u.role === "broker").length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Nenhum corretor cadastrado</div>
          ) : (
            <div className="space-y-4">
              {users
                .filter((u) => u.role === "broker")
                .map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm sm:text-base truncate">{user.name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">Configurar locais sem taxa de administração</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openFeeExemptionDialog(user)}
                      className="w-full sm:w-auto h-10 sm:h-9 gap-2 flex-shrink-0"
                    >
                      <SettingsIcon className="h-4 w-4" />
                      Configurar Isenção
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isLocationPermissionsDialogOpen} onOpenChange={setIsLocationPermissionsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Gerenciar Locais - {selectedUserForLocations?.name}</DialogTitle>
            <DialogDescription className="text-sm">Selecione os locais que este usuário pode visualizar no Dashboard e na página Financeiro</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingPermissions ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Carregando locais...</div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Nenhum local cadastrado</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-lg p-4 smooth-scroll">
                {locations.map((location) => (
                  <div key={location.id} className="flex items-center gap-3 p-3 border rounded hover:bg-accent/50 transition-colors touch-target">
                    <Checkbox
                      id={`perm-${location.id}`}
                      checked={userLocationPermissions.includes(location.id)}
                      onCheckedChange={() => handleToggleLocationPermission(location.id)}
                      className="flex-shrink-0"
                    />
                    <label htmlFor={`perm-${location.id}`} className="flex-1 cursor-pointer min-w-0">
                      <div className="font-medium text-sm truncate">{location.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {location.city}, {location.state}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsLocationPermissionsDialogOpen(false)} className="w-full sm:w-auto h-11">
              Cancelar
            </Button>
            <Button onClick={handleSaveLocationPermissions} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 h-11">
              Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isFeeExemptionDialogOpen && selectedUserForFeeExemption && (
        <FeeExemptionDialog
          open={isFeeExemptionDialogOpen}
          onOpenChange={setIsFeeExemptionDialogOpen}
          user={selectedUserForFeeExemption}
          locations={locations}
          onSave={handleSaveFeeExemptions}
          getUserExemptions={getUserFeeExemptions}
        />
      )}
    </div>
  );
}