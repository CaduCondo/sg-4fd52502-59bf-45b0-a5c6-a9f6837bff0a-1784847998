import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tenant } from "@/types";
import { applyCpfMask, applyCnpjMask, applyPhoneMask, applyRgMask } from "@/lib/masks";
import { Pencil } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

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
  const [formData, setFormData] = useState<Partial<Tenant>>({
    name: "",
    email: "",
    phone: "",
    documentType: "cpf",
    document: "",
    cpf: "",
    cnpj: "",
    rg: "",
    status: "active",
    notes: "",
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
          status: tenant.status || "active",
          notes: tenant.notes || "",
        });
        setDocumentType(docType);
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
          notes: "",
        });
        setDocumentType("cpf");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSave: Partial<Tenant> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      documentType: documentType,
      status: tenant?.status || "active",
      notes: formData.notes,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações adicionais"
              rows={3}
              disabled={!isEditing}
              className="resize-none text-sm min-h-[80px] mobile-input"
            />
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