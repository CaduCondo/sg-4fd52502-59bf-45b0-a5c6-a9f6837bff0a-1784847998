export interface Permission {
  id: string;
  code: string;
  description: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "manager" | "employee";
  permissions: Permission[];
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: boolean;
  last_login?: string;
  created_at?: string;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  // Campos snake_case para compatibilidade
  zip_code?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  is_active?: boolean;
}

export interface Property {
  id: string;
  description: string;
  address: string;
  value: number;
  monthlyRent?: number; // Alias for value
  status: "available" | "rented" | "maintenance" | "occupied" | "unavailable";
  locationId: string;
  location_id?: string; // Alias
  location?: string; // Nome do local para exibição
  locationDetails?: Location;
  features: string[];
  images: string[];
  ownerId?: string;
  complement?: string;
  iptu?: number;
  energy_meter?: string;
  water_meter?: string;
  notes?: string;
  
  // Campos adicionais
  propertyIdentifier?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  rooms?: number;
  bathrooms?: number;
  area?: number;
  hasGarage?: boolean;
  garageValue?: number;
  hasFurniture?: boolean;
  acceptsPets?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  status: "active" | "late" | "debt" | "rented" | "inactive";
  rg?: string;
  birthDate?: string;
  profession?: string;
  income?: number;

  // Campos adicionais
  document?: string;
  documentType?: string;
  document_type?: string; // Alias
  cnpj?: string;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate: string | null;
  value: number;
  monthlyRent: number; // Alias for value
  status: "active" | "terminated";
  isActive: boolean;
  paymentDay: number;
  contractUrl?: string;
  autoRenew: boolean;
  property?: Property;
  tenant?: Tenant;
  depositAmount?: number;
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
  attachments?: string[];
  contractAttachments?: string[];
  guaranteeType?: string;
  guaranteeValue?: number;
  guarantorName?: string;
  guarantorCpf?: string;
  guarantorPhone?: string;
  guarantorIncome?: number;
  hasGarage?: boolean;
  garageValue?: number;
  hasPartnerBroker?: boolean;
  partnerBrokerName?: string;
  partnerBrokerPhone?: string;
  partnerBrokerCpf?: string;
  partnerBrokerCommission?: number;
  
  // Campos de compatibilidade
  security_deposit?: number;
  installments?: any[];
  totalInstallments?: number;
  pixCode?: string;
}

export interface Payment {
  id: string;
  rentalId: string;
  rental_id?: string;
  propertyId: string;
  property_id?: string;
  tenantId: string;
  tenant_id?: string;
  expectedAmount: number;
  expected_amount?: number;
  paidAmount: number;
  paid_amount?: number;
  paymentDate: string | null;
  payment_date?: string | null;
  referenceMonth: number;
  reference_month?: string | number;
  referenceYear: number;
  reference_year?: string | number;
  status: "paid" | "pending" | "overdue" | "partial";
  discount: number;
  lateFee: number;
  late_fee?: number;
  interest: number;
  notes: string;
  paymentMethod: string;
  payment_method?: string;
  receiptUrl: string;
  receipt_url?: string;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
  locationId: string;
  location_id?: string;
  paymentTime: string | null;
  payment_time?: string | null;
  rental?: Rental;
  property?: Property;
  tenant?: Tenant;

  // Campos adicionais usados em componentes
  dueDate?: string; // Data de vencimento calculada ou salva
  breakdown?: any; // Detalhamento do pagamento
  type?: string; // Tipo de pagamento (aluguel, depósito, etc)
  installment?: number;
  totalInstallments?: number;
  installmentNumber?: number;
  paymentCode?: string; // Pix code ou similar
}

export interface PaymentInstallment {
  installmentNumber: number;
  value: number;
  dueDate: Date;
  status: "pending" | "paid" | "overdue";
}

export interface PaymentFilters {
  status?: string;
  location_id?: string;
  month?: string;
  year?: string;
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  change?: number;
  trend?: "up" | "down" | "neutral";
  icon?: any;
}

export interface FinancialRecord {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  description: string;
  status: "pending" | "completed";
}

export interface CompanyConfig {
  id: string;
  company_name: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

export interface LocationExpense {
  id: string;
  location_id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  status: string;
}

export interface RoleMenuPermission {
  id: string;
  role: string;
  menu: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface UserLocationPermission {
  id: string;
  user_id: string;
  location_id: string;
}