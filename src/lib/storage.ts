import { Property, Tenant, Rental, Payment, SystemConfig, User } from "@/types";

const PROPERTIES_KEY = "rental_properties";
const TENANTS_KEY = "rental_tenants";
const RENTALS_KEY = "rental_rentals";
const PAYMENTS_KEY = "rental_payments";
const CONFIG_KEY = "rental_config";
const USERS_KEY = "rental_users";

// Helper to manage localStorage
const createStorage = <T extends { id: string }>(key: string) => ({
  getAll: (): T[] => {
    if (typeof window === "undefined") return [];
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  },
  getById: (id: string): T | null => {
    if (typeof window === "undefined") return null;
    const items = JSON.parse(localStorage.getItem(key) || "[]");
    return items.find((item: any) => item.id === id) || null;
  },
  save: (data: T) => {
    const items = JSON.parse(localStorage.getItem(key) || "[]");
  }
});

export function initializeStorage(): void {
  if (typeof window === "undefined") return;
  
  if (!localStorage.getItem(CONFIG_KEY)) {
    const defaultConfig: SystemConfig = {
      adminFeePercentage: 6,
      lastUpdated: new Date().toISOString(),
      locations: ["Jd. Colombo", "Signore", "Lemos", "Marrom", "Cinza", "Dora", "Acacias", "Outros"]
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(defaultConfig));
  }
  
  // Initialize Users if empty
  if (!localStorage.getItem(USERS_KEY)) {
    const defaultUsers: User[] = [
      {
        id: "1",
        username: "admin",
        password: "123", // In a real app, this should be hashed
        name: "Administrador",
        role: "admin",
        createdAt: new Date().toISOString()
      },
      {
        id: "2",
        username: "cadu.pires",
        password: "teste123",
        name: "Cadu Pires",
        role: "admin", // Assuming admin role for full access
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
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

// Utility function to clean orphaned payments
export const cleanOrphanedPayments = () => {
  const payments = paymentStorage.getAll();
  const validPayments = payments.filter(p => {
    const rental = rentalStorage.getAll().find(r => r.id === p.rentalId);
    return !!rental;
  });
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(validPayments));
  return validPayments;
};

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

  update: (property: Property): void => {
    propertyStorage.save(property);
  },

  getById: (id: string): Property | null => {
    const properties = propertyStorage.getAll();
    return properties.find(p => p.id === id) || null;
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

  update: (tenant: Tenant): void => {
    tenantStorage.save(tenant);
  },

  getById: (id: string): Tenant | null => {
    const tenants = tenantStorage.getAll();
    return tenants.find(t => t.id === id) || null;
  },

  updateStatus: (id: string, isActive: boolean) => {
    const tenants = tenantStorage.getAll();
    const index = tenants.findIndex((t) => t.id === id);
    if (index !== -1) {
      tenants[index].isActive = isActive;
      localStorage.setItem(TENANTS_KEY, JSON.stringify(tenants));
    }
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

  update: (rental: Rental): void => {
    rentalStorage.save(rental);
  },

  getById: (id: string): Rental | null => {
    const rentals = rentalStorage.getAll();
    return rentals.find(r => r.id === id) || null;
  },

  updateStatus: (id: string, isActive: boolean): void => {
    if (typeof window === "undefined") return;
    const rentals = rentalStorage.getAll();
    const rental = rentals.find(r => r.id === id);
    if (rental) {
      rental.isActive = isActive;
      rentalStorage.save(rental);
    }
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

  update: (payment: Payment): void => {
    paymentStorage.save(payment);
  },

  getById: (id: string): Payment | null => {
    const payments = paymentStorage.getAll();
    return payments.find(p => p.id === id) || null;
  },
  
  delete: (id: string): void => {
    if (typeof window === "undefined") return;
    const payments = paymentStorage.getAll().filter(p => p.id !== id);
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
  }
};

export const userStorage = {
  getAll: (): User[] => {
    if (typeof window === "undefined") return [];
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  },
  
  getById: (id: string): User | null => {
    const users = userStorage.getAll();
    return users.find(u => u.id === id) || null;
  },
  
  save: (user: User): void => {
    if (typeof window === "undefined") return;
    const users = userStorage.getAll();
    const index = users.findIndex(u => u.id === user.id);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },
  
  update: (user: User): void => {
    userStorage.save(user);
  },
  
  resetPassword: (id: string, newPassword: string): void => {
    const users = userStorage.getAll();
    const user = users.find(u => u.id === id);
    if (user) {
      user.password = newPassword;
      userStorage.save(user);
    }
  },
  
  delete: (id: string): void => {
    if (typeof window === "undefined") return;
    const users = userStorage.getAll().filter(u => u.id !== id);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
};

export const configStorage = {
  get: (): SystemConfig => {
    if (typeof window === "undefined") return { 
      adminFeePercentage: 6, 
      lastUpdated: new Date().toISOString(),
      locations: ["Jd. Colombo", "Signore", "Lemos", "Marrom", "Cinza", "Dora", "Acacias", "Outros"]
    };
    const stored = JSON.parse(localStorage.getItem(CONFIG_KEY) || "null");
    if (!stored) {
      return { 
        adminFeePercentage: 6, 
        lastUpdated: new Date().toISOString(),
        locations: ["Jd. Colombo", "Signore", "Lemos", "Marrom", "Cinza", "Dora", "Acacias", "Outros"]
      };
    }
    // Ensure 'Outros' is always in locations
    if (stored.locations && !stored.locations.includes("Outros")) {
      stored.locations.push("Outros");
    }
    return stored;
  },
  
  update: (newConfig: SystemConfig): void => {
    if (typeof window === "undefined") return;
    
    localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
    
    const now = new Date();
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