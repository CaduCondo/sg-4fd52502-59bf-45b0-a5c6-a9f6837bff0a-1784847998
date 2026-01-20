import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tenant, Location } from "@/types";
import { applyCpfMask, applyCnpjMask, applyPhoneMask, applyRgMask } from "@/lib/masks";

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
  const [formData, setFormData] = React.useState<Partial<Tenant>>({
    name: "",
    email: "",
    phone: "",
    documentType: "cpf",
    document: "",
    cpf: "",
    cnpj: "",
    rg: "",
    location_id: "",
    status: "active",
  });

  const [documentType, setDocumentType] = React.useState<"cpf" | "cnpj">("cpf");

  React.useEffect(() => {
    if (tenant) {
      setFormData({
        ...tenant,
        documentType: tenant.document_type || tenant.documentType || "cpf",
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
        location_id: "",
        status: "active",
      });
      setDocumentType("cpf");
    }
  }, [tenant, open]);

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
      document_type: documentType,
      documentType: documentType,
      location_id: formData.location_id,
      status: formData.status,
    };

    if (documentType === "cpf") {
      dataToSave.cpf = formData.cpf;
      dataToSave.document = formData.cpf;
      dataToSave.rg = formData.rg;
    } else {
      dataToSave.cnpj = formData.cnpj;
      dataToSave.document = formData.cnpj;
    }

    const success = await onSave(dataToSave);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isViewMode ? "Visualizar Inquilino" : tenant?.id ? "Editar Inquilino" : "Novo Inquilino"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={isViewMode}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Documento *</Label>
            <Tabs value={documentType} onValueChange={(value) => handleDocumentTypeChange(value as "cpf" | "cnpj")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cpf" disabled={isViewMode}>CPF</TabsTrigger>
                <TabsTrigger value="cnpj" disabled={isViewMode}>CNPJ</TabsTrigger>
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
                  disabled={isViewMode}
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
                  disabled={isViewMode}
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
                disabled={isViewMode}
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
              disabled={isViewMode}
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
              disabled={isViewMode}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localização</Label>
            <Select
              value={formData.location_id || ""}
              onValueChange={(value) => handleInputChange("location_id", value)}
              disabled={isViewMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma localização" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status || "active"}
              onValueChange={(value) => handleInputChange("status", value)}
              disabled={isViewMode}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isViewMode ? "Fechar" : "Cancelar"}
            </Button>
            {!isViewMode && (
              <Button type="submit">
                {tenant?.id ? "Atualizar" : "Criar"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}