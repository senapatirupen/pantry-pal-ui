// API Base URL configuration
export const API_CONFIG = {
  // Change this to match your Spring Boot backend URL
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:9091/api/v1",
  
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
