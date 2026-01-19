import { 
  User, 
  SystemUser, 
  Property, 
  Tenant, 
  Rental, 
  Payment,
  CompanyConfig 
} from "@/types";

// ============================================================
// CONSTANTS
// ============================================================

const STORAGE_KEYS = {
  PROPERTIES: "rental_properties",
  TENANTS: "rental_tenants",
  RENTALS: "rental_rentals",
  PAYMENTS: "rental_payments",
  USERS: "rental_users",
  COMPANY_CONFIG: "rental_config",
  AUTH_USER: "rental_auth_user",
  // Legacy keys support
  ADMIN_FEE: "rental_admin_fee",
  LATE_FEE: "rental_late_fee",
  INTEREST_RATE: "rental_interest_rate"
};

// ============================================================
// CONFIG STORAGE
// ============================================================

export const configStorage = {
  get(): CompanyConfig {
    if (typeof window === "undefined") {
      return getEmptyConfig();
    }
    
    const data = localStorage.getItem(STORAGE_KEYS.COMPANY_CONFIG);
    if (!data) return getEmptyConfig();
    
    try {
      const parsed = JSON.parse(data);
      // Ensure numeric values are numbers
      return {
        ...parsed,
        admin_fee_percentage: Number(parsed.admin_fee_percentage || 0),
        late_fee_percentage: Number(parsed.late_fee_percentage || 0),
        interest_rate_percentage: Number(parsed.interest_rate_percentage || 0)
      };
    } catch (e) {
      return getEmptyConfig();
    }
  },
  
  save(config: CompanyConfig): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.COMPANY_CONFIG, JSON.stringify(config));
    
    // Sync legacy individual keys for backward compatibility
    if (config.admin_fee_percentage !== undefined) {
      localStorage.setItem(STORAGE_KEYS.ADMIN_FEE, config.admin_fee_percentage.toString());
    }
    if (config.late_fee_percentage !== undefined) {
      localStorage.setItem(STORAGE_KEYS.LATE_FEE, config.late_fee_percentage.toString());
    }
    if (config.interest_rate_percentage !== undefined) {
      localStorage.setItem(STORAGE_KEYS.INTEREST_RATE, config.interest_rate_percentage.toString());
    }
  }
};

export const userStorage = {
  get(): SystemUser | null {
    if (typeof window === "undefined") return null;
    const item = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return item ? JSON.parse(item) : null;
  },
  
  save(user: SystemUser): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  },
  
  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  }
};

export const saveCompanyConfig = configStorage.save;
export const getStoredCompanyConfig = configStorage.get;

function getEmptyConfig(): CompanyConfig {
  return {
    id: "local",
    company_name: "",
    cnpj: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    admin_fee_percentage: 0,
    late_fee_percentage: 0,
    interest_rate_percentage: 0
  };
}

// ============================================================
// MOCKS & HELPERS
// ============================================================

export const MOCK_COMPANY_CONFIG: CompanyConfig = {
  id: "1",
  company_name: "Imobiliária Demo",
  cnpj: "00.000.000/0000-00",
  email: "contato@imobiliaria.com",
  phone: "(11) 99999-9999",
  address: "Rua Exemplo, 123",
  city: "São Paulo",
  state: "SP",
  zip_code: "00000-000",
  admin_fee_percentage: 10,
  late_fee_percentage: 2,
  interest_rate_percentage: 1
};

export const initializeStorage = () => {
  if (typeof window === "undefined") return;
  // Initialization logic if needed
};