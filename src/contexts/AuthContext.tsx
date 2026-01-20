import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/router";
import { SystemUser } from "@/types";
import { getCurrentUser, isAuthenticated } from "@/services/authService";

interface AuthContextType {
  user: SystemUser | null;
  loading: boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshUser = () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser as SystemUser);
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = () => {
      try {
        // Use authService as single source of truth
        if (isAuthenticated()) {
          const currentUser = getCurrentUser();
          if (currentUser) {
            setUser(currentUser as SystemUser);
          } else {
            setUser(null);
            if (router.pathname !== "/login") {
              router.push("/login");
            }
          }
        } else {
          setUser(null);
          if (router.pathname !== "/login") {
            router.push("/login");
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Poll for auth changes every 5 seconds
    const interval = setInterval(() => {
      if (isAuthenticated()) {
        refreshUser();
      } else {
        setUser(null);
        if (router.pathname !== "/login") {
          router.push("/login");
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}