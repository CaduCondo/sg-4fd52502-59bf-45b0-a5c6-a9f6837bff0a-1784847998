import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { RentalFormSectionProps } from "../types/rentalForm.types";

export function BasicInfoSection({ formData, onFieldChange, properties, tenants, errors }: RentalFormSectionProps) {
  const getLocationName = (locationId: string) => {
    if (!properties) return "";
    const property = properties.find((p) => p.id === formData.propertyId);
    if (!property?.locations) return "";
    return `${property.locations.city} - ${property.locations.state}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">Informações Básicas</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Property Selection */}
        <div className="space-y-2">
          <Label htmlFor="property">
            Imóvel <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.propertyId} onValueChange={(value) => onFieldChange("propertyId", value)}>
            <SelectTrigger id="property" className={errors?.propertyId ? "border-red-500" : ""}>
              <SelectValue placeholder="Selecione o imóvel" />
            </SelectTrigger>
            <SelectContent>
              {properties?.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.title} - {property.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.propertyId && <p className="text-sm text-red-500">{errors.propertyId}</p>}
        </div>

        {/* Location Display */}
        <div className="space-y-2">
          <Label>Localização</Label>
          <Input value={formData.propertyId ? getLocationName(formData.propertyId) : ""} disabled className="bg-muted" />
        </div>

        {/* Tenant Selection */}
        <div className="space-y-2">
          <Label htmlFor="tenant">
            Inquilino <span className="text-red-500">*</span>
          </Label>
          <Select value={formData.tenantId} onValueChange={(value) => onFieldChange("tenantId", value)}>
            <SelectTrigger id="tenant" className={errors?.tenantId ? "border-red-500" : ""}>
              <SelectValue placeholder="Selecione o inquilino" />
            </SelectTrigger>
            <SelectContent>
              {tenants?.map((tenant) => (
                <SelectItem key={tenant.id} value={tenant.id}>
                  {tenant.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.tenantId && <p className="text-sm text-red-500">{errors.tenantId}</p>}
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startDate">
            Data de Início <span className="text-red-500">*</span>
          </Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => onFieldChange("startDate", e.target.value)}
            className={errors?.startDate ? "border-red-500" : ""}
          />
          {errors?.startDate && <p className="text-sm text-red-500">{errors.startDate}</p>}
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor="endDate">Data de Término</Label>
          <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => onFieldChange("endDate", e.target.value)} />
        </div>
      </div>
    </div>
  );
}