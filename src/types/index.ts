export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: "admin";
}

export interface Property {
  id: string;
  local: string;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  state: string;
  description: string;
  monthlyRent: number;
  status: "available" | "rented";
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  phone: string;
  email: string;
  observations?: string;
  status: "vacant" | "rented";
  createdAt: string;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
  paymentDay: number;
  observations?: string;
  attachments?: string[];
  hasMotorcycleSpot?: boolean;
  motorcycleSpotValue?: number;
  status: "active" | "ended" | "expired";
  createdAt: string;
}

export interface Payment {
  id: string;
  rentalId: string;
  month: string;
  year: number;
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  dueDate: string;
  createdAt: string;
}

export interface SystemConfig {
  adminFeePercentage: number;
  lastUpdated: string;
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