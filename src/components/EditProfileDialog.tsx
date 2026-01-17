import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { systemUserService } from "@/services/systemUserService";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    if (open) {
      console.log("🔓 Dialog aberto, iniciando fluxo de carregamento...");
      loadUserData();
    } else {
      // Reset form when dialog closes
      console.log("🔒 Dialog fechado, resetando formulário...");
      setFormData({
        name: "",
        email: "",
        phone: "",
        cpf: "",
        rg: "",
      });
      setUserId("");
    }
  }, [open]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      console.log("📡 Etapa 1: Buscando usuário autenticado do Supabase...");
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error("❌ Erro ao buscar usuário autenticado:", authError);
        throw authError;
      }
      
      if (!user?.id) {
        console.error("❌ Nenhum usuário autenticado encontrado!");
        toast({
          title: "Erro de Autenticação",
          description: "Você precisa estar logado para editar o perfil.",
          variant: "destructive",
        });
        onOpenChange(false);
        return;
      }

      console.log("✅ Etapa 1 completa: User ID do Supabase:", user.id);
      setUserId(user.id);
      
      console.log("📡 Etapa 2: Carregando dados do perfil do banco...");
      const userData = await systemUserService.getById(user.id);
      
      if (!userData) {
        console.error("❌ Nenhum dado de perfil encontrado para o user ID:", user.id);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do perfil.",
          variant: "destructive",
        });
        onOpenChange(false);
        return;
      }

      console.log("✅ Etapa 2 completa: Dados carregados:", userData);
      
      setFormData({
        name: userData.name || "",
        email: userData.email || "",
        phone: userData.phone || "",
        cpf: userData.cpf || "",
        rg: userData.rg || "",
      });
      
      console.log("✅ Formulário preenchido com sucesso!");
      
    } catch (error) {
      console.error("❌ ERRO FATAL ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do perfil. Tente novamente.",
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

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