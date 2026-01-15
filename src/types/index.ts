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
  value: number;
  monthlyRent: number;
  paymentDay: number;
  hasGarage: boolean;
  garageValue?: number;
  observations?: string;
  attachments?: Attachment[];
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
  paidAmount: number;
  paymentDate?: string;
  paymentMethod?: "pix" | "boleto" | "dinheiro";
  paymentLocation?: "CP" | "CD" | "CE";
  paymentCode?: string;
  status: "paid" | "pending" | "partial" | "overdue";
  isPaid: boolean;
  adminFee: number;
  lateFee?: number;
  fine?: number;
  interest?: number;
  discount?: boolean;
  attachments?: { id: string; name: string; url: string; date: string }[];
  partialPayments?: { 
    id: string; 
    amount: number; 
    date: string; 
    method: string;
    location?: string;
    code?: string;
  }[];
  notes?: string;
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