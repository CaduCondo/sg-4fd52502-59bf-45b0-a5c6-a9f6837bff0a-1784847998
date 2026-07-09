import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect, useCallback, memo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tenant } from "@/types";
import { applyCpfMask, applyCnpjMask, applyPhoneMask, applyRgMask, applyCepMask, fetchAddressByCEP } from "@/lib/masks";
import { Pencil, Loader2 } from "lucide-react";

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Partial<Tenant> | null;
  onSave: (data: Partial<Tenant>) => Promise<boolean>;
  isViewMode?: boolean;
}

interface FormState {
  name: string;
  email: string;
  phone: string;
  document: string;
  cpf: string;
  cnpj: string;
  rg: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  status: "new" | "active" | "inactive" | "rented" | "late" | "debt";
}

const INITIAL_FORM_STATE: FormState = {
  name: "",
  email: "",
  phone: "",
  document: "",
  cpf: "",
  cnpj: "",
  rg: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  status: "new",
};

const PersonalDataSection = memo(function PersonalDataSection({
  formData,
  documentType,
  setDocumentType,
  isEditing,
  onFieldChange,
  onPhoneChange,
  onCpfChange,
  onCnpjChange,
  onRgChange,
  onStatusChange,
  showStatus,
}: {
  formData: FormState;
  documentType: "cpf" | "cnpj";
  setDocumentType: (type: "cpf" | "cnpj") => void;
  isEditing: boolean;
  onFieldChange: (field: keyof FormState, value: string) => void;
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCpfChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCnpjChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRgChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusChange: (value: string) => void;
  showStatus: boolean;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">Dados Pessoais</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name" className="text-sm font-medium">Nome Completo *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            placeholder="Nome completo"
            required
            disabled={!isEditing}
            className="h-11 sm:h-10 text-sm mobile-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="document" className="text-sm font-medium">CPF/CNPJ *</Label>
          <div className="flex gap-2 mb-2">
            <Button
              type="button"
              variant={documentType === "cpf" ? "default" : "outline"}
              size="sm"
              onClick={() => setDocumentType("cpf")}
              disabled={!isEditing}
              className="flex-1"
            >
              CPF
            </Button>
            <Button
              type="button"
              variant={documentType === "cnpj" ? "default" : "outline"}
              size="sm"
              onClick={() => setDocumentType("cnpj")}
              disabled={!isEditing}
              className="flex-1"
            >
              CNPJ
            </Button>
          </div>
          <Input
            id="document"
            value={documentType === "cpf" ? formData.cpf : formData.cnpj}
            onChange={documentType === "cpf" ? onCpfChange : onCnpjChange}
            placeholder={documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
            required
            disabled={!isEditing}
            className="h-11 sm:h-10 text-sm mobile-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="rg" className="text-sm font-medium">RG</Label>
          <Input
            id="rg"
            value={formData.rg}
            onChange={onRgChange}
            placeholder="00.000.000-0"
            disabled={!isEditing}
            className="h-11 sm:h-10 text-sm mobile-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium">Telefone *</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={onPhoneChange}
            placeholder="(00) 00000-0000"
            required
            disabled={!isEditing}
            className="h-11 sm:h-10 text-sm mobile-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">E-mail *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            placeholder="email@exemplo.com"
            required
            disabled={!isEditing}
            className="h-11 sm:h-10 text-sm mobile-input"
          />
        </div>

        {showStatus && (
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => onStatusChange(value)}
              disabled={!isEditing}
            >
              <SelectTrigger className="h-11 sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="rented">Locatário</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
});

const AddressSection = memo(function AddressSection({
  formData,
  isEditing,
  loadingCep,
  onFieldChange,
  onCepChange,
}: {
  formData: FormState;
  isEditing: boolean;
  loadingCep: boolean;
  onFieldChange: (field: keyof FormState, value: string) => void;
  onCepChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-3 pt-2 border-t">
      <h3 className="text-sm font-semibold text-muted-foreground">Endereço</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="space-y-2">
          <Label htmlFor="cep" className="text-sm font-medium">CEP</Label>
          <div className="relative">
            <Input
              id="cep"
              value={formData.cep}
              onChange={onCepChange}
              placeholder="00000-000"
              disabled={!isEditing}
              className="h-11 sm:h-10 text-sm mobile-input"
            />
            {loadingCep && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="street" className="text-sm font-medium">Rua/Logradouro</Label>
          <Input
            id="street"
            value={formData.street}
            onChange={(e) => onFieldChange("street", e.target.value)}
            placeholder="Rua, avenida, etc."
            disabled={!isEditing}
            className="h-11 sm:h-10 text-sm mobile-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="number" className="text-sm font-medium">Número</Label>
          <Input
            id="number"
            value={formData.number}
            onChange={(e) => onFieldChange("number", e.target.value)}
            placeholder="123"
            disabled={!isEditing}
            className="h-11 sm:h-10 text-sm mobile-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="complement" className="text-sm font-medium">Complemento</Label>
          <Input
            id="complement"
            value={formData.complement}
            onChange={(e) => onFieldChange("complement", e.target.value)}
            placeholder="Apto, casa, etc."
            disabled={!isEditing}
            className="h-11 sm:h-10 text-sm mobile-input"
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="neighborhood" className="text-sm font-medium">Bairro</Label>
          <Input
            id="neighborhood"
            value={formData.neighborhood}
            onChange={(e) => onFieldChange("neighborhood", e.target.value)}
            placeholder="Bairro"
            disabled={!isEditing}
            className="h-11 sm:h-10 text-sm mobile-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="city" className="text-sm font-medium">Cidade</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => onFieldChange("city", e.target.value)}
            placeholder="Cidade"
            disabled={!isEditing}
            className="h-11 sm:h-10 text-sm mobile-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state" className="text-sm font-medium">Estado</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => onFieldChange("state", e.target.value.toUpperCase().slice(0, 2))}
            placeholder="UF"
            maxLength={2}
            disabled={!isEditing}
            className="h-11 sm:h-10 text-sm mobile-input uppercase"
          />
        </div>
      </div>
    </div>
  );
});

export const TenantFormDialog = memo(function TenantFormDialog({
  open,
  onOpenChange,
  tenant,
  onSave,
  isViewMode = false,
}: TenantFormDialogProps) {
  const [isEditing, setIsEditing] = useState(!isViewMode);
  const [documentType, setDocumentType] = useState<"cpf" | "cnpj">("cpf");
  const [loadingCep, setLoadingCep] = useState(false);
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM_STATE);

  useEffect(() => {
    if (!open) return;

    setIsEditing(!isViewMode);

    if (tenant) {
      const docType = tenant.document_type || tenant.documentType || "cpf";
      
      setFormData({
        name: tenant.name || "",
        email: tenant.email || "",
        phone: tenant.phone || "",
        document: tenant.document || "",
        cpf: tenant.cpf || (docType === "cpf" ? tenant.document : "") || "",
        cnpj: tenant.cnpj || (docType === "cnpj" ? tenant.document : "") || "",
        rg: tenant.rg || "",
        cep: tenant.cep || "",
        street: tenant.street || "",
        number: tenant.number || "",
        complement: tenant.complement || "",
        neighborhood: tenant.neighborhood || "",
        city: tenant.city || "",
        state: tenant.state || "",
        status: tenant.status || "new",
      });
      setDocumentType(docType);
    } else {
      setFormData(INITIAL_FORM_STATE);
      setDocumentType("cpf");
    }
  }, [open, tenant, isViewMode]);

  const handleFieldChange = useCallback((field: keyof FormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyPhoneMask(e.target.value);
    setFormData(prev => ({ ...prev, phone: masked }));
  }, []);

  const handleCpfChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCpfMask(e.target.value);
    setFormData(prev => ({ ...prev, cpf: masked, document: masked }));
  }, []);

  const handleCnpjChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCnpjMask(e.target.value);
    setFormData(prev => ({ ...prev, cnpj: masked, document: masked }));
  }, []);

  const handleRgChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyRgMask(e.target.value);
    setFormData(prev => ({ ...prev, rg: masked }));
  }, []);

  const handleCepChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCepMask(e.target.value);
    setFormData(prev => ({ ...prev, cep: masked }));

    const cleanCep = masked.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const address = await fetchAddressByCEP(cleanCep);
        if (address && !address.erro) {
          setFormData(prev => ({
            ...prev,
            street: address.logradouro || "",
            neighborhood: address.bairro || "",
            city: address.localidade || "",
            state: address.uf || "",
          }));
        }
      } catch (error) {
        // Silently fail
      } finally {
        setLoadingCep(false);
      }
    }
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setFormData(prev => ({ ...prev, status: value as "new" | "active" | "inactive" | "rented" | "late" | "debt" }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const newTenantData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      cpf: formData.cpf,
      cnpj: formData.cnpj,
      rg: formData.rg,
      documentType,
      cep: formData.cep,
      street: formData.street,
      number: formData.number,
      complement: formData.complement,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      status: formData.status as "new" | "active" | "inactive" | "rented" | "late" | "debt",
    };

    const success = await onSave(newTenantData);
    if (success) {
      onOpenChange(false);
    }
  }, [formData, documentType, onSave, onOpenChange]);

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-2 pb-3">
          <DialogTitle className="text-base sm:text-lg font-bold">
            {tenant && isViewMode && !isEditing
              ? "Visualização do Inquilino"
              : tenant && isEditing
              ? "Editar Inquilino"
              : "Novo Inquilino"}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {tenant ? "Atualize as informações do inquilino" : "Preencha os dados do novo inquilino"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PersonalDataSection
            formData={formData}
            documentType={documentType}
            setDocumentType={setDocumentType}
            isEditing={isEditing}
            onFieldChange={handleFieldChange}
            onPhoneChange={handlePhoneChange}
            onCpfChange={handleCpfChange}
            onCnpjChange={handleCnpjChange}
            onRgChange={handleRgChange}
            onStatusChange={handleStatusChange}
            showStatus={!!tenant}
          />

          <AddressSection
            formData={formData}
            isEditing={isEditing}
            loadingCep={loadingCep}
            onFieldChange={handleFieldChange}
            onCepChange={handleCepChange}
          />

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
            {isViewMode && !isEditing ? (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="h-11 sm:h-10 touch-target"
                >
                  Fechar
                </Button>
                <Button 
                  type="button" 
                  onClick={handleEdit}
                  className="h-11 sm:h-10 touch-target"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </>
            ) : (
              <>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="h-11 sm:h-10 touch-target"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="h-11 sm:h-10 touch-target"
                >
                  {tenant ? "Atualizar" : "Criar"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});