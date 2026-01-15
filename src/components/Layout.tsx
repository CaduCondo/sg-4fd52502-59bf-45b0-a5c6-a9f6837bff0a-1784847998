import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Building2, Users, Home, DollarSign, Settings, LogOut } from "lucide-react";
import { logout, getCurrentUser } from "@/lib/auth";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setUserName(user.name);
    }
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isActive = (path: string) => router.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <Building2 className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-slate-900">ImóvelControl</span>
              </Link>
              
              <div className="hidden md:flex space-x-1">
                <Link href="/dashboard">
                  <Button 
                    variant={isActive("/dashboard") ? "default" : "ghost"}
                    className="flex items-center space-x-2"
                  >
                    <Home size={18} />
                    <span>Dashboard</span>
                  </Button>
                </Link>
                
                <Link href="/properties">
                  <Button 
                    variant={isActive("/properties") ? "default" : "ghost"}
                    className="flex items-center space-x-2"
                  >
                    <Building2 size={18} />
                    <span>Imóveis</span>
                  </Button>
                </Link>
                
                <Link href="/tenants">
                  <Button 
                    variant={isActive("/tenants") ? "default" : "ghost"}
                    className="flex items-center space-x-2"
                  >
                    <Users size={18} />
                    <span>Inquilinos</span>
                  </Button>
                </Link>
                
                <Link href="/payments">
                  <Button 
                    variant={isActive("/payments") ? "default" : "ghost"}
                    className="flex items-center space-x-2"
                  >
                    <DollarSign size={18} />
                    <span>Pagamentos</span>
                  </Button>
                </Link>
                
                <Link href="/settings">
                  <Button 
                    variant={isActive("/settings") ? "default" : "ghost"}
                    className="flex items-center space-x-2"
                  >
                    <Settings size={18} />
                    <span>Configurações</span>
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600">Olá, {userName}</span>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="flex items-center space-x-2"
              >
                <LogOut size={18} />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}