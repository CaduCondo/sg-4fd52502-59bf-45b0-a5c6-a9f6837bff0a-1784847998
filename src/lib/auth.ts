import { User as UserType } from "@/types";
import { userStorage } from "./storage";
import { supabase } from "@/integrations/supabase/client";

const AUTH_KEY = "rental_auth_user";

// Helper function to check if user is authenticated via Supabase
async function getSupabaseUser(): Promise<UserType | null> {
  try {
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    if (!supabaseUser) return null;

    // Get user profile from system_users table (not user_profiles)
    const { data: profile } = await supabase
      .from("system_users")
      .select("*")
      .eq("id", supabaseUser.id)
      .single();

    if (profile) {
      // Map Portuguese roles to English internal roles
      let role: "admin" | "user" | "broker" | "financial" = "user";
      const dbRole = profile.role?.toLowerCase();
      
      if (dbRole === "admin" || dbRole === "administrador") role = "admin";
      else if (dbRole === "corretor" || dbRole === "broker") role = "broker";
      else if (dbRole === "financeiro" || dbRole === "financial") role = "financial";
      
      const user: UserType = {
        id: profile.id,
        name: profile.name || supabaseUser.email?.split("@")[0] || "Admin",
        username: profile.username || supabaseUser.email?.split("@")[0] || "",
        email: profile.email || supabaseUser.email || "",
        password: "", // Not needed for authenticated users
        role: role,
        phone: profile.phone || "",
        rg: profile.rg || "",
        cpf: profile.cpf || "",
        active: profile.active ?? true,
        createdAt: profile.created_at || supabaseUser.created_at
      };

      // Sync to localStorage for compatibility
      if (typeof window !== "undefined") {
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));
      }

      return user;
    }
  } catch (error) {
    console.error("Error getting Supabase user:", error);
  }

  return null;
}

// Get user from localStorage (fallback)
function getLocalUser(): UserType | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem(AUTH_KEY);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Login with localStorage (legacy system)
export function login(username: string, password: string): UserType | null {
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

// Logout from both systems
export async function logout(): Promise<void> {
  // Logout from Supabase
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error signing out from Supabase:", error);
  }

  // Clear localStorage
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("currentUser");
  }
}

// Get current user (checks Supabase first, then localStorage)
export async function getCurrentUserAsync(): Promise<UserType | null> {
  // Try Supabase first
  const supabaseUser = await getSupabaseUser();
  if (supabaseUser) return supabaseUser;

  // Fallback to localStorage
  return getLocalUser();
}

// Synchronous version (checks localStorage only)
export function getCurrentUser(): UserType | null {
  return getLocalUser();
}

// Check if user is authenticated (checks both systems)
export async function isAuthenticatedAsync(): Promise<boolean> {
  const user = await getCurrentUserAsync();
  return user !== null;
}

// Synchronous version (checks localStorage only)
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

// Check if user has specific role
export async function hasRoleAsync(role: "admin" | "broker" | "financial" | "user"): Promise<boolean> {
  const user = await getCurrentUserAsync();
  return user?.role === role;
}

// Synchronous version
export function hasRole(role: "admin" | "broker" | "financial" | "user"): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

// Check if user has any of the specified roles
export async function hasAnyRoleAsync(roles: ("admin" | "broker" | "financial" | "user")[]): Promise<boolean> {
  const user = await getCurrentUserAsync();
  return user ? roles.includes(user.role) : false;
}

// Synchronous version
export function hasAnyRole(roles: ("admin" | "broker" | "financial" | "user")[]): boolean {
  const user = getCurrentUser();
  return user ? roles.includes(user.role) : false;
}

export interface User {
  id?: string;
  name: string;
  email: string;
  photo?: string;
  role: "admin" | "user" | "broker" | "financial";
  token?: string;
  // Optional fields for compatibility with SystemUser
  username?: string;
  password?: string;
}

export type Role = "admin" | "user" | "broker" | "financial";
