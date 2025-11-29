# REST API Implementation Guide - Spring Boot Integration

This guide provides step-by-step instructions to integrate the PantryPal frontend with a Spring Boot REST API backend. It includes exact file locations, code changes, and API endpoint specifications.

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [API Architecture](#api-architecture)
3. [File Modifications Required](#file-modifications-required)
4. [Detailed Code Changes](#detailed-code-changes)
5. [API Endpoints Specification](#api-endpoints-specification)
6. [Environment Configuration](#environment-configuration)
7. [Error Handling](#error-handling)
8. [CORS Configuration](#cors-configuration)
9. [Testing the Integration](#testing-the-integration)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This integration transforms the PantryPal frontend from a mock-data application to a fully functional client-server architecture. The frontend will communicate with a Spring Boot backend via HTTP REST APIs.

**Current Flow (Mock):**
```
React Component → localStorage → UI Update
```

**New Flow (With Spring Boot):**
```
React Component → API Service → Spring Boot Backend → Database → API Response → UI Update
```

---

## 🏗️ API Architecture

### Request Flow
```
User Action
    ↓
React Component (e.g., home.tsx)
    ↓
API Service (api.ts)
    ↓
HTTP Request to Spring Boot
    ↓
Spring Boot Controller
    ↓
Service Layer
    ↓
Repository/Database
    ↓
Response JSON
    ↓
API Service (Handle Response)
    ↓
Update React State
    ↓
Re-render Component
```

### API Base Structure
```
Spring Boot Backend (localhost:8080)
├── /api/v1/auth/
│   ├── login
│   ├── register
│   ├── logout
│   └── forgot-password
├── /api/v1/items/
│   ├── GET (all items)
│   ├── POST (create item)
│   ├── GET /{id}
│   ├── PUT /{id}
│   └── DELETE /{id}
├── /api/v1/items/{id}/status
│   └── PATCH (update status)
└── /api/v1/stats/
    ├── monthly-spending
    └── summary
```

---

## 📁 File Modifications Required

### Files to Create
- ✅ `client/src/lib/api.ts` - API service client
- ✅ `client/src/lib/api-config.ts` - API configuration
- ✅ `.env.local` - Environment variables

### Files to Modify
- ✅ `client/src/lib/auth-context.tsx` - Update authentication logic
- ✅ `client/src/pages/home.tsx` - Update inventory operations
- ✅ `client/src/pages/auth.tsx` - Update form submissions
- ✅ `client/src/pages/forgot-password.tsx` - Update password reset
- ✅ `client/src/components/add-item-dialog.tsx` - Update item creation
- ✅ `package.json` - Add axios or fetch configuration (optional)

---

## 💻 Detailed Code Changes

### 1. Create API Configuration File

**File:** `client/src/lib/api-config.ts` (NEW FILE)

```typescript
// API Base URL configuration
export const API_CONFIG = {
  // Change this to match your Spring Boot backend URL
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1",
  
  // Timeouts (in milliseconds)
  TIMEOUT: 30000,
  
  // Retry configuration
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  
  // Storage keys
  TOKEN_KEY: "pantrypal_auth_token",
  REFRESH_TOKEN_KEY: "pantrypal_refresh_token",
  USER_KEY: "pantrypal_user",
};

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface InventoryItem {
  id: string;
  name: string;
  category: "groceries" | "household" | "medicine" | "personal_care" | "other";
  status: "in_stock" | "low" | "out_of_stock";
  frequency: "daily" | "weekly" | "monthly" | "occasional";
  price?: number;
  note?: string;
  needBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatsData {
  totalItems: number;
  lowStockItems: number;
  monthlySpending: {
    month: string;
    amount: number;
  }[];
  categoryBreakdown: {
    category: string;
    count: number;
  }[];
}
```

---

### 2. Create API Service Layer

**File:** `client/src/lib/api.ts` (NEW FILE)

```typescript
import { API_CONFIG, ApiResponse, AuthResponse, InventoryItem, StatsData } from "./api-config";

class ApiService {
  private baseUrl = API_CONFIG.BASE_URL;
  private tokenKey = API_CONFIG.TOKEN_KEY;

  /**
   * Generic fetch wrapper with error handling and token management
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const config: RequestInit = {
      ...options,
      headers,
      credentials: "include", // For cookies if using session-based auth
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 Unauthorized
      if (response.status === 401) {
        this.clearAuth();
        window.location.href = "/auth";
        throw new Error("Unauthorized. Please login again.");
      }

      // Handle 403 Forbidden
      if (response.status === 403) {
        throw new Error("You don't have permission to access this resource.");
      }

      // Handle server errors
      if (response.status >= 500) {
        throw new Error("Server error. Please try again later.");
      }

      // Parse response
      const data: ApiResponse<T> = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "An error occurred");
      }

      return data.data as T;
    } catch (error) {
      console.error(`API Error at ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Token Management
   */
  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(API_CONFIG.USER_KEY);
  }

  // =====================
  // AUTHENTICATION ENDPOINTS
  // =====================

  /**
   * POST /api/v1/auth/login
   * Login with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Store token and user
    if (response.token) {
      this.setToken(response.token);
      localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(response.user));
    }

    return response;
  }

  /**
   * POST /api/v1/auth/register
   * Create a new user account
   */
  async register(
    email: string,
    username: string,
    password: string
  ): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, username, password }),
    });

    // Store token and user
    if (response.token) {
      this.setToken(response.token);
      localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(response.user));
    }

    return response;
  }

  /**
   * POST /api/v1/auth/logout
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } finally {
      this.clearAuth();
    }
  }

  /**
   * POST /api/v1/auth/forgot-password
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  /**
   * POST /api/v1/auth/reset-password
   * Reset password with token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return this.request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  /**
   * GET /api/v1/auth/verify
   * Verify current auth token
   */
  async verifyToken(): Promise<{ user: any }> {
    return this.request<{ user: any }>("/auth/verify", {
      method: "GET",
    });
  }

  // =====================
  // INVENTORY ENDPOINTS
  // =====================

  /**
   * GET /api/v1/items
   * Fetch all inventory items for current user
   * Query params: ?status=in_stock&category=groceries
   */
  async getItems(filters?: {
    status?: string;
    category?: string;
    frequency?: string;
  }): Promise<InventoryItem[]> {
    const queryString = filters
      ? "?" + new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as any).toString()
      : "";
    return this.request<InventoryItem[]>(`/items${queryString}`, {
      method: "GET",
    });
  }

  /**
   * GET /api/v1/items/:id
   * Fetch single item by ID
   */
  async getItem(id: string): Promise<InventoryItem> {
    return this.request<InventoryItem>(`/items/${id}`, {
      method: "GET",
    });
  }

  /**
   * POST /api/v1/items
   * Create new inventory item
   */
  async createItem(item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">): Promise<InventoryItem> {
    return this.request<InventoryItem>("/items", {
      method: "POST",
      body: JSON.stringify(item),
    });
  }

  /**
   * PUT /api/v1/items/:id
   * Update entire inventory item
   */
  async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    return this.request<InventoryItem>(`/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * PATCH /api/v1/items/:id
   * Partial update to inventory item
   */
  async patchItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
    return this.request<InventoryItem>(`/items/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  /**
   * PATCH /api/v1/items/:id/status
   * Update only the status of an item
   */
  async updateItemStatus(
    id: string,
    status: "in_stock" | "low" | "out_of_stock"
  ): Promise<InventoryItem> {
    return this.request<InventoryItem>(`/items/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  /**
   * DELETE /api/v1/items/:id
   * Delete an inventory item
   */
  async deleteItem(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/items/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * GET /api/v1/items/search
   * Search items by name
   */
  async searchItems(query: string): Promise<InventoryItem[]> {
    return this.request<InventoryItem[]>(`/items/search?q=${encodeURIComponent(query)}`, {
      method: "GET",
    });
  }

  /**
   * POST /api/v1/items/bulk
   * Create multiple items at once
   */
  async bulkCreateItems(items: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">[]): Promise<InventoryItem[]> {
    return this.request<InventoryItem[]>("/items/bulk", {
      method: "POST",
      body: JSON.stringify({ items }),
    });
  }

  /**
   * DELETE /api/v1/items/bulk
   * Delete multiple items
   */
  async bulkDeleteItems(ids: string[]): Promise<{ deletedCount: number }> {
    return this.request<{ deletedCount: number }>("/items/bulk", {
      method: "DELETE",
      body: JSON.stringify({ ids }),
    });
  }

  // =====================
  // STATISTICS ENDPOINTS
  // =====================

  /**
   * GET /api/v1/stats/summary
   * Get summary statistics (total items, low stock, etc.)
   */
  async getStatsSummary(): Promise<{
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    averagePrice: number;
  }> {
    return this.request("/stats/summary", {
      method: "GET",
    });
  }

  /**
   * GET /api/v1/stats/monthly-spending
   * Get monthly spending data for charts
   */
  async getMonthlySpending(months: number = 12): Promise<StatsData["monthlySpending"]> {
    return this.request(`/stats/monthly-spending?months=${months}`, {
      method: "GET",
    });
  }

  /**
   * GET /api/v1/stats/category-breakdown
   * Get spending by category
   */
  async getCategoryBreakdown(): Promise<StatsData["categoryBreakdown"]> {
    return this.request("/stats/category-breakdown", {
      method: "GET",
    });
  }

  /**
   * GET /api/v1/stats/frequency-report
   * Get items grouped by frequency
   */
  async getFrequencyReport(): Promise<{
    frequency: string;
    count: number;
    totalSpending: number;
  }[]> {
    return this.request("/stats/frequency-report", {
      method: "GET",
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();

// For backward compatibility with old code
export const apiClient = apiService;
```

---

### 3. Update Environment Configuration

**File:** `.env.local` (CREATE NEW FILE in project root)

```
# API Configuration
VITE_API_URL=http://localhost:8080/api/v1

# Application
VITE_APP_NAME=PantryPal
VITE_APP_VERSION=1.0.0
```

---

### 4. Update Auth Context

**File:** `client/src/lib/auth-context.tsx` - REPLACE ENTIRE FILE

```typescript
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
    // Initialize from localStorage
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
          // Token invalid, clear auth
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
      // Even if API call fails, clear local auth
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
```

---

### 5. Update Auth Page

**File:** `client/src/pages/auth.tsx` - REPLACE ENTIRE FILE

```typescript
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingBag, ArrowRight, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { login, register, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("login");
  
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      await login(email, password);
      setLocation("/");
    } catch (err) {
      // Error is already shown in toast
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password || !username) {
      setError("Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      await register(email, username, password);
      setLocation("/");
    } catch (err) {
      // Error is already shown in toast
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="bg-primary/10 p-3 rounded-full w-fit mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">PantryPal</h1>
          <p className="text-muted-foreground">Manage your household inventory with ease.</p>
        </div>

        <Card className="border-muted shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-serif text-center">
              {activeTab === "login" ? "Welcome Back" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-center">
              {activeTab === "login" 
                ? "Enter your credentials to access your pantry" 
                : "Sign up to start tracking your daily items"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input 
                      id="login-email" 
                      type="email" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <Button 
                        variant="link" 
                        className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
                        onClick={() => setLocation("/forgot-password")}
                        type="button"
                      >
                        Forgot password?
                      </Button>
                    </div>
                    <Input 
                      id="login-password" 
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required 
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        Sign In <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input 
                      id="register-username" 
                      placeholder="johndoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isLoading}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input 
                      id="register-email" 
                      type="email" 
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input 
                      id="register-password" 
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required 
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center border-t bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground text-center max-w-xs">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
```

---

### 6. Update Home Page (Main Inventory)

**File:** `client/src/pages/home.tsx` - KEY SECTIONS TO REPLACE

This is the most important file. Replace the entire file:

```typescript
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus, LogOut, Search, Trash2, Edit2, Eye, BarChart3, AlertCircle } from "lucide-react";
import AddItemDialog from "@/components/add-item-dialog";
import InventoryCard from "@/components/inventory-card";

interface InventoryItem {
  id: string;
  name: string;
  category: "groceries" | "household" | "medicine" | "personal_care" | "other";
  status: "in_stock" | "low" | "out_of_stock";
  frequency: "daily" | "weekly" | "monthly" | "occasional";
  price?: number;
  note?: string;
  needBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface MonthlyData {
  month: string;
  amount: number;
}

export default function Home() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    averagePrice: 0,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "insights">("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/auth");
    }
  }, [isAuthenticated, setLocation]);

  // Fetch items on mount
  useEffect(() => {
    loadItems();
    loadStats();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [items, searchQuery, statusFilter, categoryFilter, frequencyFilter]);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (categoryFilter !== "all") filters.category = categoryFilter;
      if (frequencyFilter !== "all") filters.frequency = frequencyFilter;

      const data = await apiService.getItems(filters);
      setItems(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load inventory items",
        variant: "destructive",
      });
      console.error("Load items error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [summary, spending] = await Promise.all([
        apiService.getStatsSummary(),
        apiService.getMonthlySpending(12),
      ]);

      setStats(summary);
      setMonthlyData(spending);
    } catch (error) {
      console.error("Load stats error:", error);
    }
  };

  const applyFilters = () => {
    let filtered = [...items];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((item) => item.category === categoryFilter);
    }

    // Frequency filter
    if (frequencyFilter !== "all") {
      filtered = filtered.filter((item) => item.frequency === frequencyFilter);
    }

    setFilteredItems(filtered);
  };

  const handleAddItem = async (newItem: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => {
    try {
      const created = await apiService.createItem(newItem);
      setItems((prev) => [created, ...prev]);
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Item added to inventory",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    }
  };

  const handleEditItem = async (updates: Partial<InventoryItem>) => {
    if (!editingItem) return;

    try {
      const updated = await apiService.updateItem(editingItem.id, updates);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingItem(null);
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Item updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await apiService.deleteItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast({
        title: "Success",
        description: "Item deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (id: string, status: "in_stock" | "low" | "out_of_stock") => {
    try {
      const updated = await apiService.updateItemStatus(id, status);
      setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast({
        title: "Success",
        description: `Item status updated to ${status}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/auth");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setCategoryFilter("all");
    setFrequencyFilter("all");
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-2xl font-bold text-foreground">PantryPal</h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => setIsDialogOpen(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Item Dialog */}
        <AddItemDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onSubmit={editingItem ? handleEditItem : handleAddItem}
          initialData={editingItem || undefined}
          isEditing={!!editingItem}
        />

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="grid">
              <Eye className="w-4 h-4 mr-2" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="insights">
              <BarChart3 className="w-4 h-4 mr-2" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filter Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <Input
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                        <SelectItem value="low">Running Low</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="groceries">Groceries</SelectItem>
                        <SelectItem value="household">Household</SelectItem>
                        <SelectItem value="medicine">Medicine</SelectItem>
                        <SelectItem value="personal_care">Personal Care</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Frequency</label>
                    <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Frequencies</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="occasional">Occasional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button variant="outline" className="w-full sm:w-auto" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>

            {/* Inventory Grid */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading items...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No items found</p>
                  <Button onClick={() => setIsDialogOpen(true)} variant="link" className="mt-4">
                    Add your first item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    onStatusChange={(status) => handleStatusUpdate(item.id, status)}
                    onEdit={() => {
                      setEditingItem(item);
                      setIsDialogOpen(true);
                    }}
                    onDelete={() => handleDeleteItem(item.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalItems}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{stats.lowStockItems}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{stats.outOfStockItems}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">${stats.averagePrice.toFixed(2)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Monthly Spending Chart */}
            {monthlyData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Spending</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="amount" fill="#8b9467" name="Spending ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
```

---

### 7. Update Add Item Dialog

**File:** `client/src/components/add-item-dialog.tsx` - KEY CHANGES

Update the form submission to use the new handler:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validation
  if (!name.trim()) {
    toast({
      title: "Validation Error",
      description: "Item name is required",
      variant: "destructive",
    });
    return;
  }

  const itemData = {
    name: name.trim(),
    category: category as any,
    status: "in_stock" as const,
    frequency: frequency as any,
    price: price ? parseFloat(price) : undefined,
    note: note || undefined,
    needBy: needBy || undefined,
  };

  try {
    await onSubmit(itemData);
    // Reset form
    setName("");
    setCategory("");
    setFrequency("");
    setPrice("");
    setNote("");
    setNeedBy("");
  } catch (error) {
    // Error already handled by parent
    console.error("Submit error:", error);
  }
};
```

---

### 8. Update Forgot Password Page

**File:** `client/src/pages/forgot-password.tsx` - REPLACE ENTIRE FILE

```typescript
import { useState } from "react";
import { useLocation } from "wouter";
import { apiService } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, Check } from "lucide-react";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "token" | "success">("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email) {
      setError("Please enter your email");
      return;
    }

    setIsLoading(true);
    try {
      await apiService.forgotPassword(email);
      setStep("token");
      toast({
        title: "Email sent",
        description: "Check your email for password reset instructions",
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to send reset email");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token || !newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      await apiService.resetPassword(token, newPassword);
      setStep("success");
      toast({
        title: "Password reset successful",
        description: "You can now login with your new password",
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {step !== "success" && (
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => setLocation("/auth")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        )}

        <Card className="border-muted shadow-lg">
          {step === "email" && (
            <>
              <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                  Enter your email to receive password reset instructions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRequestReset} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === "token" && (
            <>
              <CardHeader>
                <CardTitle>Create New Password</CardTitle>
                <CardDescription>
                  Enter the reset token from your email and create a new password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="token">Reset Token</Label>
                    <Input
                      id="token"
                      placeholder="Enter token from email"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">Confirm Password</Label>
                    <Input
                      id="confirm"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === "success" && (
            <>
              <CardHeader>
                <CardTitle>Password Reset Successful</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="bg-green-50 p-4 rounded-full w-fit mx-auto">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-muted-foreground">
                  Your password has been successfully reset. You can now login with your new password.
                </p>
                <Button onClick={() => setLocation("/auth")} className="w-full">
                  Go to Login
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
```

---

## 🔌 API Endpoints Specification

### Authentication Endpoints

#### POST /api/v1/auth/login
Login with email and password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "optional_refresh_token",
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "username"
    }
  }
}
```

#### POST /api/v1/auth/register
Create new user account

**Request:**
```json
{
  "email": "newuser@example.com",
  "username": "newuser",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_456",
      "email": "newuser@example.com",
      "username": "newuser"
    }
  }
}
```

#### POST /api/v1/auth/logout
Logout current user

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /api/v1/auth/forgot-password
Request password reset

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Reset email sent"
}
```

#### POST /api/v1/auth/reset-password
Reset password with token

**Request:**
```json
{
  "token": "reset_token_from_email",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

#### GET /api/v1/auth/verify
Verify current auth token

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "username": "username"
    }
  }
}
```

---

### Inventory Endpoints

#### GET /api/v1/items
Get all items for current user with optional filters

**Query Parameters:**
- `status` - in_stock, low, out_of_stock
- `category` - groceries, household, medicine, personal_care, other
- `frequency` - daily, weekly, monthly, occasional

**Example:** `/api/v1/items?status=low&category=groceries`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "item_1",
      "name": "Milk",
      "category": "groceries",
      "status": "in_stock",
      "frequency": "daily",
      "price": 3.50,
      "note": "Full cream milk",
      "needBy": "2024-12-05T00:00:00Z",
      "createdAt": "2024-11-29T10:00:00Z",
      "updatedAt": "2024-11-29T10:00:00Z"
    }
  ]
}
```

#### GET /api/v1/items/:id
Get single item by ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "item_1",
    "name": "Milk",
    ...
  }
}
```

