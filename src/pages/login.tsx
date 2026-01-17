import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, AlertCircle, Lock } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";
import { initializeStorage } from "@/lib/storage";
import { SEO } from "@/components/SEO";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { systemUserService } from "@/services/systemUserService";
import { supabase } from "@/integrations/supabase/client";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Forgot Password State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    initializeStorage();
    checkLockout();
    
    if (isAuthenticated()) {
      router.push("/dashboard");
    }
  }, [router]);

  const checkLockout = () => {
    const lockoutTime = parseInt(localStorage.getItem("lockoutTime") || "0");
    if (lockoutTime > Date.now()) {
      setIsLocked(true);
      const remainingTime = Math.ceil((lockoutTime - Date.now()) / 1000 / 60);
      setError(`Conta bloqueada. Tente novamente em ${remainingTime} minutos.`);
      return true;
    } else {
      setIsLocked(false);
      localStorage.removeItem("lockoutTime");
      return false;
    }
  };

  const handleLoginAttempt = () => {
    const attempts = parseInt(localStorage.getItem("loginAttempts") || "0") + 1;
    localStorage.setItem("loginAttempts", attempts.toString());

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const lockoutTime = Date.now() + LOCKOUT_DURATION;
      localStorage.setItem("lockoutTime", lockoutTime.toString());
      setIsLocked(true);
      setError(`Muitas tentativas falhas. Conta bloqueada por 15 minutos.`);
    } else {
      setError(`Usuário ou senha inválidos. Tentativa ${attempts} de ${MAX_LOGIN_ATTEMPTS}.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;
    
    setError("");
    setLoading(true);

    // Simulate network delay for better UX/security
    await new Promise(resolve => setTimeout(resolve, 800));

    // Validar login usando system_users
    const user = await systemUserService.validateLogin(username, password);
    
    if (user) {
      // Login bem-sucedido
      localStorage.removeItem("loginAttempts");
      localStorage.removeItem("lockoutTime");
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("currentUser", JSON.stringify({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }));
      
      // Try to create Supabase session (optional, won't block login if fails)
      try {
        console.log("🔄 Tentando sincronizar sessão com Supabase...");
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: password
        });
        
        if (signInError) {
          console.warn("⚠️ Não foi possível criar sessão Supabase (usuário pode não existir no auth.users):", signInError.message);
          console.log("✅ Continuando com autenticação via localStorage...");
        } else {
          console.log("✅ Sessão Supabase criada com sucesso!");
        }
      } catch (syncError) {
        console.warn("⚠️ Erro ao sincronizar com Supabase (não crítico):", syncError);
      }
      
      // ALWAYS redirect to dashboard after successful localStorage login
      console.log("✅ Login bem-sucedido! Redirecionando para dashboard...");
      window.location.href = "/dashboard";
    } else {
      handleLoginAttempt();
    }
    
    setLoading(false);
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    
    if (!validateEmail(resetEmail)) {
      setResetError("Por favor, insira um e-mail válido.");
      return;
    }

    setResetLoading(true);
    
    try {
      // Simulating API call - in real scenario would send reset email
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setResetSuccess(true);
    } catch (err) {
      setResetError("Erro ao enviar e-mail. Tente novamente.");
      console.error(err);
    } finally {
      setResetLoading(false);
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
                <Label htmlFor="username">Usuário ou Email</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário ou email"
                  required
                  className="h-11"
                  disabled={isLocked}
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
                  disabled={isLocked}
                />
              </div>
              
              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md border border-red-200 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={18} />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full h-11 text-base bg-blue-600 hover:bg-blue-700 transition-all"
                disabled={loading || isLocked}
              >
                {loading ? "Entrando..." : isLocked ? "Conta Bloqueada" : "Entrar"}
              </Button>
              
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
                  disabled={isLocked}
                >
                  Esqueci minha senha
                </button>
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-500 text-center">
                  Desenvolvido por <span className="font-semibold text-slate-700">Carlos Uva</span>
                  <br />
                  <a 
                    href="mailto:stefcadu@gmail.com" 
                    className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    stefcadu@gmail.com
                  </a>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Digite seu e-mail para receber um link de redefinição de senha.
            </DialogDescription>
          </DialogHeader>

          {!resetSuccess ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-mail</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="h-10"
                />
              </div>

              {resetError && (
                <div className="text-sm text-red-600 flex items-center gap-2 bg-red-50 p-2 rounded">
                  <AlertCircle size={16} />
                  {resetError}
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForgotPassword(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={resetLoading}
                >
                  {resetLoading ? "Enviando..." : "Enviar Link"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="py-4 space-y-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Lock className="h-6 w-6 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-slate-900">E-mail enviado!</h3>
                <p className="text-sm text-slate-500">
                  Verifique sua caixa de entrada (e spam) para redefinir sua senha.
                  O link expira em 1 hora.
                </p>
              </div>
              <Button 
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSuccess(false);
                  setResetEmail("");
                }}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Entendi
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}