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
  X,
  User,
  Lock,
  ChevronDown,
  Calculator,
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
import { systemUserService } from "@/services/systemUserService";
import { useToast } from "@/hooks/use-toast";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserType | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Scroll effects
  const scrollProgress = useScrollProgress();
  const scrollDirection = useScrollDirection();
  
  // Profile edit state
  const [profileName, setProfileName] = useState("");
  const [profileRg, setProfileRg] = useState("");
  const [profileCpf, setProfileCpf] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhoto, setProfilePhoto] = useState("");

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
      setProfilePhoto(currentUser.photo || "");
    }
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    if (!file.type.startsWith("image/")) {
      alert("Por favor, selecione apenas arquivos de imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("A imagem deve ter no máximo 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setProfilePhoto(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    try {
      console.log("💾 Salvando perfil via Supabase...");
      
      const updatedData = {
        name: profileName,
        rg: profileRg || undefined,
        cpf: profileCpf || undefined,
        phone: profilePhone || undefined,
        email: profileEmail,
        photo: profilePhoto || undefined,
      };
      
      console.log("📦 Dados a serem atualizados:", updatedData);
      
      // Update in Supabase
      const result = await systemUserService.update(user.id, updatedData);
      
      console.log("✅ Resultado da atualização:", result);
      
      if (result) {
        // Update local user state
        const updatedUser: UserType = {
          ...user,
          ...updatedData,
        };
        
        // Update localStorage for auth
        if (typeof window !== "undefined") {
          localStorage.setItem("rental_auth_user", JSON.stringify(updatedUser));
        }
        
        setUser(updatedUser);
        setShowProfileDialog(false);
        
        toast({
          title: "Sucesso",
          description: "Perfil atualizado com sucesso!",
        });
      }
    } catch (error) {
      console.error("❌ Erro ao salvar perfil:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil. Tente novamente.",
        variant: "destructive",
      });
    }
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
            <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
              <Building2 className="h-6 w-6 text-emerald-600" />
              <span className="font-bold text-slate-900">ImóvelControl</span>
            </Link>

            {/* MENU DESKTOP - Center - HARDCODED TO ALWAYS SHOW */}
            <div className="hidden md:flex items-center gap-1 flex-1 justify-center">
              <Link href="/dashboard">
                <Button 
                  variant={isActive("/dashboard") ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Button>
              </Link>

              <Link href="/properties">
                <Button 
                  variant={isActive("/properties") ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <Building2 className="h-4 w-4" />
                  <span>Imóveis</span>
                </Button>
              </Link>

              <Link href="/tenants">
                <Button 
                  variant={isActive("/tenants") ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <Users className="h-4 w-4" />
                  <span>Inquilinos</span>
                </Button>
              </Link>

              <Link href="/rentals">
                <Button 
                  variant={isActive("/rentals") ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <Building2 className="h-4 w-4" />
                  <span>Locações</span>
                </Button>
              </Link>

              <Link href="/payments">
                <Button 
                  variant={isActive("/payments") ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Recebimentos</span>
                </Button>
              </Link>

              <Link href="/financial">
                <Button 
                  variant={isActive("/financial") ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <Calculator className="h-4 w-4" />
                  <span>Financeiro</span>
                </Button>
              </Link>

              <Link href="/settings">
                <Button 
                  variant={isActive("/settings") ? "default" : "ghost"}
                  size="sm"
                  className="gap-1.5"
                >
                  <Settings className="h-4 w-4" />
                  <span>Configurações</span>
                </Button>
              </Link>
            </div>

            {/* USER PROFILE - Right */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden"
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    {user?.photo ? (
                      <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-600">
                        <img 
                          src={user.photo} 
                          alt={user.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                    <span className="text-sm hidden sm:inline">{user?.name}</span>
                    <ChevronDown className="h-4 w-4" />
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

          {/* Mobile Menu Dropdown */}
          {menuOpen && (
            <div className="md:hidden pb-4 space-y-1">
              <Link href="/dashboard">
                <Button 
                  variant={isActive("/dashboard") ? "default" : "ghost"}
                  className="w-full justify-start gap-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/properties">
                <Button 
                  variant={isActive("/properties") ? "default" : "ghost"}
                  className="w-full justify-start gap-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <Building2 className="h-4 w-4" />
                  Imóveis
                </Button>
              </Link>
              <Link href="/tenants">
                <Button 
                  variant={isActive("/tenants") ? "default" : "ghost"}
                  className="w-full justify-start gap-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <Users className="h-4 w-4" />
                  Inquilinos
                </Button>
              </Link>
              <Link href="/rentals">
                <Button 
                  variant={isActive("/rentals") ? "default" : "ghost"}
                  className="w-full justify-start gap-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <Building2 className="h-4 w-4" />
                  Locações
                </Button>
              </Link>
              <Link href="/payments">
                <Button 
                  variant={isActive("/payments") ? "default" : "ghost"}
                  className="w-full justify-start gap-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <DollarSign className="h-4 w-4" />
                  Recebimentos
                </Button>
              </Link>
              <Link href="/financial">
                <Button 
                  variant={isActive("/financial") ? "default" : "ghost"}
                  className="w-full justify-start gap-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <Calculator className="h-4 w-4" />
                  Financeiro
                </Button>
              </Link>
              <Link href="/settings">
                <Button 
                  variant={isActive("/settings") ? "default" : "ghost"}
                  className="w-full justify-start gap-2"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </Button>
              </Link>
            </div>
          )}
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
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 flex items-center justify-center">
                  {profilePhoto ? (
                    <img 
                      src={profilePhoto} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 text-slate-400" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => document.getElementById("profile-photo-upload")?.click()}
                  className="absolute bottom-0 right-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full p-2 shadow-lg transition-colors"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
                <input
                  id="profile-photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <p className="text-xs text-slate-500 text-center">
                Clique no ícone para alterar a foto<br />
                (Máximo 5MB)
              </p>
            </div>

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
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setShowProfileDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="button"
                onClick={() => {
                  console.log("💾 Botão Salvar Perfil clicado");
                  handleSaveProfile();
                }}
              >
                Salvar
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