import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/router";
import { SystemUser } from "@/types";
import { userStorage } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: SystemUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Simple session check - no complex queries
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Load from storage first (fast)
          const storedUser = userStorage.get();
          if (storedUser) {
            setUser(storedUser);
            setLoading(false);
            return;
          }

          // If not in storage, fetch once
          const { data: systemUserData } = await supabase
            .from("system_users")
            .select("*")
            .eq("email", session.user.email)
            .single();

          const systemUser = systemUserData as any; // Cast to any to avoid strict type checking on missing fields

          if (systemUser) {
            const userData: SystemUser = {
              id: systemUser.id,
              email: systemUser.email,
              name: systemUser.name,
              role: (systemUser.role === "admin" ? "admin" : "broker") as "admin" | "broker" | "financial",
              active: systemUser.active,
              locationId: systemUser.location_id || systemUser.locationId, // Try both formats
              created_at: systemUser.created_at,
              updated_at: systemUser.updated_at,
            };
            
            setUser(userData);
            userStorage.save(userData);
          }
        } else {
          setUser(null);
          userStorage.clear();
        }
      } catch (error) {
        console.error("Error in auth:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen to auth changes (login/logout only)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        userStorage.clear();
        if (router.pathname !== "/login") {
          router.push("/login");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array - run ONCE

  return (
    <AuthContext.Provider value={{ user, loading }}>
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