#### POST /api/v1/items
Create new inventory item

**Request:**
```json
{
  "name": "Milk",
  "category": "groceries",
  "status": "in_stock",
  "frequency": "daily",
  "price": 3.50,
  "note": "Full cream milk",
  "needBy": "2024-12-05T00:00:00Z"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "item_new",
    "name": "Milk",
    "createdAt": "2024-11-29T10:05:00Z",
    ...
  }
}
```

#### PUT /api/v1/items/:id
Update entire inventory item

**Request:**
```json
{
  "name": "Milk (Updated)",
  "category": "groceries",
  "status": "low",
  "frequency": "daily",
  "price": 3.75,
  "note": "Updated note"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "item_1",
    "name": "Milk (Updated)",
    "updatedAt": "2024-11-29T10:10:00Z",
    ...
  }
}
```

#### PATCH /api/v1/items/:id
Partial update to inventory item

**Request:**
```json
{
  "status": "low",
  "price": 3.75
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "item_1",
    ...
  }
}
```

#### PATCH /api/v1/items/:id/status
Update only the status of an item

**Request:**
```json
{
  "status": "out_of_stock"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "item_1",
    "status": "out_of_stock",
    ...
  }
}
```

#### DELETE /api/v1/items/:id
Delete an inventory item

**Response (200):**
```json
{
  "success": true,
  "message": "Item deleted successfully"
}
```

