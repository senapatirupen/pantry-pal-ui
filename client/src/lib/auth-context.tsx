import { createContext, useContext, useState, ReactNode } from "react";
import { useToast } from "@/hooks/use-toast";

type User = {
  username: string;
  email: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, password?: string) => void;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage if available to persist mock session across reloads
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("mock_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const login = (email: string, password?: string) => {
    setIsLoading(true);
    // Simulate API delay
    setTimeout(() => {
      // Default credentials for local development
      if (email === "admin@local.com" && password !== "admin123") {
        setIsLoading(false);
        toast({
          title: "Login Failed",
          description: "Invalid password for default admin account.",
          variant: "destructive",
        });
        return;
      }

      const mockUser = { username: email.split('@')[0], email };
      setUser(mockUser);
      localStorage.setItem("mock_user", JSON.stringify(mockUser));
      setIsLoading(false);
      toast({
        title: "Welcome back!",
        description: `Successfully logged in as ${mockUser.username}`,
      });
    }, 1000);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mock_user");
    toast({
      title: "Logged out",
      description: "See you next time!",
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
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
