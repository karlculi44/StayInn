import { useEffect, useState, type ReactNode } from "react";
import { getMe, logout as logoutUser } from "../services/auth.services";
import { AuthContext, type User } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getMe();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const login = (user: User) => {
    setUser(user);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, login, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
