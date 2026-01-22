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
  email: string;
  photo?: string;
  phone?: string;
  role: "admin" | "broker" | "financial";
  active: boolean;
  locationId?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyConfig {
  id: string;
  company_name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  admin_fee_percentage: number;
  late_fee_percentage: number;
  interest_rate_percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface RoleMenuPermission {
  id: string;
  role: string;
  menu_id: string;
  created_at?: string;
}

export interface UserLocationPermission {
  id: string;
  user_id: string;
  location_id: string;
  created_at?: string;
}

export interface Property {
  id: string;
  // Location info
  locationId: string;
  location?: string; // Derived name
  complement?: string; // DB field
  
  // Address details mapped from Location
  address?: string; // Mapped from street
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;

  // Details
  description?: string; // DB field
  type?: string; // DB field
  rooms?: number; // DB field
  bedrooms?: number; // Alias for rooms
  bathrooms?: number; // DB field
  area?: number; // DB field
  hasGarage?: boolean; // Mapped from has_garage
  
  // Financial
  value?: number;
  monthlyRent?: number; // Mapped from monthly_rent
  garageValue?: number; // Mapped from garage_value

  // Status & Metadata
  status: "available" | "occupied" | "unavailable";
  propertyIdentifier?: string; // Mapped from property_identifier
  createdAt?: string;
  updatedAt?: string;
  
  // Database snake_case fallbacks (optional, for raw data)
  location_id?: string;
  monthly_rent?: number;
  has_garage?: boolean;
  garage_value?: number;
  property_identifier?: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentType: "cpf" | "cnpj";
  document: string;
  cpf?: string;
  rg?: string;
  cnpj?: string;
  location_id?: string;
  document_type?: "cpf" | "cnpj"; // Database field match
  status: "active" | "inactive" | "rented" | "locatario";
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  active: boolean;
  // Campos opcionais para UI/Formulário
  address?: string;
  notes?: string;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate?: string;
  
  // Financials
  rentAmount: number;
  monthlyRent?: number; // Alias
  value?: number; // Alias for total value
  depositAmount?: number;
  deposit?: string; // DB field is text
  garageValue?: number;
  // adminFee removido pois não existe na tabela rentals

  // Status & Config
  status: "pending" | "active" | "completed" | "paid" | "overdue";
  isActive?: boolean;
  paymentDay: number;
  autoRenew: boolean;
  hasGarage?: boolean;
  
  // Relations & Meta
  property?: Property;
  tenant?: Tenant;
  contractUrl?: string;
  notes?: string;
  attachments?: string[];
  contractAttachments?: string[];
  pixCode?: string;
  
  // Helper fields for display/logic
  durationMonths?: number;
  dueDate?: string;
  receivedDate?: string;
  paidAmount?: number;
  referenceMonth?: number;
  referenceYear?: number;
  
  createdAt?: string;
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
  paymentLocation?: string;
  paymentCode?: string;
  notes?: string;
  referenceMonth: number;
  referenceYear: number;
  receiptUrl?: string;
  attachments?: string[];
  
  // Fees & Discounts
  penaltyAmount?: number;
  interestAmount?: number;
  discountAmount?: number;
  lateFee?: number; // Alias
  interest?: number; // Alias
  
  partialPayments?: any[];
  createdAt?: string;
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
  
  // Aliases
  address?: string;
  cep?: string;
  zipCode?: string;
}

export type TenantStatus = "active" | "inactive" | "rented";
export type RentalStatus = "active" | "completed" | "canceled";