import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { systemUserService } from "@/services/systemUserService";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditProfileDialog({ open, onOpenChange, onSuccess }: EditProfileDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    cpf: "",
    rg: "",
  });

  // Load authenticated user's data on dialog open
  useEffect(() => {
    if (!open) {
      setLoading(true);
      setFormData({ name: "", email: "", phone: "", cpf: "", rg: "" });
      return;
    }

    const loadUserData = async () => {
      setLoading(true);
      console.log("🔓 Dialog aberto, iniciando fluxo de carregamento...");

      try {
        // Etapa 1: Try to get user from Supabase
        console.log("📡 Etapa 1: Buscando usuário autenticado do Supabase...");
        const { data: { user } } = await supabase.auth.getUser();

        let userId: string | null = null;

        if (user) {
          console.log("✅ Etapa 1 completa: User ID do Supabase:", user.id);
          userId = user.id;
        } else {
          // Fallback: Try localStorage
          console.warn("⚠️ Nenhuma sessão Supabase encontrada, tentando localStorage...");
          const localUser = getCurrentUser();
          
          if (localUser) {
            console.log("✅ Usuário do localStorage encontrado:", localUser.id);
            userId = localUser.id;
          } else {
            console.error("❌ Nenhum usuário autenticado encontrado!");
            toast({
              title: "Erro",
              description: "Sessão expirada. Faça login novamente.",
              variant: "destructive"
            });
            setLoading(false);
            onOpenChange(false);
            return;
          }
        }

        // Etapa 2: Load user data from database
        console.log("📡 Etapa 2: Carregando dados do perfil do banco...");
        const userData = await systemUserService.getById(userId);

        if (!userData) {
          console.error("❌ Nenhum dado de perfil encontrado para o user ID:", userId);
          console.error("🔄 DETECTADO: ID no localStorage não existe no banco de dados!");
          console.log("🧹 Limpando dados corrompidos do localStorage...");
          
          // Clear corrupted localStorage data
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("currentUser");
          
          toast({
            title: "Sessão Inválida",
            description: "Seus dados de sessão estão corrompidos. Por favor, faça login novamente.",
            variant: "destructive"
          });
          
          setLoading(false);
          onOpenChange(false);
          
          // Redirect to login after 2 seconds
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
          
          return;
        }

        console.log("✅ Etapa 2 completa: Dados carregados:", userData);

        // Fill form with user data
        setFormData({
          name: userData.name || "",
          email: userData.email || "",
          phone: userData.phone || "",
          cpf: userData.cpf || "",
          rg: userData.rg || ""
        });

        console.log("✅ Formulário preenchido com sucesso!");
        setLoading(false);
      } catch (error) {
        console.error("❌ ERRO FATAL ao carregar dados:", error);
        
        // Check if it's a 406 error (user not found)
        if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
          console.error("🔄 DETECTADO: Erro 406 - Usuário não existe no banco!");
          console.log("🧹 Limpando dados corrompidos do localStorage...");
          
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("currentUser");
          
          toast({
            title: "Sessão Inválida",
            description: "Seus dados de sessão estão corrompidos. Redirecionando para login...",
            variant: "destructive"
          });
          
          setLoading(false);
          onOpenChange(false);
          
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
          
          return;
        }
        
        toast({
          title: "Erro",
          description: "Erro ao carregar dados do perfil. Tente novamente.",
          variant: "destructive"
        });
        setLoading(false);
        onOpenChange(false);
      }
    };

    loadUserData();
  }, [open, onOpenChange, toast]);

  const handleSave = async () => {
    if (!userId) {
      console.error("❌ ERRO: userId está vazio no momento do salvamento!");
      toast({
        title: "Erro",
        description: "Erro interno: ID de usuário não encontrado.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      console.log("💾 Etapa 3: Iniciando salvamento...");
      console.log("📦 User ID:", userId);
      console.log("📦 Dados a serem salvos:", formData);

      const updatedUser = await systemUserService.update(userId, formData);
      
      if (!updatedUser) {
        console.error("❌ systemUserService.update retornou null!");
        throw new Error("Falha ao atualizar perfil");
      }
      
      console.log("✅ Etapa 3 completa: Perfil atualizado com sucesso:", updatedUser);
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });

      console.log("🔄 Fechando dialog e chamando callback onSuccess...");
      onOpenChange(false);
      
      if (onSuccess) {
        console.log("🔄 Executando callback onSuccess...");
        onSuccess();
      }
      
      console.log("✅ Processo completo finalizado com sucesso!");
      
    } catch (error) {
      console.error("❌ ERRO FATAL ao salvar perfil:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        {loading && !formData.name ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Digite o nome completo"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Digite o email"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Celular</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={formData.rg}
                  onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                  placeholder="00.000.000-0"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}