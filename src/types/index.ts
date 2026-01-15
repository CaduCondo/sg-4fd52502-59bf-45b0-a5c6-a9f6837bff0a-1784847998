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
  documentType: "CPF" | "CNPJ";
  cpf: string; // Used for both CPF and CNPJ value
  rg?: string;
  email: string;
  phone: string;
  isActive: boolean; // Replaces status
  createdAt: string;
  observations?: string;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  value: number; // Monthly rent base value
  monthlyRent: number; // Total value including extras
  paymentDay: number;
  hasGarage: boolean;
  garageValue?: number;
  hasMotorcycleSpot: boolean;
  motorcycleSpotValue?: number;
  observations?: string; // Caução / Notes
  attachments?: { name: string; url: string; date?: string; type?: string }[];
  isActive: boolean; // Replaces status
  createdAt: string;
}

export interface Payment {
  id: string;
  rentalId: string;
  month: string;
  year: string;
  amount: number;
  dueDate: string;
  isPaid: boolean;
  paidAmount?: number; // Replaces partialAmount
  paidDate?: string;
  paymentMethod?: string;
  lateFee?: number;
  notes?: string;
  attachments?: { name: string; url: string; date?: string; type?: string }[];
  // Fields used in legacy/other components, keeping for compatibility if needed
  paymentCode?: string; 
  paymentLocation?: string; 
  status?: string; // Deprecated, mapped to isPaid
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