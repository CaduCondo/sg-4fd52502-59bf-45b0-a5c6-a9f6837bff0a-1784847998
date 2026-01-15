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
  local: string;
  type?: string;
  cep?: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  description?: string;
  monthlyRent: number;
  status: "available" | "occupied";
  isActive?: boolean;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  documentType?: "CPF" | "CNPJ";
  cpf: string;
  rg?: string;
  email?: string;
  phone?: string;
  observations?: string;
  isActive?: boolean;
  createdAt: string;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate?: string;
  value: number; // Base rent value
  monthlyRent: number; // Redundant but kept for compatibility
  paymentDay: number;
  hasGarage: boolean;
  garageValue?: number;
  hasMotorcycleSpot?: boolean;
  motorcycleSpotValue?: number;
  observations?: string;
  attachments?: { name: string; url: string; date?: string; type?: string }[];
  isActive: boolean;
  createdAt: string; // Add createdAt
}

export interface Payment {
  id: string;
  rentalId: string;
  month: string;
  year: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidDate?: string;
  paidAmount?: number;
  lateFee?: number;
  paymentMethod?: string;
  notes?: string;
  attachments?: { name: string; url: string; type: string }[];
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