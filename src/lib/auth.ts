import { User } from "@/types";

const USERS_KEY = "rental_users";
const CURRENT_USER_KEY = "rental_current_user";

export function initializeAuth(): void {
  if (typeof window === "undefined") return;
  
  const users = localStorage.getItem(USERS_KEY);
  if (!users) {
    const defaultUser: User = {
      id: "1",
      username: "cadu.pires",
      password: "teste123",
      name: "Administrador",
      role: "admin"
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([defaultUser]));
  }
}

export function login(username: string, password: string): User | null {
  if (typeof window === "undefined") return null;
  
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }
  
  return null;
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  
  const user = localStorage.getItem(CURRENT_USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}