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
  management_fee_percentage?: number; // Nova taxa
  late_fee_percentage: number;
  interest_rate_percentage: number;
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
  hasPartnerBroker?: boolean; // Corretor parceiro
  
  // Financial
  value?: number; // DB field - Valor do imóvel/aluguel
  garageValue?: number; // Mapped from garage_value

  // Status & Metadata
  status: "available" | "occupied" | "unavailable";
  propertyIdentifier?: string; // Mapped from property_identifier
  createdAt?: string;
  updatedAt?: string;
  
  // Detalhes da localização (objeto completo para UI rica)
  locationDetails?: {
    id: string;
    name: string;
    city: string;
    state: string;
    neighborhood?: string;
    address?: string;
    zipCode?: string;
  };

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
  paymentDay: number;
  monthlyRent?: number; // Optional since value is used
  value: number; // This seems to be the main rent value field now
  depositAmount: number;
  status: 'active' | 'terminated' | 'pending';
  isActive: boolean;
  attachments: string[];
  contractAttachments: string[];
  autoRenew: boolean;
  
  // Optional fields
  hasGarage?: boolean;
  garageValue?: number;
  hasPartnerBroker?: boolean;
  
  // Deposit Installments
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
  pixCode?: string;

  // Legacy/Property mirror fields (sometimes used in contracts)
  securityDeposit?: number; // Alias for depositAmount/depositInstallment1

  // Dados aninhados do Supabase (joins)
  properties?: {
    id: string;
    property_identifier?: string;
    complement?: string;
    value?: number;
    locations?: {
      id: string;
      name: string;
      city?: string;
    };
  };
  tenants?: {
    id: string;
    name: string;
    phone?: string;
  };
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

// Location Expenses (contas a pagar por local)
export interface LocationExpense {
  id: string;
  locationId: string;
  expenseType: 'water' | 'electricity' | 'gas' | 'internet' | 'maintenance' | 'other';
  description?: string;
  amount: number;
  referenceMonth: number;
  referenceYear: number;
  dueDate?: string;
  paymentDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  notes?: string;
  attachments?: string[];
  createdAt?: string;
  updatedAt?: string;
}