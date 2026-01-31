import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SystemUser } from "@/types";
import { updateUser, resetPassword, unlockUser } from "@/services/systemUserService";
import { User, Mail, Phone, Shield, Save, KeyRound, Unlock, Camera } from "lucide-react";
import { applyCpfMask, applyPhoneMask, removeMask } from "@/lib/masks";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SystemUser | null;
  onSuccess: () => void;
}

export function EditProfileDialog({ open, onOpenChange, user, onSuccess }: EditProfileDialogProps) {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    newPassword: "",
  });

  useEffect(() => {
    if (open && user) {
      setSelectedUser(user);
      setPhotoPreview(user.photo || null);
    }
  }, [open, user]);

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    setIsResettingPassword(true);
    try {
      await resetPassword(selectedUser.id);
      
      toast({
        title: "Senha zerada com sucesso!",
        description: `A senha do usuário ${selectedUser.name} foi redefinida para "mudar123".`,
      });
      
      onSuccess();
    } catch (error) {
      console.error("Erro ao zerar senha:", error);
      toast({
        title: "Erro ao zerar senha",
        description: error instanceof Error ? error.message : "Não foi possível zerar a senha do usuário.",
        variant: "destructive",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleUnlockUser = async () => {
    if (!selectedUser) return;

    setIsUnlocking(true);
    try {
      await unlockUser(selectedUser.id, !selectedUser.active);
      
      toast({
        title: selectedUser.active ? "Usuário bloqueado!" : "Usuário desbloqueado!",
        description: `O usuário ${selectedUser.name} foi ${selectedUser.active ? 'bloqueado' : 'desbloqueado'} com sucesso.`,
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao alterar status do usuário:", error);
      toast({
        title: "Erro ao alterar status",
        description: error instanceof Error ? error.message : "Não foi possível alterar o status do usuário.",
        variant: "destructive",
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A foto deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPhotoPreview(base64String);
      if (selectedUser) {
        setSelectedUser({ ...selectedUser, photo: base64String });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUser || !user?.id) return;

    try {
      setIsSubmitting(true);

      const updates: Partial<SystemUser> = {
        name: selectedUser.name,
        email: selectedUser.email,
        phone: selectedUser.phone,
        role: selectedUser.role,
        cpf: selectedUser.cpf,
        rg: selectedUser.rg,
        photo: selectedUser.photo,
      };

      // Se admin alterou a senha, incluir no mesmo update
      if (user.role === "admin" && formData.newPassword) {
        (updates as any).password = formData.newPassword;
      }

      await updateUser(user.id, updates);
      
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    if (!selectedUser) return;
    setSelectedUser(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleRoleChange = (value: string) => {
    if (!selectedUser) return;
    const roleValue = value as "admin" | "broker" | "financial";
    setSelectedUser(prev => prev ? { ...prev, role: roleValue } : null);
  };

  if (!selectedUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Editar Perfil do Usuário
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Foto de Perfil */}
          <div className="flex flex-col items-center space-y-4 pb-4 border-b">
            <Avatar className="h-24 w-24">
              <AvatarImage src={photoPreview || undefined} alt={selectedUser.name} />
              <AvatarFallback className="text-2xl">
                {selectedUser.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("photoUpload")?.click()}
            >
              <Camera className="h-4 w-4 mr-2" />
              Alterar Foto
            </Button>
            <input
              id="photoUpload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          {/* Informações Pessoais */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Informações Pessoais
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome Completo
                </Label>
                <Input
                  id="profile-name"
                  value={selectedUser.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail
                </Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={selectedUser.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <Input
                  id="profile-phone"
                  value={selectedUser.phone ? applyPhoneMask(selectedUser.phone) : ""}
                  onChange={(e) => handleInputChange("phone", removeMask(e.target.value))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  CPF
                </Label>
                <Input
                  id="cpf"
                  value={selectedUser.cpf ? applyCpfMask(selectedUser.cpf) : ""}
                  onChange={(e) => handleInputChange("cpf", removeMask(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={selectedUser.rg || ""}
                  onChange={(e) => handleInputChange("rg", e.target.value)}
                  placeholder="00.000.000-0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={handleRoleChange}
                  disabled={user?.role !== "admin"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="broker">Corretor</SelectItem>
                    <SelectItem value="financial">Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Nova Senha - Apenas para Admin */}
          {user?.role === "admin" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Alterar Senha
              </h3>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  placeholder="Digite a nova senha (deixe em branco para não alterar)"
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco se não quiser alterar a senha
                </p>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleResetPassword}
              disabled={isResettingPassword || isSubmitting || isUnlocking}
              className="flex-1"
            >
              <KeyRound className="h-4 w-4 mr-2" />
              {isResettingPassword ? "Zerando..." : "Zerar Senha"}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleUnlockUser}
              disabled={isUnlocking || isSubmitting || isResettingPassword}
              className="flex-1"
            >
              <Unlock className="h-4 w-4 mr-2" />
              {isUnlocking ? (selectedUser.active ? "Bloqueando..." : "Desbloqueando...") : (selectedUser.active ? "Bloquear Usuário" : "Desbloquear Usuário")}
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || isResettingPassword || isUnlocking}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}