#### GET /api/v1/items/search?q=query
Search items by name

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "item_1",
      "name": "Milk",
      ...
    }
  ]
}
```

#### POST /api/v1/items/bulk
Create multiple items at once

**Request:**
```json
{
  "items": [
    {
      "name": "Milk",
      "category": "groceries",
      ...
    },
    {
      "name": "Bread",
      "category": "groceries",
      ...
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": [
    {...},
    {...}
  ]
}
```

#### DELETE /api/v1/items/bulk
Delete multiple items

**Request:**
```json
{
  "ids": ["item_1", "item_2", "item_3"]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "deletedCount": 3
  }
}
```

---

### Statistics Endpoints

#### GET /api/v1/stats/summary
Get summary statistics

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalItems": 25,
    "lowStockItems": 3,
    "outOfStockItems": 1,
    "averagePrice": 8.50
  }
}
```

#### GET /api/v1/stats/monthly-spending?months=12
Get monthly spending data for charts

**Query Parameters:**
- `months` - Number of months to retrieve (default: 12)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "month": "November 2024",
      "amount": 156.75
    },
    {
      "month": "October 2024",
      "amount": 142.30
    }
  ]
}
```

#### GET /api/v1/stats/category-breakdown
Get spending by category

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "category": "groceries",
      "count": 15,
      "spending": 120.50
    },
    {
      "category": "household",
      "count": 7,
      "spending": 85.25
    }
  ]
}
```

