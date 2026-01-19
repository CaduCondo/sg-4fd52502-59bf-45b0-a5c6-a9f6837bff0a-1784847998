import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { SystemUser } from "@/types";
import { userStorage } from "@/lib/storage";
import { useRouter } from "next/router";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: SystemUser | null;
  loading: boolean;
  login: (user: SystemUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check local storage for user AND validate with Supabase
    const initAuth = async () => {
      const storedUser = userStorage.get();
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // If we have a session, ensure the stored user matches or fetch fresh profile
        if (!storedUser || storedUser.email !== session.user.email) {
           // Fetch system user profile
           const { data: profile } = await supabase
             .from('system_users')
             .select('*')
             .eq('email', session.user.email)
             .single();
             
           if (profile) {
             const userObj = { ...profile, active: profile.active ?? true } as SystemUser;
             userStorage.save(userObj);
             setUser(userObj);
           } else {
             // Fallback if no profile found (shouldn't happen for valid users)
             if (storedUser) setUser(storedUser);
           }
        } else {
          setUser(storedUser);
        }
      } else {
        // No session? Clear storage
        userStorage.clear();
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        userStorage.clear();
        setUser(null);
        router.push("/login");
      } else if (event === 'SIGNED_IN' && session?.user) {
         const { data: profile } = await supabase
             .from('system_users')
             .select('*')
             .eq('email', session.user.email)
             .single();
         if (profile) {
             const userObj = { ...profile, active: profile.active ?? true } as SystemUser;
             userStorage.save(userObj);
             setUser(userObj);
             router.push("/dashboard");
         }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = (userData: SystemUser) => {
    userStorage.save(userData);
    setUser(userData);
    router.push("/dashboard");
  };

  const logout = () => {
    userStorage.clear();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);