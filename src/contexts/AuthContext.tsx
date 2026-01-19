import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { SystemUser } from "@/types";
import { userStorage } from "@/lib/storage";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: SystemUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Security check: if stored user exists but email doesn't match session, clear it immediately
          const stored = userStorage.get();
          if (stored && stored.email !== session.user.email) {
            userStorage.clear();
          }

          const { data: systemUser, error } = await supabase
            .from("system_users")
            .select("*")
            .eq("email", session.user.email)
            .single();

          if (systemUser && !error) {
            const userData: SystemUser = {
              id: systemUser.id,
              name: systemUser.name,
              email: systemUser.email,
              role: systemUser.role as "admin" | "broker" | "financial",
              active: systemUser.active,
              created_at: systemUser.created_at,
              updated_at: systemUser.updated_at,
            };
            
            setUser(userData);
            userStorage.save(userData);
          } else {
            userStorage.clear();
            setUser(null);
          }
        } else {
          const cachedUser = userStorage.get();
          if (cachedUser) {
            setUser(cachedUser);
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
        userStorage.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: systemUser, error } = await supabase
          .from("system_users")
          .select("*")
          .eq("email", session.user.email)
          .single();

        if (systemUser && !error) {
          const userData: SystemUser = {
            id: systemUser.id,
            name: systemUser.name,
            email: systemUser.email,
            role: systemUser.role as "admin" | "broker" | "financial",
            active: systemUser.active,
            created_at: systemUser.created_at,
            updated_at: systemUser.updated_at,
          };
          
          setUser(userData);
          userStorage.save(userData);
        }
      } else {
        setUser(null);
        userStorage.clear();
        if (router.pathname !== "/login") {
          router.push("/login");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}