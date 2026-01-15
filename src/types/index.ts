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
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  description?: string;
  location: string; // Renamed from local to location for consistency
  type: string;
  status: "available" | "occupied";
  monthlyRent: number;
  value?: number;
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
  value: number;
  monthlyRent: number;
  paymentDay: number;
  hasGarage: boolean;
  garageValue?: number;
  deposit?: number; // Add missing deposit field
  observations?: string;
  attachments?: Attachment[];
  isActive: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  rentalId: string;
  referenceMonth: string; // Renamed from month for clarity/consistency
  referenceYear: string;  // Renamed from year for clarity/consistency
  dueDate: string;        // Add missing dueDate
  expectedAmount: number;
  paidAmount?: number;
  paymentDate?: string;
  paymentMethod?: "pix" | "boleto" | "cash" | "dinheiro"; // Add dinheiro for compatibility
  paymentLocation?: "CP" | "CD" | "CE";
  paymentCode?: string;
  status: "pending" | "paid" | "partial" | "overdue";
  isPaid: boolean;        // Add missing isPaid helper flag
  lateFee?: number;
  interest?: number;
  adminFee?: number;      // Add missing adminFee
  notes?: string;         // Add missing notes
  attachments?: Attachment[];
  partialPayments?: Array<{
    id: string;
    amount: number;
    date: string;
    method?: string;
    location?: string;
    code?: string;
  }>;
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