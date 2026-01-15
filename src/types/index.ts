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
  type?: "Apartamento" | "Casa" | "Comercial" | "Terreno";
  cep: string;
  address: string;
  number: string;
  complement?: string;
  state: string;
  description: string;
  monthlyRent: number;
  status: "available" | "occupied";
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
  status: "vacant" | "active" | "inactive";
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
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
  hasMotorcycleSpot?: boolean;
  motorcycleSpotValue?: number;
  hasGarage?: boolean;
  garageValue?: number;
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
  status?: "paid" | "unpaid" | "partial";
  partialAmount?: number;
  paymentMethod?: "Pix" | "Boleto" | "Dinheiro";
  paymentLocation?: "CP" | "CD" | "CE";
  paymentCode?: string;
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