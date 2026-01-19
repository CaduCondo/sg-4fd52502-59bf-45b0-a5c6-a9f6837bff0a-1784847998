import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useScrollProgress, useScrollDirection } from "@/hooks/useScrollProgress";
import {
  Building2,
  Users,
  Home,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  User,
  Lock,
  ChevronDown,
  Calculator,
  Camera,
  LayoutDashboard,
  FileText,
  TrendingUp
} from "lucide-react";
import { logout } from "@/lib/auth";
import { User as UserType, SystemUser } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userStorage } from "@/lib/storage";
import { getUserById } from "@/services/systemUserService";
import { useToast } from "@/hooks/use-toast";
import { EditProfileDialog } from "./EditProfileDialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserType | SystemUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  // Scroll effects
  const scrollProgress = useScrollProgress();
  const scrollDirection = useScrollDirection();

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      // Simulação de autenticação - pegar ID do localStorage ou usar mock
      // Em produção, isso viria do contexto de auth
      const storedUserId = localStorage.getItem("userId");
      const mockUserId = "5fa0af84-d74e-4cc0-80c0-1ccfd87c20b9"; // ID do admin mockado
      
      try {
        const userData = await getUserById(storedUserId || mockUserId);
        setUser(userData);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      }
    };

    loadUser();
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleChangePassword = () => {
    if (!user) return;

    // Type guard for legacy User type which has password
    const legacyUser = user as UserType;
    if (legacyUser.password && currentPassword !== legacyUser.password) {
      alert("Senha atual incorreta!");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }

    if (newPassword.length < 6) {
      alert("A nova senha deve ter no mínimo 6 caracteres!");
      return;
    }

    const updatedUser: UserType = {
      ...legacyUser,
      password: newPassword,
    };

    // Atualizar storage - cast to any/SystemUser compatible if needed for legacy
    // The storage expects SystemUser but legacy code uses UserType
    // For now we force cast to avoid the error since we are transitioning
    userStorage.save(updatedUser as unknown as SystemUser);
    
    // Atualizar estado local
    setUser(updatedUser);
    
    toast({
      title: "Senha alterada com sucesso!",
      description: "Sua senha foi atualizada com sucesso.",
      variant: "default",
    });

    setShowPasswordDialog(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const isActive = (path: string) => router.pathname === path;

  const roleDisplayName = (role?: string) => {
    const roleMap: Record<string, string> = {
      admin: "Administrador",
      broker: "Corretor",
      financial: "Financeiro",
      user: "Usuário",
    };
    return roleMap[role || "user"] || "Usuário";
  };

  // Função para verificar se o menu deve ser exibido baseado no perfil do usuário
  const shouldShowMenu = (menuPath: string) => {
    if (!user?.role) return true;

    // Corretor: Oculta apenas Configurações
    if (user.role === "broker") {
      return menuPath !== "/settings";
    }

    // Financeiro: Mostra apenas Dashboard e Financeiro
    if (user.role === "financial") {
      return menuPath === "/dashboard" || menuPath === "/financial";
    }

    // Admin e User: Veem todos os menus
    return true;
  };

  const menuItems = [
    { 
      name: "Dashboard", 
      path: "/dashboard", 
      icon: <Home className="h-4 w-4" />,
      permission: "canViewDashboard" 
    },
    { 
      name: "Imóveis", 
      path: "/properties", 
      icon: <Building2 className="h-4 w-4" />,
      permission: "canViewProperties" 
    },
    { 
      name: "Inquilinos", 
      path: "/tenants", 
      icon: <Users className="h-4 w-4" />,
      permission: "canViewTenants" 
    },
    { 
      name: "Locações", 
      path: "/rentals", 
      icon: <FileText className="h-4 w-4" />,
      permission: "canViewRentals" 
    },
    { 
      name: "Recebimentos", 
      path: "/payments", 
      icon: <DollarSign className="h-4 w-4" />,
      permission: "canViewPayments" 
    },
    { 
      name: "Financeiro", 
      path: "/financial", 
      icon: <TrendingUp className="h-4 w-4" />,
      permission: "canViewFinancial" 
    },
    { 
      name: "Configurações", 
      path: "/settings", 
      icon: <Settings className="h-4 w-4" />,
      permission: "canViewSettings" 
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => 
    hasPermission(user?.role, item.permission as any)
  );

  const navigationItems = filteredMenuItems.filter(item => shouldShowMenu(item.path));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600 origin-left z-50"
        style={{ scaleX: scrollProgress / 100 }}
        initial={{ scaleX: 0 }}
        transition={{ duration: 0.1 }}
      />

      {/* Navbar */}
      <motion.nav
        className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm z-40"
        initial={{ y: 0 }}
        animate={{
          y: scrollDirection === "down" && scrollProgress > 5 ? -100 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            {/* LOGO - Left */}
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button - VISIBLE ONLY ON MOBILE */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                  <SheetHeader>
                    <SheetTitle className="text-left">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-emerald-600" />
                        <span className="font-bold text-slate-900">D</span>
                      </div>
                    </SheetTitle>
                  </SheetHeader>

                  {/* User Info Section */}
                  <div className="mt-6 mb-6">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      {user?.photo ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-600 flex-shrink-0">
                          <img 
                            src={user.photo} 
                            alt={user.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <User className="h-6 w-6 text-emerald-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                        <p className="text-xs text-slate-500">{roleDisplayName(user?.role)}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Navigation Links */}
                  <nav className="space-y-1">
                    {navigationItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      return (
                        <a
                          key={item.name}
                          href={item.path}
                          className={cn(
                            "-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 hover:bg-slate-50",
                            active ? "text-emerald-600" : "text-slate-900"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {item.icon}
                            {item.name}
                          </div>
                        </a>
                      );
                    })}
                  </nav>

                  <Separator className="my-4" />

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-11"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setShowPasswordDialog(true);
                      }}
                    >
                      <Lock className="h-5 w-5" />
                      <span className="text-sm font-medium">Trocar Senha</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-11 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="text-sm font-medium">Sair</span>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
                <Building2 className="h-6 w-6 text-emerald-600" />
                <span className="font-bold text-slate-900 text-base sm:text-lg">D&apos;Uvo Enterprise</span>
              </Link>
            </div>

            {/* MENU DESKTOP - Center - HIDDEN ON MOBILE */}
            <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
              {navigationItems.map((item) => {
                const isActive = router.pathname === item.path;
                
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    className={cn(
                      "group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6",
                      isActive
                        ? "bg-slate-50 text-emerald-600 dark:bg-slate-800 dark:text-emerald-400"
                        : "text-slate-700 hover:bg-slate-50 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                    )}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* USER PROFILE - Right - HIDDEN ON MOBILE */}
            <div className="hidden md:flex items-center gap-2 flex-shrink-0">
              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10 border-2 border-emerald-600/20">
                      <AvatarImage src={user?.photo} alt={user?.name} className="object-cover" />
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 font-medium">
                        {user?.name?.substring(0, 2).toUpperCase() || "US"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{roleDisplayName(user?.role)}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowProfileDialog(true)} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Editar Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowPasswordDialog(true)} className="cursor-pointer">
                    <Lock className="mr-2 h-4 w-4" />
                    Trocar Senha
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <motion.main
        className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.main>

      {/* Edit Profile Dialog */}
      {user?.id && (
        <EditProfileDialog
          user={user as unknown as import("@/types").SystemUser}
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          onSuccess={() => {
            // Reload to ensure data sync
            window.location.reload();
          }}
        />
      )}

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trocar Senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-password">Senha Atual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleChangePassword} className="flex-1">
                Alterar Senha
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPasswordDialog(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }} 
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}