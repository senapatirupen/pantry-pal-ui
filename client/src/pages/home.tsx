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
import { Plus, LogOut, Search, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddItemDialog } from "@/components/add-item-dialog";
import { InventoryCard } from "@/components/inventory-card";

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
      setEditingItem(null);
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
              <Button 
                onClick={() => {
                  setEditingItem(null);
                  setIsDialogOpen(true);
                }} 
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {user?.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            <TabsTrigger value="grid">Inventory</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
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
                  <Button 
                    onClick={() => {
                      setEditingItem(null);
                      setIsDialogOpen(true);
                    }} 
                    variant="link" 
                    className="mt-4"
                  >
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
