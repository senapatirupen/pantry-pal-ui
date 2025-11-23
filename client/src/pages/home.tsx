import { useState } from "react";
import { InventoryItem, ItemStatus, Category, Frequency, initialItems, monthlyStats } from "@/lib/mock-data";
import { InventoryCard } from "@/components/inventory-card";
import { AddItemDialog } from "@/components/add-item-dialog";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag, BarChart3, Calendar as CalendarIcon, X, SlidersHorizontal, Filter } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, isAfter, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [view, setView] = useState<'inventory' | 'stats'>('inventory');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<Frequency | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  const handleStatusUpdate = (id: string, newStatus: ItemStatus) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: newStatus, lastUpdated: new Date().toISOString() }
        : item
    ));
  };

  const handleAddItem = (newItemData: Omit<InventoryItem, 'id' | 'lastUpdated' | 'status'>) => {
    const newItem: InventoryItem = {
      ...newItemData,
      id: Math.random().toString(36).substr(2, 9),
      status: 'in-stock',
      lastUpdated: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter('all');
    setCategoryFilter('all');
    setFrequencyFilter('all');
    setDateFilter(undefined);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesFrequency = frequencyFilter === 'all' || item.frequency === frequencyFilter;
    
    let matchesDate = true;
    if (dateFilter && item.needBy) {
       // Simple logic: Show items needed on or after the selected date
       // Or maybe "Need by this specific date"?
       // Let's treat the date filter as a "Need by or before" filter for now, or exact match if simpler.
       // User asked for "date range", let's assume picking a date means "Items needed by this date"
       matchesDate = isBefore(startOfDay(new Date(item.needBy)), startOfDay(dateFilter)) || isSameDay(new Date(item.needBy), dateFilter);
    } else if (dateFilter && !item.needBy) {
      matchesDate = false; // Hide items without dates if filtering by date
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesFrequency && matchesDate;
  });

  // Quick stats
  const lowStockCount = items.filter(i => i.status === 'low' || i.status === 'out-of-stock').length;
  const currentMonthTotal = monthlyStats[monthlyStats.length - 1].total;

  const activeFilterCount = [
    statusFilter !== 'all',
    categoryFilter !== 'all',
    frequencyFilter !== 'all',
    dateFilter !== undefined
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-white border-b border-border/40 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <ShoppingBag className="w-6 h-6 text-primary" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-serif text-xl font-bold text-foreground leading-tight">PantryPal</h1>
              <p className="text-xs text-muted-foreground">Household Inventory</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
             <div className="bg-secondary/50 rounded-lg p-1 flex gap-1 mr-2">
                <Button 
                  variant={view === 'inventory' ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => setView('inventory')}
                  className="h-8 text-xs"
                >
                  Inventory
                </Button>
                <Button 
                  variant={view === 'stats' ? "default" : "ghost"} 
                  size="sm" 
                  onClick={() => setView('stats')}
                  className="h-8 text-xs"
                >
                  Insights
                </Button>
             </div>
             <AddItemDialog onAddItem={handleAddItem} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        
        {view === 'inventory' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Filters Section */}
            <div className="bg-white rounded-xl border shadow-sm p-4 space-y-4">
               <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search items..." 
                      className="pl-9 bg-muted/30 border-transparent focus:bg-white transition-colors"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {activeFilterCount > 0 && (
                     <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-destructive sm:hidden self-end">
                       Clear Filters <X className="w-3 h-3 ml-1" />
                     </Button>
                  )}
               </div>

               <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex items-center text-sm text-muted-foreground mr-2">
                    <Filter className="w-4 h-4 mr-1.5" />
                    Filters:
                  </div>
                  
                  <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as ItemStatus | 'all')}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="in-stock">In Stock</SelectItem>
                      <SelectItem value="low">Running Low</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val as Category | 'all')}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="groceries">Groceries</SelectItem>
                      <SelectItem value="household">Household</SelectItem>
                      <SelectItem value="medicine">Medicine</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={frequencyFilter} onValueChange={(val) => setFrequencyFilter(val as Frequency | 'all')}>
                    <SelectTrigger className="w-[130px] h-9 text-xs">
                      <SelectValue placeholder="Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Frequencies</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="occasional">Occasional</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[140px] h-9 text-xs justify-start text-left font-normal",
                          !dateFilter && "text-muted-foreground border-dashed"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {dateFilter ? format(dateFilter, "MMM d") : <span>Need by...</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFilter}
                        onSelect={setDateFilter}
                        initialFocus
                      />
                      {dateFilter && (
                        <div className="p-2 border-t">
                          <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => setDateFilter(undefined)}>
                            Clear Date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>

                  {activeFilterCount > 0 && (
                     <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-destructive hidden sm:flex h-9">
                       <X className="w-4 h-4" />
                     </Button>
                  )}
               </div>
            </div>
            
            {/* Results Count */}
            <div className="flex items-center justify-between px-1">
               <p className="text-sm text-muted-foreground">
                 Showing <span className="font-medium text-foreground">{filteredItems.length}</span> items
               </p>
               {lowStockCount > 0 && (
                 <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
                    ⚠️ {lowStockCount} items need attention
                 </Badge>
               )}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <InventoryCard key={item.id} item={item} onUpdateStatus={handleStatusUpdate} />
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-16 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No items found</h3>
                  <p className="text-sm max-w-xs mx-auto mb-4">Try adjusting your filters or search query to find what you're looking for.</p>
                  <Button variant="outline" onClick={clearFilters}>Clear all filters</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'stats' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Monthly Spending</CardTitle>
                <CardDescription>Your grocery and household spending over the last 6 months.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyStats} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))" 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted)/0.4)' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                          color: 'hsl(var(--popover-foreground))'
                        }}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                        {monthlyStats.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === monthlyStats.length - 1 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.6)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${currentMonthTotal}</div>
                  <p className="text-xs text-muted-foreground">+12% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Items Tracked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{items.length}</div>
                  <p className="text-xs text-muted-foreground">Total inventory items</p>
                </CardContent>
              </Card>
               <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{lowStockCount}</div>
                  <p className="text-xs text-muted-foreground">Items need attention</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
