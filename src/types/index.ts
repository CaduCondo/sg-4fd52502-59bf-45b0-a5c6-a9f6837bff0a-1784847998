export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: "admin" | "corretor" | "financeiro";
  rg?: string;
  cpf?: string;
  email?: string;
  phone?: string;
  photo?: string;
  active?: boolean;
  createdAt: string;
}

export interface SystemUser {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  rg?: string;
  cpf?: string;
  password: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  cep: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  createdAt: string;
}

export interface Property {
  id: string;
  location: string;
  address: string;
  number?: string;
  complement: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  zipCode?: string;
  monthlyRent: number;
  rentValue: number;
  type: string;
  status: "available" | "occupied" | "unavailable";
  description?: string;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  document: string | null;
  documentType?: "cpf" | "cnpj";
  cpf?: string; // Add optional for backward compatibility during migration
  email: string | null;
  phone: string | null;
  status: "active" | "inactive" | "rented" | "locador";
  createdAt: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  city?: string;
  state?: string;
}

export interface Config {
  adminFeePercentage: number;
  lateFeePercentage?: number;
  interestRatePercentage?: number;
  locations: Location[];
}

export interface Attachment {
  name: string;
  url: string;
  date: string;
  type?: string;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  paymentDay: number;
  hasGarage: boolean;
  garageValue?: number;
  value: number;
  deposit?: string;
  contractAttachments?: Attachment[];
  attachments?: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  rentalId: string;
  referenceMonth: number;
  referenceYear: number;
  expectedAmount: number;
  paidAmount: number;
  dueDate: string;
  paymentDate?: string;
  paymentMethod?: string;
  paymentLocation?: string;
  paymentCode?: string;
  status: "paid" | "pending" | "partial" | "overdue";
  lateFee: number;
  interest: number;
  notes?: string;
  attachments: string[];
  partialPayments: Array<{
    amount: number;
    date: string;
    method: string;
  }>;
  createdAt: string;
}

export interface SystemConfig {
  adminFeePercentage: number;
  lateFeePercentage: number;
  interestRatePercentage: number;
  lastUpdated: string;
  locations?: string[];
}

export interface DashboardStats {
  totalProperties: number;
  rentedProperties: number;
  availableProperties: number;
  totalTenants: number;
  paidThisMonth: number;
  unpaidThisMonth: number;
  totalRevenue: number;
  adminFee: number;
  dueThisMonth: number;
}