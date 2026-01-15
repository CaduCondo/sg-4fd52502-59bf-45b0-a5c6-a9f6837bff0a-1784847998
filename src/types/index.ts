export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  rg?: string;
  cpf?: string;
  phone?: string;
  email?: string;
  role: "admin" | "corretor" | "financeiro";
  createdAt: string;
}

export interface Property {
  id: string;
  location: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  monthlyRent: number;
  type?: string;
  description?: string;
  status: "available" | "occupied";
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  cpf: string;
  rg?: string;
  documentType: "cpf" | "cnpj";
  email: string;
  phone: string;
  status: "active" | "inactive" | "rented";
  createdAt: string;
}

export interface Config {
  adminFeePercentage: number;
  locations: string[]; // Array of location names
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
  value: number; // Total value (monthlyRent + garageValue)
  deposit?: string;
  contractAttachments?: Attachment[];
  isActive: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  rentalId: string;
  referenceMonth: number;
  referenceYear: number;
  dueDate: string;
  expectedAmount: number;
  paidAmount?: number;
  paymentDate?: string;
  status: "pending" | "paid" | "partial" | "overdue";
  paymentMethod?: string;
  notes?: string;
  attachments?: string[];
  fineAmount?: number;
  interestAmount?: number;
  partialPayments?: any[];
  createdAt: string;
}

export interface SystemConfig {
  adminFeePercentage: number;
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