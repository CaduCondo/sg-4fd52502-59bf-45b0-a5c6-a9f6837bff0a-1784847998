export interface Permission {
  id: string;
  code: string;
  description: string;
}

export interface RoleMenuPermission {
  id: string;
  role: "admin" | "financial" | "broker";
  menu: string;
  menu_id?: string; // Compatibility
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface UserLocationPermission {
  id: string;
  user_id: string;
  location_id: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: "admin" | "financial" | "broker";
  active: boolean;
  status: string;
  cpf: string;
  rg?: string; // Added property
  phone?: string; // Added property
  photo?: string; // Added property
  birthDate?: string; // Added property
  auth_user_id: string | null;
  created_at: string;
  usuario?: string;
  password?: string; // Optional for updates
}

export interface CompanyConfig {
  id: string;
  company_name: string;
  cnpj: string;
  phone: string;
  email: string;
  address: string;
  city?: string; // Added property
  state?: string; // Added property
  zip_code?: string; // Added property
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  created_at: string;
  updated_at: string;
  
  // Financial configs
  admin_fee_percentage?: number;
  management_fee_percentage?: number;
  broker_fee_percentage?: number;
  late_fee_percentage?: number;
  interest_rate_percentage?: number;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  manager_id: string | null;
  active: boolean;
  is_active?: boolean; // Compatibility
  created_at: string;
  updated_at: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
}

export interface Property {
  id: string;
  locationId: string;
  location?: string;
  locationDetails?: {
    name: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zip_code?: string;
  };
  propertyIdentifier: string;
  complement?: string;
  description?: string;
  rooms: number;
  bathrooms: number;
  area: number;
  hasGarage: boolean;
  hasFurniture: boolean;
  acceptsPets: boolean;
  status: "available" | "occupied" | "unavailable";
  images: string[];
  createdAt: string;
  address?: string;
  features?: string[];
  monthlyRent?: number;
  value?: number;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  garageValue?: number;
  type?: string;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  document: string; // CPF or CNPJ
  documentType?: "cpf" | "cnpj";
  document_type?: "cpf" | "cnpj";
  rg?: string;
  cpf?: string;
  cnpj?: string;
  status: "active" | "inactive" | "rented" | "late" | "debt";
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string;
  value: number;
  monthlyRent: number;
  isActive: boolean;
  paymentDay: number;
  status: "active" | "completed" | "terminated";
  depositAmount?: number;
  hasGarage?: boolean;
  hasPartnerBroker?: boolean;
  attachments?: string[];
  contractAttachments?: string[];
  autoRenew?: boolean;
  payment_code?: string;
  
  // Expanded fields for UI and calculations
  property?: Property;
  tenant?: Tenant;
  garageValue?: number;
  depositInstallments?: number;
  depositInstallment1?: number;
  depositInstallment2?: number;
  depositInstallment3?: number;
  depositPaymentDate?: string;
  depositInstallment2PaymentDate?: string;
  depositInstallment3PaymentDate?: string;
  depositPixCode?: string;
  depositInstallment2PixCode?: string;
  depositInstallment3PixCode?: string;
  security_deposit?: number;
  pixCode?: string;
  installments?: number;
  totalInstallments?: number;
}

export interface Payment {
  id: string;
  rentalId: string;
  propertyId: string;
  tenantId: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount?: number;
  paymentDate?: string;
  status: "paid" | "pending" | "overdue" | "partial";
  referenceMonth?: number;
  referenceYear?: number;
  discount?: number;
  lateFee?: number;
  interest?: number;
  notes?: string;
  paymentMethod?: string;
  receiptUrl?: string;
  type?: "rent" | "deposit";
  rental?: Rental;
  property?: Property;
  tenant?: Tenant;
  paymentTime?: string;
  breakdown?: any;
  installment?: number;
  totalInstallments?: number;
  paymentCode?: string;
  attachments?: string[];
}

export interface PaymentInstallment {
  installment: number;
  totalInstallments: number;
  dueDate: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
}

export interface PaymentFilters {
  status?: string;
  location_id?: string;
  month?: number;
  year?: number;
  search?: string;
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon?: any;
}

export interface LocationExpense {
  id: string;
  locationId: string;
  location_id?: string; // For compatibility
  expenseType: "water" | "electricity" | "gas" | "internet" | "maintenance" | "other";
  expense_type?: "water" | "electricity" | "gas" | "internet" | "maintenance" | "other"; // Compatibility
  description: string;
  amount: number;
  referenceMonth: number;
  reference_month?: number; // Compatibility
  referenceYear: number;
  reference_year?: number; // Compatibility
  dueDate?: string; // Optional in DB, but good to have
  due_date?: string; // Compatibility
  date?: string; // Compatibility
  paymentDate?: string | null;
  payment_date?: string | null; // Compatibility
  status: "pending" | "paid" | "overdue";
  notes?: string;
  attachments: string[];
  updatedAt?: string;
  updated_at?: string; // Compatibility
  category?: string; // For compatibility
  recurrent?: boolean;
  locationName?: string;
}

// User type for compatibility with storage.ts
export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "financial" | "broker";
}