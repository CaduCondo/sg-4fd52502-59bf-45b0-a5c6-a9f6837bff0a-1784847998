import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SystemUser } from "@/types";
import { systemUserService } from "@/services/systemUserService";
import { User, Mail, Building2, Phone, MapPin, Calendar, Shield, Save, KeyRound, Unlock } from "lucide-react";
import { applyCpfMask, applyPhoneMask, applyCepMask, removeMask } from "@/lib/masks";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SystemUser;
  onSuccess: () => void;
}

export function EditProfileDialog({ open, onOpenChange, user, onSuccess }: EditProfileDialogProps) {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    if (open && user) {
      setSelectedUser({ ...user });
    }
  }, [open, user]);

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    setIsResettingPassword(true);
    try {
      await systemUserService.resetPassword(selectedUser.id);
      
      toast({
        title: "Senha zerada com sucesso!",
        description: `A senha do usuário ${selectedUser.name} foi redefinida para a senha padrão.`,
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
      await systemUserService.unlockUser(selectedUser.id);
      
      toast({
        title: "Usuário desbloqueado!",
        description: `O usuário ${selectedUser.name} foi desbloqueado com sucesso.`,
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao desbloquear usuário:", error);
      toast({
        title: "Erro ao desbloquear usuário",
        description: error instanceof Error ? error.message : "Não foi possível desbloquear o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const cleanDocument = removeMask(selectedUser.document);
      const cleanPhone = removeMask(selectedUser.phone);
      const cleanCep = selectedUser.cep ? removeMask(selectedUser.cep) : undefined;

      await systemUserService.update(selectedUser.id, {
        ...selectedUser,
        document: cleanDocument,
        phone: cleanPhone,
        cep: cleanCep,
      });

      toast({
        title: "Perfil atualizado!",
        description: "As informações do usuário foram atualizadas com sucesso.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro ao atualizar perfil",
        description: error instanceof Error ? error.message : "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof SystemUser, value: string) => {
    if (!selectedUser) return;

    if (field === "document") {
      const masked = applyCpfMask(value);
      setSelectedUser({ ...selectedUser, [field]: masked });
    } else if (field === "phone") {
      const masked = applyPhoneMask(value);
      setSelectedUser({ ...selectedUser, [field]: masked });
    } else if (field === "cep") {
      const masked = applyCepMask(value);
      setSelectedUser({ ...selectedUser, [field]: masked });
    } else {
      setSelectedUser({ ...selectedUser, [field]: value });
    }
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
          {/* Informações Pessoais */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Informações Pessoais
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome Completo
                </Label>
                <Input
                  id="name"
                  value={selectedUser.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  CPF
                </Label>
                <Input
                  id="document"
                  value={selectedUser.document}
                  onChange={(e) => handleChange("document", e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <Input
                  id="phone"
                  value={selectedUser.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Data de Nascimento
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={selectedUser.birthDate}
                  onChange={(e) => handleChange("birthDate", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Função
                </Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value) => handleChange("role", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="broker">Corretor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Endereço
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  CEP
                </Label>
                <Input
                  id="cep"
                  value={selectedUser.cep || ""}
                  onChange={(e) => handleChange("cep", e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  value={selectedUser.street || ""}
                  onChange={(e) => handleChange("street", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={selectedUser.number || ""}
                  onChange={(e) => handleChange("number", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={selectedUser.complement || ""}
                  onChange={(e) => handleChange("complement", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={selectedUser.neighborhood || ""}
                  onChange={(e) => handleChange("neighborhood", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={selectedUser.city || ""}
                  onChange={(e) => handleChange("city", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={selectedUser.state || ""}
                  onChange={(e) => handleChange("state", e.target.value)}
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
            </div>
          </div>

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
              disabled={isUnlocking || isSubmitting || isResettingPassword || selectedUser.active}
              className="flex-1"
            >
              <Unlock className="h-4 w-4 mr-2" />
              {isUnlocking ? "Desbloqueando..." : selectedUser.active ? "Usuário Ativo" : "Desbloquear"}
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