#### GET /api/v1/stats/frequency-report
Get items grouped by frequency

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "frequency": "daily",
      "count": 5,
      "totalSpending": 25.00
    },
    {
      "frequency": "weekly",
      "count": 8,
      "totalSpending": 60.00
    }
  ]
}
```

---

## ⚙️ Environment Configuration

### Create .env.local file

**File:** `.env.local` (in project root)

```bash
# Backend API URL
VITE_API_URL=http://localhost:8080/api/v1

# Application Configuration
VITE_APP_NAME=PantryPal
VITE_APP_VERSION=1.0.0

# Optional: Development settings
VITE_DEBUG_API=false
```

### Update vite configuration

If needed, update Vite config to handle API proxy (optional):

**vite.config.ts** - Already configured, no changes needed for basic setup.

---

## 🔐 Error Handling

The API service includes built-in error handling. Key status codes:

| Status | Handling |
|--------|----------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Invalid token |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource doesn't exist |
| 500 | Server Error - Unexpected error |

**Error Response Format:**
```json
{
  "success": false,
  "message": "Error message",
  "errors": {
    "fieldName": ["Error detail 1", "Error detail 2"]
  }
}
```

---

## 🌐 CORS Configuration

Ensure your Spring Boot backend has CORS enabled:

**Spring Boot Configuration (Example):**
```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins("http://localhost:5000", "http://localhost:3000")
                    .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true)
                    .maxAge(3600);
            }
        };
    }
}
```

---

## 🧪 Testing the Integration

### 1. Start Spring Boot Backend
```bash
mvn spring-boot:run
# Backend running on http://localhost:8080
```

### 2. Update .env.local
```
VITE_API_URL=http://localhost:8080/api/v1
```

### 3. Start Frontend
```bash
npm run dev:client
# Frontend running on http://localhost:5000
```

### 4. Test Login
1. Navigate to http://localhost:5000
2. Try to login with credentials
3. Check browser DevTools Network tab
4. Verify API calls to `/api/v1/auth/login`

### 5. Test Inventory Operations
1. After login, click "Add Item"
2. Fill form and submit
3. Verify POST to `/api/v1/items`
4. Check items appear in list

### 6. Debug API Issues
Use browser DevTools Console:
```javascript
// Check token
localStorage.getItem("pantrypal_auth_token")

