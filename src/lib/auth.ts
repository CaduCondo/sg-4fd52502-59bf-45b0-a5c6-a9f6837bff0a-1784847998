import { User } from "@/types";
import { userStorage } from "./storage";

const AUTH_KEY = "rental_auth_user";

export function login(username: string, password: string): User | null {
  const users = userStorage.getAll();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) {
    if (typeof window !== "undefined") {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    }
    return user;
  }

  return null;
}

export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEY);
  }
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(AUTH_KEY);
  if (!userStr) return null;
  return JSON.parse(userStr);
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function hasRole(role: "admin" | "corretor" | "financeiro"): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

export function hasAnyRole(roles: ("admin" | "corretor" | "financeiro")[]): boolean {
  const user = getCurrentUser();
  return user ? roles.includes(user.role) : false;
}