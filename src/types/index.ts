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
  address: string;
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
  monthlyRent: number;
  status: "active" | "terminated";
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