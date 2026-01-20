import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tenant, Location } from "@/types";
import { applyCpfMask, applyCnpjMask, applyPhoneMask, applyRgMask } from "@/lib/masks";
import { Pencil } from "lucide-react";

interface TenantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Partial<Tenant> | null;
  onSave: (data: Partial<Tenant>) => Promise<boolean>;
  locations: Location[];
  isViewMode?: boolean;
}

export function TenantFormDialog({
  open,
  onOpenChange,
  tenant,
  onSave,
  locations,
  isViewMode = false,
}: TenantFormDialogProps) {
  // Se isViewMode for true, começamos não editáveis (disabled=true).
  // Se isViewMode for false (criação), começamos editáveis (disabled=false).
  const [isEditing, setIsEditing] = useState(!isViewMode);

  const [formData, setFormData] = React.useState<Partial<Tenant>>({
    name: "",
    email: "",
    phone: "",
    documentType: "cpf",
    document: "",
    cpf: "",
    cnpj: "",
    rg: "",
    status: "active",
  });

  const [documentType, setDocumentType] = React.useState<"cpf" | "cnpj">("cpf");

  useEffect(() => {
    // Sempre que abrir ou mudar o tenant, reseta o modo de edição baseado no isViewMode
    setIsEditing(!isViewMode);
    
    if (tenant) {
      setFormData({
        ...tenant,
        documentType: tenant.document_type || tenant.documentType || "cpf",
        // Garantir que cpf/cnpj estejam preenchidos se document existir
        cpf: tenant.cpf || (tenant.document_type === "cpf" ? tenant.document : ""),
        cnpj: tenant.cnpj || (tenant.document_type === "cnpj" ? tenant.document : ""),
      });
      setDocumentType(tenant.document_type || tenant.documentType || "cpf");
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        documentType: "cpf",
        document: "",
        cpf: "",
        cnpj: "",
        rg: "",
        status: "active",
      });
      setDocumentType("cpf");
    }
  }, [tenant, open, isViewMode]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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
    handleInputChange("phone", masked);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCpfMask(e.target.value);
    handleInputChange("cpf", masked);
    handleInputChange("document", masked);
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyCnpjMask(e.target.value);
    handleInputChange("cnpj", masked);
    handleInputChange("document", masked);
  };

  const handleRgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = applyRgMask(e.target.value);
    handleInputChange("rg", masked);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSave: Partial<Tenant> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      documentType: documentType, // Will be transformed to document_type by service
      status: "active",
    };

    if (documentType === "cpf") {
      dataToSave.document = formData.cpf; // Store CPF in document field
      dataToSave.cpf = formData.cpf; // Also populate cpf field (legacy)
      dataToSave.rg = formData.rg;
    } else {
      dataToSave.document = formData.cnpj; // Store CNPJ in document field
      dataToSave.cnpj = formData.cnpj; // Also populate cnpj field
    }

    const success = await onSave(dataToSave);
    if (success) {
      onOpenChange(false);
    }
  };

  const toggleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsEditing(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tenant?.id 
              ? (isEditing ? "Editar Inquilino" : "Detalhes do Inquilino")
              : "Novo Inquilino"
            }
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Documento *</Label>
            <Tabs value={documentType} onValueChange={(value) => handleDocumentTypeChange(value as "cpf" | "cnpj")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cpf" disabled={!isEditing}>CPF</TabsTrigger>
                <TabsTrigger value="cnpj" disabled={!isEditing}>CNPJ</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {documentType === "cpf" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={formData.cpf || ""}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  disabled={!isEditing}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={formData.rg || ""}
                  onChange={handleRgChange}
                  placeholder="00.000.000-0"
                  disabled={!isEditing}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ *</Label>
              <Input
                id="cnpj"
                value={formData.cnpj || ""}
                onChange={handleCnpjChange}
                placeholder="00.000.000/0000-00"
                disabled={!isEditing}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ""}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={!isEditing}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone *</Label>
            <Input
              id="phone"
              value={formData.phone || ""}
              onChange={handlePhoneChange}
              placeholder="(00) 00000-0000"
              disabled={!isEditing}
              required
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {/* Se estiver no modo visualização (isEditing false) e veio de viewMode (tenant existe) */}
            {!isEditing && tenant?.id && (
              <Button type="button" onClick={toggleEdit} className="w-full sm:w-auto">
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}

            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              {isEditing ? "Cancelar" : "Fechar"}
            </Button>

            {isEditing && (
              <Button type="submit" className="w-full sm:w-auto">
                {tenant?.id ? "Salvar Alterações" : "Criar Inquilino"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}