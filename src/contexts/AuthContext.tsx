import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { SystemUser } from "@/types";
import { userStorage } from "@/lib/storage";
import { useRouter } from "next/router";

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
    // Check local storage for user
    const storedUser = userStorage.get();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
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