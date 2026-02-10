import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect, useRef } from "react";
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

export function TenantFormDialog({
  open,
  onOpenChange,
  tenant,
  onSave,
  isViewMode = false,
}: TenantFormDialogProps) {
  const [isEditing, setIsEditing] = useState(!isViewMode);
  const [documentType, setDocumentType] = useState<"cpf" | "cnpj">("cpf");
  const [loadingCep, setLoadingCep] = useState(false);
  const [formData, setFormData] = useState<Partial<Tenant>>({
    name: "",
    email: "",
    phone: "",
    documentType: "cpf",
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
    status: "active",
  });

  const initializedRef = useRef(false);

  useEffect(() => {
    if (open && !initializedRef.current) {
      initializedRef.current = true;
      setIsEditing(!isViewMode);
      
      if (tenant) {
        const docType = tenant.document_type || tenant.documentType || "cpf";
        setFormData({
          name: tenant.name || "",
          email: tenant.email || "",
          phone: tenant.phone || "",
          documentType: docType,
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
          status: tenant.status || "active",
        });
        setDocumentType(docType);
      }
    }

    if (!open) {
      initializedRef.current = false;
    }
  }, [open]);

  const handleDocumentTypeChange = (type: "cpf" | "cnpj") => {
    setDocumentType(type);
    setFormData((prev) => ({
      ...prev,
      documentType: type,
      document_type: type,
      document: "",
      cpf: "",
      cnpj: "",
      rg: type === "cnpj" ? "" : prev.rg,
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyPhoneMask(e.target.value);
    setFormData((prev) => ({ ...prev, phone: masked }));
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCpfMask(e.target.value);
    setFormData((prev) => ({ ...prev, cpf: masked, document: masked }));
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCnpjMask(e.target.value);
    setFormData((prev) => ({ ...prev, cnpj: masked, document: masked }));
  };

  const handleRgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyRgMask(e.target.value);
    setFormData((prev) => ({ ...prev, rg: masked }));
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCepMask(e.target.value);
    setFormData((prev) => ({ ...prev, cep: masked }));

    const cleanCep = masked.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setLoadingCep(true);
      try {
        const address = await fetchAddressByCEP(cleanCep);
        if (address && !address.erro) {
          setFormData((prev) => ({
            ...prev,
            street: address.logradouro || "",
            neighborhood: address.bairro || "",
            city: address.localidade || "",
            state: address.uf || "",
          }));
        }
      } catch (error) {
        console.error("Erro ao buscar CEP:", error);
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSave: Partial<Tenant> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      documentType: documentType,
      cep: formData.cep,
      street: formData.street,
      number: formData.number,
      complement: formData.complement,
      neighborhood: formData.neighborhood,
      city: formData.city,
      state: formData.state,
      status: formData.status,
    };

    if (documentType === "cpf") {
      dataToSave.document = formData.cpf;
      dataToSave.cpf = formData.cpf;
      dataToSave.rg = formData.rg;
    } else {
      dataToSave.document = formData.cnpj;
      dataToSave.cnpj = formData.cnpj;
    }

    const success = await onSave(dataToSave);
    if (success) {
      onOpenChange(false);
    }
  };

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
          {/* Dados Pessoais */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Dados Pessoais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="name" className="text-sm font-medium">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome completo"
                  required
                  disabled={!isEditing}
                  className="h-11 sm:h-10 text-sm mobile-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="document" className="text-sm font-medium">CPF/CNPJ *</Label>
                <Input
                  id="document"
                  value={documentType === "cpf" ? formData.cpf : formData.cnpj}
                  onChange={documentType === "cpf" ? handleCpfChange : handleCnpjChange}
                  placeholder={documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  required
                  disabled={!isEditing}
                  className="h-11 sm:h-10 text-sm mobile-input"
                />
              </div>

              {documentType === "cpf" && (
                <div className="space-y-2">
                  <Label htmlFor="rg" className="text-sm font-medium">RG</Label>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={handleRgChange}
                    placeholder="00.000.000-0"
                    disabled={!isEditing}
                    className="h-11 sm:h-10 text-sm mobile-input"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">Telefone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
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
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required
                  disabled={!isEditing}
                  className="h-11 sm:h-10 text-sm mobile-input"
                />
              </div>

              {tenant && (
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as "active" | "inactive" })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className="h-11 sm:h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-3 pt-2 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground">Endereço</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="cep" className="text-sm font-medium">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={handleCepChange}
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
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) })}
                  placeholder="UF"
                  maxLength={2}
                  disabled={!isEditing}
                  className="h-11 sm:h-10 text-sm mobile-input uppercase"
                />
              </div>
            </div>
          </div>

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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
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
}