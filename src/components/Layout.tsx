import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  Home,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Lock,
  ChevronDown,
  Calculator
} from "lucide-react";
import { logout, getCurrentUser } from "@/lib/auth";
import { User as UserType } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userStorage } from "@/lib/storage";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [menuOpen, setMenuOpen] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Profile edit state
  const [profileName, setProfileName] = useState("");
  const [profileRg, setProfileRg] = useState("");
  const [profileCpf, setProfileCpf] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setProfileName(currentUser.name);
      setProfileRg(currentUser.rg || "");
      setProfileCpf(currentUser.cpf || "");
      setProfilePhone(currentUser.phone || "");
      setProfileEmail(currentUser.email || "");
    }
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleSaveProfile = () => {
    if (!user) return;
    
    const updatedUser: UserType = {
      ...user,
      name: profileName,
      rg: profileRg,
      cpf: profileCpf,
      phone: profilePhone,
      email: profileEmail,
    };
    
    userStorage.update(updatedUser);
    
    // Update localStorage auth
    if (typeof window !== "undefined") {
      localStorage.setItem("rental_auth_user", JSON.stringify(updatedUser));
    }
    
    setUser(updatedUser);
    setShowProfileDialog(false);
    alert("Perfil atualizado com sucesso!");
  };

  const handleChangePassword = () => {
    if (!user) return;
    
    if (currentPassword !== user.password) {
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
      ...user,
      password: newPassword,
    };
    
    userStorage.update(updatedUser);
    
    // Update localStorage auth
    if (typeof window !== "undefined") {
      localStorage.setItem("rental_auth_user", JSON.stringify(updatedUser));
    }
    
    setUser(updatedUser);
    setShowPasswordDialog(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    alert("Senha alterada com sucesso!");
  };

  const isActive = (path: string) => router.pathname === path;

  // Menu items based on user role
  const getMenuItems = () => {
    if (!user) return [];
    
    const allMenus = [
      { path: "/dashboard", icon: Home, label: "Dashboard", roles: ["admin", "corretor", "financeiro"] },
      { path: "/properties", icon: Building2, label: "Imóveis", roles: ["admin", "corretor"] },
      { path: "/tenants", icon: Users, label: "Inquilinos", roles: ["admin", "corretor"] },
      { path: "/rentals", icon: Building2, label: "Locações", roles: ["admin", "corretor"] },
      { path: "/payments", icon: DollarSign, label: "Pagamentos", roles: ["admin", "corretor"] },
      { path: "/financial", icon: Calculator, label: "Financeiro", roles: ["admin", "financeiro"] },
      { path: "/settings", icon: Settings, label: "Configurações", roles: ["admin"] },
    ];
    
    return allMenus.filter(menu => menu.roles.includes(user.role));
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
              
              <Link href="/dashboard" className="flex items-center space-x-2">
                <Building2 className="h-7 w-7 text-emerald-600" />
                <span className="text-lg font-bold text-slate-900">ImóvelControl</span>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <User size={18} />
                    <span className="hidden sm:inline">{user?.name}</span>
                    <ChevronDown size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
                    <User className="mr-2 h-4 w-4" />
                    Editar Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowPasswordDialog(true)}>
                    <Lock className="mr-2 h-4 w-4" />
                    Trocar Senha
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden lg:flex space-x-1 pb-3 overflow-x-auto">
            {menuItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <Button 
                  variant={isActive(item.path) ? "default" : "ghost"}
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
        
        {/* Mobile Menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white">
            <div className="px-4 py-3 space-y-1">
              {menuItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <Button 
                    variant={isActive(item.path) ? "default" : "ghost"}
                    size="sm"
                    className="w-full justify-start flex items-center space-x-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      {/* Edit Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-name">Nome Completo</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="profile-rg">RG</Label>
              <Input
                id="profile-rg"
                value={profileRg}
                onChange={(e) => setProfileRg(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="profile-cpf">CPF</Label>
              <Input
                id="profile-cpf"
                value={profileCpf}
                onChange={(e) => setProfileCpf(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="profile-phone">Celular</Label>
              <Input
                id="profile-phone"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleSaveProfile} className="flex-1">
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setShowProfileDialog(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
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