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
  created_at?: string;
  updated_at?: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  location: string;
  // Added optional fields for compatibility
  number?: string;
  complement?: string;
  cep?: string;
  rentValue?: number; // Alias for monthlyRent in some contexts
  
  type: string;
  size: number;
  rooms: number;
  bathrooms: number;
  parkingSpots: number;
  monthlyRent: number;
  description: string;
  status: "available" | "occupied" | "unavailable";
  images: string[];
  features: string[];
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  iptu?: number;
  condoFee?: number;
  createdAt?: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  rg?: string;
  // Added optional fields for compatibility
  document?: string; // Often used as alias for CPF
  documentType?: string;
  
  status: "active" | "inactive" | "rented";
  birthDate?: string;
  profession?: string;
  income?: number;
  notes?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  createdAt?: string;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate?: string;
  rentAmount: number;
  depositAmount?: number;
  status: "pending" | "active" | "completed" | "paid" | "overdue";
  paymentDay: number;
  contractUrl?: string;
  autoRenew: boolean;
  notes?: string;
  adminFee?: number;
  property?: Property;
  tenant?: Tenant;
  dueDate?: string;
  receivedDate?: string;
  paidAmount?: number;
  referenceMonth?: number;
  referenceYear?: number;
  // Compatibility
  monthlyRent?: number;
  value?: number;
  isActive?: boolean;
  hasGarage?: boolean;
  garageValue?: number;
  attachments?: string[];
  contractAttachments?: string[]; // Added to fix error in rentalService
  deposit?: number;
  pixCode?: string; // PIX code for this rental
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
  notes?: string;
  referenceMonth: number;
  referenceYear: number;
  receiptUrl?: string;
  penaltyAmount?: number;
  interestAmount?: number;
  discountAmount?: number;
  // Compatibility fields
  paymentCode?: string;
  lateFee?: number;
  interest?: number;
  paymentLocation?: string;
  attachments?: string[];
  partialPayments?: any[];
  createdAt?: string;
}

export interface Location {
  id: string;
  name: string;
  cep: string;
  address?: string;
  city?: string;
  state?: string;
  createdAt?: string;
  // Compatibility fields
  number?: string;
  neighborhood?: string;
  zipCode?: string;
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
  
  locations: Location[];
}