// Manual API call
fetch("http://localhost:8080/api/v1/items", {
  headers: {
    "Authorization": `Bearer ${localStorage.getItem("pantrypal_auth_token")}`
  }
}).then(r => r.json()).then(console.log)
```

---

## 🔧 Troubleshooting

### Issue: CORS Error
**Solution:** Ensure Spring Boot CORS configuration is correct

```
Access to XMLHttpRequest at 'http://localhost:8080/api/v1/...' 
from origin 'http://localhost:5000' has been blocked
```

**Fix:** Update Spring Boot CORS config with correct origin

### Issue: 401 Unauthorized
**Solution:** Check token is being sent and is valid

```javascript
// Verify token exists
console.log(localStorage.getItem("pantrypal_auth_token"))

// Check if token is expired
```

### Issue: Network Error
**Solution:** Verify Spring Boot is running and accessible

```bash
# Test backend connectivity
curl http://localhost:8080/api/v1/auth/verify
```

### Issue: Items Not Loading
**Solution:** Check network requests in DevTools

1. Open Network tab
2. Try to load items
3. Click on the GET /items request
4. Check Response tab for error message

### Issue: Form Validation Error
**Solution:** Ensure all required fields are filled

**Required Fields:**
- Item name (required)
- Category (required)
- Status (default: in_stock)
- Frequency (required)

---

## 📚 Additional Resources

- [Spring Boot REST API Docs](https://spring.io/guides/gs/rest-service/)
- [React Context API](https://react.dev/reference/react/useContext)
- [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

---

**Ready to integrate! Follow the file modifications above step-by-step for a seamless Spring Boot integration.**
