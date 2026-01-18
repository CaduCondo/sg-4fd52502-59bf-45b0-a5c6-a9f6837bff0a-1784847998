export interface User {
  id?: string;
  name: string;
  email: string;
  photo?: string;
  role: "admin" | "user" | "broker" | "financial";
  token?: string;
  username?: string;
  password?: string;
  phone?: string;
  rg?: string;
  cpf?: string;
  active?: boolean;
  createdAt?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  phone?: string;
  rg?: string;
  cpf?: string;
  document?: string;
  birthDate?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  role: "user" | "broker" | "financial" | "admin";
  active: boolean;
  photo?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Property {
  id: string;
  location: string;
  location_id: string;
  property_identifier: string;
  type: "residential" | "commercial";
  monthly_rent: number;
  status: "available" | "occupied" | "unavailable";
  description?: string;
  created_at?: string;
  updated_at?: string;
  locationData?: {
    id: string;
    name: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  };
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  document?: string;
  documentType?: string;
  birthDate?: string;
  zipCode?: string;
  address?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  profession?: string;
  income?: number;
  notes?: string;
  status: "active" | "inactive" | "rented";
  createdAt?: string;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  paymentDay: number;
  contractUrl?: string;
  autoRenew: boolean;
  adminFee: number;
  status: "active" | "inactive" | "pending";
  isActive: boolean;
  monthlyRent: number;
  value?: number;
  hasGarage?: boolean;
  garageValue?: number;
  attachments?: string[];
  contractAttachments?: string[];
  createdAt: string;
  deposit?: string;
  pixCode?: string;
  
  // Relations
  property?: Property;
  tenant?: Tenant;
}

export interface Payment {
  id: string;
  rentalId: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount?: number;
  paymentDate?: string;
  status: "pending" | "paid" | "overdue" | "partial";
  paymentMethod?: string;
  notes?: string;
  referenceMonth: number;
  referenceYear: number;
  receiptUrl?: string;
  penaltyAmount?: number;
  interestAmount?: number;
  discountAmount?: number;
  paymentCode?: string;
  lateFee?: number;
  interest?: number;
  paymentLocation?: string;
  attachments?: string[];
  partialPayments?: any[];
  createdAt: string;

  // Relations
  rental?: Rental;
}

export interface Location {
  id: string;
  name: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zip_code?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Compatibility aliases (optional, helpful for frontend transition)
  address?: string; // map to street
  cep?: string;     // map to zip_code
  zipCode?: string; // map to zip_code
}

export interface CompanyConfig {
  companyName: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  
  adminFeePercentage: number;
  lateFeePercentage: number;
  interestRatePercentage: number;
}