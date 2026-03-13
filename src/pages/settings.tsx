import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { 
  Save, 
  MapPin, 
  Building2,
  Percent,
  AlertCircle,
  Coins,
  Plus,
  Pencil,
  Trash2,
  Users,
  Shield,
  Wallet,
  Wrench,
  RefreshCw
} from "lucide-react";

// Services
import { 
  getConfig, 
  updateConfig 
} from "@/services/configService";
import * as locationService from "@/services/locationService";
import * as locationExpenseService from "@/services/locationExpenseService";
import * as adminFeeExemptionService from "@/services/adminFeeExemptionService";

// Helpers
import {
  applyCnpjMask,
  applyPhoneMask,
  applyCepMask,
  parsePercentageToFloat,
  formatPercentage,
  applyPercentageMask
} from "@/lib/masks";

// Types
import { Location, CompanyConfig, SystemUser } from "@/types";

// New modular components
import { UsersTab } from "@/components/settings/UsersTab";
import { PermissionsTab } from "@/components/settings/PermissionsTab";
import { FeeExemptionDialog } from "@/components/settings/FeeExemptionDialog";
import { UserDialog } from "@/components/settings/UserDialog";

// Custom hooks
import { useUsers } from "@/hooks/useUsers";
import { usePermissions } from "@/hooks/usePermissions";
import { LocationExpensesDialog } from "@/components/settings/LocationExpensesDialog";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("company");

  // Config State
  const [config, setConfig] = useState<CompanyConfig>({
    id: "",
    company_name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    admin_fee_percentage: 0,
    management_fee_percentage: 0,
    late_fee_percentage: 0,
    interest_rate_percentage: 0,
    logo_url: null,
    primary_color: null,
    secondary_color: null,
    created_at: "",
    updated_at: "",
  });

  // State for form inputs (strings to handle formatting)
  const [adminFee, setAdminFee] = useState("0,000");
  const [managementFee, setManagementFee] = useState("0,000");
  const [lateFee, setLateFee] = useState("0,000");
  const [interestRate, setInterestRate] = useState("0,000");

  // Locations State
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [searchLocation, setSearchLocation] = useState("");
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zip_code: "",
    is_active: true,
  });
  const [selectedLocationForExpenses, setSelectedLocationForExpenses] = useState<Location | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);

  // Use custom hooks for users and permissions
  const { 
    permissions, 
    loading: permissionsLoading, 
    updateRoleMenuPermission, 
    saveLocationPermissions, 
    saveFeeExemptions,
    getUserLocationPermissions,
    getFeeExemptions
  } = usePermissions();

  const { 
    users, 
    isLoading: usersLoading,
    error: usersError, 
    refresh: refreshUsers,
    handleCreateUser,
    handleUpdateUser,
    handleDeleteUser,
    handleToggleUserStatus
  } = useUsers();

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      try {
        await Promise.all([
          loadConfig(),
          fetchLocations()
        ]);
      } catch (err) {
        console.error("Error loading settings data:", err);
      }
    };

    loadData();
  }, [user?.id]);

  const loadConfig = async () => {
    try {
      const data = await getConfig();
      if (data) {
        setConfig(data);
        setAdminFee(formatPercentage(data.admin_fee_percentage));
        setManagementFee(formatPercentage(data.management_fee_percentage || 0));
        setLateFee(formatPercentage(data.late_fee_percentage));
        setInterestRate(formatPercentage(data.interest_rate_percentage));
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as configurações.",
        variant: "destructive",
      });
    }
  };

  const fetchLocations = async () => {
    console.log("[UI] fetchLocations called - loading locations from database...");
    try {
      const data = await locationService.getLocations();
      console.log(`[UI] Loaded ${data.length} locations from database:`, data.map(l => ({ id: l.id, name: l.name })));
      setLocations(data);
    } catch (error) {
      console.error("[UI ERROR] Failed to fetch locations:", error);
      toast({ 
        title: "Erro ao carregar locais",
        description: "Não foi possível carregar a lista de locais.",
        variant: "destructive" 
      });
    }
  };

  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedConfig = {
      ...config,
      admin_fee_percentage: parsePercentageToFloat(adminFee),
      management_fee_percentage: parsePercentageToFloat(managementFee),
      late_fee_percentage: parsePercentageToFloat(lateFee),
      interest_rate_percentage: parsePercentageToFloat(interestRate),
    };
    try {
      await updateConfig(updatedConfig);
      toast({ title: "Configurações salvas com sucesso!" });
    } catch (error) {
      console.error("Erro ao salvar config:", error);
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    }
  };

  const handleCepLookup = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data && !data.erro) {
        setLocationForm((prev) => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf,
          is_active: prev.is_active,
        }));
      } else {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching CEP:", error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar o CEP.",
        variant: "destructive",
      });
    }
  };

  const handleLocationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("[SUBMIT] Form data:", locationForm);
    console.log("[SUBMIT] Editing location:", editingLocation);
    
    try {
      if (editingLocation) {
        console.log("[UPDATE] Updating location:", editingLocation.id);
        await locationService.updateLocation(editingLocation.id, {
          name: locationForm.name,
          street: locationForm.street,
          number: locationForm.number,
          complement: locationForm.complement || undefined,
          neighborhood: locationForm.neighborhood,
          city: locationForm.city,
          state: locationForm.state,
          zip_code: locationForm.zip_code,
        });
        toast({
          title: "Sucesso",
          description: "Local atualizado com sucesso.",
        });
      } else {
        console.log("[CREATE] Creating new location");
        await locationService.createLocation({
          name: locationForm.name,
          street: locationForm.street,
          number: locationForm.number,
          complement: locationForm.complement || undefined,
          neighborhood: locationForm.neighborhood,
          city: locationForm.city,
          state: locationForm.state,
          zip_code: locationForm.zip_code,
        });
        toast({
          title: "Sucesso",
          description: "Local cadastrado com sucesso.",
        });
      }

      setIsLocationDialogOpen(false);
      setEditingLocation(null);
      setLocationForm({
        name: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zip_code: "",
        is_active: true,
      });
      await fetchLocations();
    } catch (error: any) {
      console.error("[ERROR] Failed to save location:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar o local.",
        variant: "destructive",
      });
    }
  };

  const openLocationDialog = (location?: Location) => {
    if (location) {
      console.log("[DIALOG] Opening for edit:", location);
      setEditingLocation(location);
      setLocationForm({
        name: location.name,
        street: location.street || "",
        number: location.number || "",
        complement: location.complement || "",
        neighborhood: location.neighborhood || "",
        city: location.city,
        state: location.state,
        zip_code: location.zip_code || "",
        is_active: location.is_active !== false,
      });
    } else {
      console.log("[DIALOG] Opening for create");
      setEditingLocation(null);
      setLocationForm({
        name: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zip_code: "",
        is_active: true,
      });
    }
    setIsLocationDialogOpen(true);
  };

  const confirmDeleteLocation = async () => {
    if (!locationToDelete) return;

    console.log(`[UI DELETE] Starting deletion process for: ${locationToDelete.name} (${locationToDelete.id})`);
    
    // Close dialog immediately
    setLocationToDelete(null);
    setIsLoadingLocations(true);

    try {
      // Show processing toast
      toast({
        title: "Processando...",
        description: "Removendo local do sistema...",
      });

      console.log(`[UI DELETE] Calling locationService.deleteLocation(${locationToDelete.id})`);
      
      // Delete from database
      await locationService.deleteLocation(locationToDelete.id);
      
      console.log("[UI DELETE] Delete successful from database, updating UI...");

      // Remove from local state immediately (optimistic update)
      const oldCount = locations.length;
      setLocations(prev => prev.filter(loc => loc.id !== locationToDelete.id));
      const newCount = locations.length - 1;
      console.log(`[UI DELETE] Removed from state. Old count: ${oldCount}, New count: ${newCount}`);

      // Show success toast
      toast({
        title: "Sucesso!",
        description: "Local excluído com sucesso.",
      });

      // Wait a moment for database to sync
      await new Promise(resolve => setTimeout(resolve, 500));

      // Force complete reload from database
      console.log("[UI DELETE] Reloading locations list from database...");
      await fetchLocations();

      console.log("[UI DELETE] Process complete!");

    } catch (error: any) {
      console.error("[UI DELETE ERROR]", error);
      
      let errorMessage = "Não foi possível excluir o local.";
      
      if (error.message?.includes("propriedades") || 
          error.message?.includes("despesas") || 
          error.message?.includes("permissões")) {
        errorMessage = "Este local não pode ser excluído pois possui propriedades, despesas ou permissões vinculadas.";
      } else if (error.message?.includes("foreign key")) {
        errorMessage = "Este local possui dados vinculados e não pode ser excluído.";
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });

      // Reload to ensure UI shows current state
      await fetchLocations();
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const filteredLocations = locations.filter((location) => {
    const search = searchLocation.toLowerCase();
    return (
      location.name?.toLowerCase().includes(search) ||
      location.city?.toLowerCase().includes(search) ||
      location.neighborhood?.toLowerCase().includes(search)
    );
  });

  // --- Handlers para Usuários ---
  const handleCreateUser = async (userData: Partial<SystemUser>): Promise<boolean> => {
    try {
      if (!userData.email || !userData.name || !userData.role) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return false;
      }
      
      const created = await systemUserService.createUser(userData as Omit<SystemUser, "id" | "created_at" | "updated_at">);
      if (created) {
        toast({ title: "Usuário criado com sucesso!" });
        loadUsers();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o usuário.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleUpdateUser = async (id: string, userData: Partial<SystemUser>): Promise<boolean> => {
    try {
      const updated = await systemUserService.updateUser(id, userData);
      if (updated) {
        toast({ title: "Usuário atualizado com sucesso!" });
        loadUsers();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleDeleteUser = async (id: string): Promise<boolean> => {
    try {
      const deleted = await systemUserService.deleteUser(id);
      if (deleted) {
        toast({ title: "Usuário excluído com sucesso!" });
        loadUsers();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o usuário.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleToggleUserStatus = async (userId: string): Promise<boolean> => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return false;
      
      const updated = await systemUserService.updateUser(userId, {
        active: !user.active,
      });
      if (updated) {
        toast({ 
          title: `Usuário ${user.active ? 'bloqueado' : 'desbloqueado'} com sucesso!` 
        });
        loadUsers();
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Erro ao alterar status do usuário:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar o status do usuário.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleResetPassword = async (userId: string): Promise<boolean> => {
    try {
      // In a real app, you would call a method to send a reset email or set a default password
      const updated = await systemUserService.updateUser(userId, {
        password_hash: "mudar123", // Default password for reset
      });
      
      if (updated) {
        toast({ 
          title: "Senha resetada com sucesso!", 
          description: "A nova senha temporária é: mudar123" 
        });
        return true;
      }
      return false;
    } catch (error: any) {
      console.error("Erro ao resetar senha:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível resetar a senha.",
        variant: "destructive",
      });
      return false;
    }
  };

  // --- Handlers para Permissões ---
  const handleUpdateRolePermission = async (role: string, menuItem: string, hasAccess: boolean): Promise<boolean> => {
    try {
      const updated = await updateRoleMenuPermission(role, menuItem, hasAccess);
      if (updated) {
        toast({ title: "Permissão atualizada com sucesso!" });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao atualizar permissão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a permissão.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSaveLocationPermissions = async (locationId: string, permissions: any): Promise<boolean> => {
    try {
      const updated = await saveLocationPermissions(locationId, permissions);
      if (updated) {
        toast({ title: "Permissões salvas com sucesso!" });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao salvar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as permissões.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSaveFeeExemptions = async (exemptions: any): Promise<boolean> => {
    try {
      const updated = await saveFeeExemptions(exemptions);
      if (updated) {
        toast({ title: "Exemções salvas com sucesso!" });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao salvar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as exemções.",
        variant: "destructive",
      });
      return false;
    }
  };

  const loadLocations = async () => {
    try {
      setIsLoadingLocations(true);
      const data = await locationService.getLocations();
      setLocations(data || []);
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de locais.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const loadUsers = async () => {
    try {
      await refreshUsers();
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    }
  };

  const loadFeeExemptions = async () => {
    try {
      await loadFeeExemptions();
    } catch (error) {
      console.error("Erro ao carregar exemções:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as exemções.",
        variant: "destructive",
      });
    }
  };

  const loadPermissions = async () => {
    try {
      await loadPermissions();
    } catch (error) {
      console.error("Erro ao carregar permissões:", error);
      toast