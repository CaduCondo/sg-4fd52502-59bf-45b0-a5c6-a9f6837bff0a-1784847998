// Types for Rental Form Components

export interface RentalFormData {
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  paymentDay: string;
  securityDeposit: string;
  isDepositInstallment: boolean;
  depositInstallmentCount: string;
  depositInstallment2: string;
  depositInstallment3: string;
  depositPaymentDate: string;
  depositPixCode: string;
  depositInstallment2PaymentDate: string;
  depositInstallment3PaymentDate: string;
  agencyCommissionPercentage: string;
  realEstateAgentCommissionPercentage: string;
  water: string;
  electricity: string;
  gas: string;
  waterResponsibility: string;
  electricityResponsibility: string;
  gasResponsibility: string;
  contractFile: File | null;
}

export interface Location {
  id: string;
  name: string;
  city: string;
  state: string;
}

export interface Property {
  id: string;
  title: string;
  address: string;
  location_id: string;
  locations?: Location;
}

export interface Tenant {
  id: string;
  full_name: string;
}

export interface RentalFormSectionProps {
  formData: Partial<RentalFormData>;
  onFieldChange: (field: keyof RentalFormData, value: any) => void;
  properties?: Property[];
  tenants?: Tenant[];
  errors?: Partial<Record<keyof RentalFormData, string>>;
}