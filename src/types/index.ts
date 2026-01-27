export interface User {
  id?: string;
  name: string;
  email: string;
  photo?: string;
  role: "admin" | "user" | "broker" | "financial";
  token?: string;
  username?: string;
  password?: string;
  phone?: string;
  rg?: string;
  cpf?: string;
  active?: boolean;
  createdAt?: string;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  photo?: string;
  phone?: string;
  username?: string; // Adicionado
  password?: string; // Adicionado para facilitar tipagem no formulário
  role: "admin" | "broker" | "financial";
  active: boolean;
  locationId?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyConfig {
  id: string;
  company_name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  admin_fee_percentage: number;
  late_fee_percentage: number;
  interest_rate_percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface RoleMenuPermission {
  id: string;
  role: string;
  menu_id: string;
  created_at?: string;
}

export interface UserLocationPermission {
  id: string;
  user_id: string;
  location_id: string;
  created_at?: string;
}

export interface Property {
  id: string;
  // Location info
  locationId: string;
  location?: string; // Derived name
  complement?: string; // DB field
  
  // Address details mapped from Location
  address?: string; // Mapped from street
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;

  // Details
  description?: string; // DB field
  rooms?: number; // DB field - Total de cômodos (não confundir com quartos)
  bathrooms?: number; // DB field
  area?: number; // DB field
  hasGarage?: boolean; // Mapped from has_garage
  
  // Novos campos
  images?: string[]; // Array de URLs das imagens
  hasFurniture?: boolean; // Móveis planejados
  acceptsPets?: boolean; // Aceita pets
  
  // Financial
  value?: number; // DB field - Valor do imóvel/aluguel
  garageValue?: number; // Mapped from garage_value

  // Status & Metadata
  status: "available" | "occupied" | "unavailable";
  propertyIdentifier?: string; // Mapped from property_identifier
  createdAt?: string;
  updatedAt?: string;
  
  // Database snake_case fallbacks (optional, for raw data)
  location_id?: string;
  has_garage?: boolean;
  garage_value?: number;
  property_identifier?: string;
  has_furniture?: boolean;
  accepts_pets?: boolean;
  
  // DEPRECATED/LEGACY FIELDS (mantidos para compatibilidade, mas NÃO existem no banco)
  // Estes campos eram usados no código antigo mas não existem na tabela properties
  type?: string; // DEPRECATED - Não existe no banco
  bedrooms?: number; // DEPRECATED - Use 'rooms' ao invés
  monthlyRent?: number; // DEPRECATED - Use 'value' ao invés
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  documentType: "cpf" | "cnpj";
  document: string;
  cpf?: string;
  rg?: string;
  cnpj?: string;
  location_id?: string;
  document_type?: "cpf" | "cnpj"; // Database field match
  status: "active" | "inactive" | "rented" | "locatario";
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  active: boolean;
  // Campos opcionais para UI/Formulário
  address?: string;
  notes?: string;
}

export interface Rental {
  id: string;
  propertyId: string;
  tenantId: string;
  startDate: string;
  endDate?: string;
  
  // Financials
  rentAmount: number;
  monthlyRent?: number; // Alias
  value?: number; // Alias for total value
  depositAmount?: number;
  deposit?: string; // DB field is text
  securityDeposit?: number; // Valor da Caução
  garageValue?: number;
  condominiumFee?: number;
  iptuFee?: number;
  installments?: number;
  
  // Deposit Installments
  depositInstallments?: number;
  depositInstallment1?: number;
  depositInstallment2?: number;
  depositInstallment3?: number;
  
  // Deposit Payment Info
  depositPaymentDate?: string;
  depositPixCode?: string;
  
  depositInstallment1PaymentDate?: string;
  depositInstallment1PixCode?: string;
  
  depositInstallment2PaymentDate?: string;
  depositInstallment2PixCode?: string;
  
  depositInstallment3PaymentDate?: string;
  depositInstallment3PixCode?: string;
  
  // Status & Config
  status: "pending" | "active" | "completed" | "paid" | "overdue" | "terminated";
  isActive?: boolean;
  paymentDay: number;
  autoRenew: boolean;
  hasGarage?: boolean;
  
  // Relations & Meta
  property?: Property;
  tenant?: Tenant;
  contractUrl?: string;
  notes?: string;
  attachments?: string[];
  contractAttachments?: string[];
  pixCode?: string;
  
  // Helper fields for display/logic
  durationMonths?: number;
  dueDate?: string;
  receivedDate?: string;
  paidAmount?: number;
  referenceMonth?: number;
  referenceYear?: number;
  
  createdAt?: string;
  hasPartnerBroker?: boolean;
  partnerBrokerValue?: number;
}

export interface Payment {
  id: string;
  rentalId: string;
  dueDate: string;
  expectedAmount: number;
  paidAmount?: number;
  paymentDate?: string;
  status: "pending" | "paid" | "overdue" | "partial";
  paymentMethod?: string;
  paymentLocation?: string;
  paymentCode?: string;
  notes?: string;
  referenceMonth: number;
  referenceYear: number;
  receiptUrl?: string;
  attachments?: string[];
  
  // Fees & Discounts
  penaltyAmount?: number;
  interestAmount?: number;
  discountAmount?: number;
  lateFee?: number; // Alias
  interest?: number; // Alias
  
  installmentNumber?: number;
  partialPayments?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Location {
  id: string;
  name: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zip_code?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Aliases
  address?: string;
  cep?: string;
  zipCode?: string;
}

export type TenantStatus = "active" | "inactive" | "rented";
export type RentalStatus = "active" | "completed" | "canceled";

export interface DepositInstallment {
  id: string;
  rentalId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: "pending" | "paid" | "overdue" | "partial";
  paidAmount?: number;
  paymentDate?: string;
  paymentMethod?: string;
  paymentLocation?: string;
  paymentCode?: string;
  notes?: string;
  referenceMonth: number;
  referenceYear: number;
  receiptUrl?: string;
  attachments?: string[];
  
  // Fees & Discounts
  penaltyAmount?: number;
  interestAmount?: number;
  discountAmount?: number;
  lateFee?: number; // Alias
  interest?: number; // Alias
  
  createdAt?: string;
  updatedAt?: string;
}