import { createContext } from "react";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "GUEST" | "ADMIN";
  createdAt: string;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
