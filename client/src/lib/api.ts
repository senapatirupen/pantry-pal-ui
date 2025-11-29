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
      credentials: "include",
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
   * Get summary statistics
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

// For backward compatibility
export const apiClient = apiService;
