import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiService } from "./api";

type User = {
  id: string;
  username: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("pantrypal_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!user);
  const { toast } = useToast();

  // Verify token on app load
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem("pantrypal_auth_token");
      if (token) {
        try {
          const { user: verifiedUser } = await apiService.verifyToken();
          setUser(verifiedUser);
          setIsAuthenticated(true);
          localStorage.setItem("pantrypal_user", JSON.stringify(verifiedUser));
        } catch (error) {
          apiService.clearAuth();
          setUser(null);
          setIsAuthenticated(false);
        }
      }
    };

    verifyAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiService.login(email, password);
      setUser(response.user);
      setIsAuthenticated(true);
      toast({
        title: "Welcome back!",
        description: `Successfully logged in as ${response.user.username}`,
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, username: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiService.register(email, username, password);
      setUser(response.user);
      setIsAuthenticated(true);
      toast({
        title: "Account Created!",
        description: `Welcome ${response.user.username}!`,
      });
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: error instanceof Error ? error.message : "Could not create account",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await apiService.logout();
      setUser(null);
      setIsAuthenticated(false);
      toast({
        title: "Logged out",
        description: "See you next time!",
      });
    } catch (error) {
      apiService.clearAuth();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
