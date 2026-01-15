import { Property, Tenant, Rental, Payment, SystemConfig } from "@/types";

const PROPERTIES_KEY = "rental_properties";
const TENANTS_KEY = "rental_tenants";
const RENTALS_KEY = "rental_rentals";
const PAYMENTS_KEY = "rental_payments";
const CONFIG_KEY = "rental_config";

export function initializeStorage(): void {
  if (typeof window === "undefined") return;
  
  if (!localStorage.getItem(CONFIG_KEY)) {
    const defaultConfig: SystemConfig = {
      adminFeePercentage: 6,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(defaultConfig));
  }
  
  if (!localStorage.getItem(PROPERTIES_KEY)) {
    localStorage.setItem(PROPERTIES_KEY, JSON.stringify([]));
  }
  
  if (!localStorage.getItem(TENANTS_KEY)) {
    localStorage.setItem(TENANTS_KEY, JSON.stringify([]));
  }
  
  if (!localStorage.getItem(RENTALS_KEY)) {
    localStorage.setItem(RENTALS_KEY, JSON.stringify([]));
  }
  
  if (!localStorage.getItem(PAYMENTS_KEY)) {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify([]));
  }
}

export const propertyStorage = {
  getAll: (): Property[] => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(PROPERTIES_KEY) || "[]");
  },
  
  save: (property: Property): void => {
    if (typeof window === "undefined") return;
    const properties = propertyStorage.getAll();
    const index = properties.findIndex(p => p.id === property.id);
    if (index >= 0) {
      properties[index] = property;
    } else {
      properties.push(property);
    }
    localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
  },
  
  delete: (id: string): void => {
    if (typeof window === "undefined") return;
    const properties = propertyStorage.getAll().filter(p => p.id !== id);
    localStorage.setItem(PROPERTIES_KEY, JSON.stringify(properties));
  }
};

export const tenantStorage = {
  getAll: (): Tenant[] => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(TENANTS_KEY) || "[]");
  },
  
  save: (tenant: Tenant): void => {
    if (typeof window === "undefined") return;
    const tenants = tenantStorage.getAll();
    const index = tenants.findIndex(t => t.id === tenant.id);
    if (index >= 0) {
      tenants[index] = tenant;
    } else {
      tenants.push(tenant);
    }
    localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
  },
  
  delete: (id: string): void => {
    if (typeof window === "undefined") return;
    const tenants = tenantStorage.getAll().filter(t => t.id !== id);
    localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
  }
};

export const rentalStorage = {
  getAll: (): Rental[] => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(RENTALS_KEY) || "[]");
  },
  
  save: (rental: Rental): void => {
    if (typeof window === "undefined") return;
    const rentals = rentalStorage.getAll();
    const index = rentals.findIndex(r => r.id === rental.id);
    if (index >= 0) {
      rentals[index] = rental;
    } else {
      rentals.push(rental);
    }
    localStorage.setItem(RENTALS_KEY, JSON.stringify(rentals));
  },
  
  delete: (id: string): void => {
    if (typeof window === "undefined") return;
    const rentals = rentalStorage.getAll().filter(r => r.id !== id);
    localStorage.setItem(RENTALS_KEY, JSON.stringify(rentals));
  }
};

export const paymentStorage = {
  getAll: (): Payment[] => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(PAYMENTS_KEY) || "[]");
  },
  
  save: (payment: Payment): void => {
    if (typeof window === "undefined") return;
    const payments = paymentStorage.getAll();
    const index = payments.findIndex(p => p.id === payment.id);
    if (index >= 0) {
      payments[index] = payment;
    } else {
      payments.push(payment);
    }
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  },
  
  delete: (id: string): void => {
    if (typeof window === "undefined") return;
    const payments = paymentStorage.getAll().filter(p => p.id !== id);
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  }
};

export const configStorage = {
  get: (): SystemConfig => {
    if (typeof window === "undefined") return { adminFeePercentage: 6, lastUpdated: new Date().toISOString() };
    return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{"adminFeePercentage":6,"lastUpdated":""}');
  },
  
  update: (percentage: number): void => {
    if (typeof window === "undefined") return;
    const now = new Date();
    const config: SystemConfig = {
      adminFeePercentage: percentage,
      lastUpdated: now.toISOString()
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const payments = paymentStorage.getAll();
    
    payments.forEach(payment => {
      const paymentDate = new Date(payment.dueDate);
      if (paymentDate.getMonth() + 1 === currentMonth && paymentDate.getFullYear() === currentYear) {
        paymentStorage.save(payment);
      }
    });
  }
};