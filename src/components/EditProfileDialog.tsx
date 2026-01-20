import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { SystemUser } from "@/types";
import { updateUser, resetPassword, unlockUser } from "@/services/systemUserService";
import { User, Mail, Phone, MapPin, Calendar, Shield, Save, KeyRound, Unlock, Camera } from "lucide-react";
import { applyCpfMask, applyPhoneMask, applyCepMask, removeMask } from "@/lib/masks";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ExtendedSystemUser extends SystemUser {
  photo?: string;
  document?: string;
  birthDate?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SystemUser | null;
  onSuccess: () => void;
}

export function EditProfileDialog({ open, onOpenChange, user, onSuccess }: EditProfileDialogProps) {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<ExtendedSystemUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      const extendedUser: ExtendedSystemUser = {
        ...user,
        document: (user as any).document || "",
        birthDate: (user as any).birthDate || "",
        cep: (user as any).cep || "",
        street: (user as any).street || "",
        number: (user as any).number || "",
        complement: (user as any).complement || "",
        neighborhood: (user as any).neighborhood || "",
        city: (user as any).city || "",
        state: (user as any).state || "",
        photo: (user as any).photo || null,
      };
      setSelectedUser(extendedUser);
      setPhotoPreview((user as any).photo || null);
    }
  }, [open, user]);

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    setIsResettingPassword(true);
    try {
      await resetPassword(selectedUser.id);
      
      toast({
        title: "Senha zerada com sucesso!",
        description: `A senha do usuário ${selectedUser.name} foi redefinida.`,
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
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const cleanDocument = selectedUser.document ? removeMask(selectedUser.document) : undefined;
      const cleanPhone = selectedUser.phone ? removeMask(selectedUser.phone) : undefined;
      const cleanCep = selectedUser.cep ? removeMask(selectedUser.cep) : undefined;

      const payload: Partial<SystemUser> = {
        name: selectedUser.name,
        email: selectedUser.email,
        phone: cleanPhone,
        role: selectedUser.role,
        active: selectedUser.active,
      };

      if (user?.id) {
        await updateUser(user.id, payload);
        
        toast({
          title: "Sucesso",
          description: "Perfil atualizado com sucesso.",
        });
        
        onSuccess();
        onOpenChange(false);
      }
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

  const handleInputChange = (field: keyof ExtendedSystemUser, value: string) => {
    if (!selectedUser) return;

    if (field === "document") {
      const masked = applyCpfMask(value);
      setSelectedUser(prev => prev ? { ...prev, document: masked } : null);
    } else if (field === "phone") {
      const masked = applyPhoneMask(value);
      setSelectedUser(prev => prev ? { ...prev, phone: masked } : null);
    } else if (field === "cep") {
      const masked = applyCepMask(value);
      setSelectedUser(prev => prev ? { ...prev, cep: masked } : null);
    } else {
      setSelectedUser(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handleRoleChange = (value: string) => {
    if (!selectedUser) return;
    const roleValue = value as "admin" | "broker" | "financial";
    setSelectedUser(prev => prev ? { ...prev, role: roleValue } : null);
  };

  const handleStatusChange = (value: string) => {
    if (!selectedUser) return;
    setSelectedUser(prev => prev ? { ...prev, active: value === "active" } : null);
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
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nome Completo
                </Label>
                <Input
                  id="name"
                  value={selectedUser.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
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
                  value={selectedUser.document || ""}
                  onChange={(e) => handleInputChange("document", e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
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
                  onChange={(e) => handleInputChange("email", e.target.value)}
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
                  value={selectedUser.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
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
                  value={selectedUser.birthDate || ""}
                  onChange={(e) => handleInputChange("birthDate", e.target.value)}
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

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={selectedUser.active ? "active" : "inactive"}
                  onValueChange={handleStatusChange}
                  disabled={user?.role !== "admin"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
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
                  onChange={(e) => handleInputChange("cep", e.target.value)}
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  value={selectedUser.street || ""}
                  onChange={(e) => handleInputChange("street", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  value={selectedUser.number || ""}
                  onChange={(e) => handleInputChange("number", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  value={selectedUser.complement || ""}
                  onChange={(e) => handleInputChange("complement", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={selectedUser.neighborhood || ""}
                  onChange={(e) => handleInputChange("neighborhood", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={selectedUser.city || ""}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  value={selectedUser.state || ""}
                  onChange={(e) => handleInputChange("state", e.target.value)}
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