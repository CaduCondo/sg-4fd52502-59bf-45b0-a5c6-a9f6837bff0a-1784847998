import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, AlertCircle } from "lucide-react";
import { login, isAuthenticated, initializeAuth } from "@/lib/auth";
import { initializeStorage } from "@/lib/storage";
import { SEO } from "@/components/SEO";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeAuth();
    initializeStorage();
    
    if (isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const user = login(username, password);
    
    if (user) {
      router.push("/dashboard");
    } else {
      setError("Usuário ou senha inválidos");
      setLoading(false);
    }
  };

  return (
    <>
      <SEO 
        title="Login - ImóvelControl"
        description="Sistema de gerenciamento de locações de imóveis"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-slate-200">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900">ImóvelControl</CardTitle>
            <CardDescription className="text-slate-600">
              Sistema de Gerenciamento de Locações
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  required
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="h-11"
                />
              </div>
              
              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-11 text-base"
                disabled={loading}
              >
                {loading ? "Entrando..." : "Entrar"}
              </Button>
              
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-500 text-center">
                  Credenciais padrão:<br />
                  <span className="font-mono font-semibold">Usuário: cadu.pires</span><br />
                  <span className="font-mono font-semibold">Senha: teste123</span>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}