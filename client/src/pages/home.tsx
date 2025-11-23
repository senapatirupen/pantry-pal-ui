import { useState } from "react";
import { InventoryItem, ItemStatus, Category, initialItems } from "@/lib/mock-data";
import { InventoryCard } from "@/components/inventory-card";
import { AddItemDialog } from "@/components/add-item-dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, ShoppingBag, Home as HomeIcon, Filter } from "lucide-react";

export default function Home() {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const handleStatusUpdate = (id: string, newStatus: ItemStatus) => {
    setItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: newStatus, lastUpdated: new Date().toISOString() }
        : item
    ));
  };

  const handleAddItem = (name: string, category: Category) => {
    const newItem: InventoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      category,
      status: 'in-stock',
      lastUpdated: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'low' ? (item.status === 'low' || item.status === 'out-of-stock') :
      activeTab === 'stocked' ? item.status === 'in-stock' : true;
    
    return matchesSearch && matchesTab;
  });

  // Quick stats
  const lowStockCount = items.filter(i => i.status === 'low' || i.status === 'out-of-stock').length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-white border-b border-border/40 sticky top-0 z-10 backdrop-blur-md bg-white/80">
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <ShoppingBag className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold text-foreground leading-tight">PantryPal</h1>
              <p className="text-xs text-muted-foreground">Household Inventory</p>
            </div>
          </div>
          <AddItemDialog onAddItem={handleAddItem} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome / Stats */}
        <div className="bg-secondary/50 rounded-2xl p-6 border border-secondary">
          <h2 className="font-serif text-2xl font-bold text-secondary-foreground mb-2">
            Hello! 👋
          </h2>
          <p className="text-muted-foreground mb-4">
            You have <span className="font-bold text-foreground">{items.length}</span> items in your inventory.
            {lowStockCount > 0 ? (
              <span className="block mt-1 text-yellow-700 font-medium">
                ⚠️ {lowStockCount} items need restocking.
              </span>
            ) : (
              <span className="block mt-1 text-primary font-medium">
                Everything is well stocked!
              </span>
            )}
          </p>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search items..." 
              className="pl-9 bg-white border-transparent shadow-sm focus-visible:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs & List */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">All Items</TabsTrigger>
            <TabsTrigger value="low" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">To Buy</TabsTrigger>
            <TabsTrigger value="stocked" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Stocked</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredItems.map(item => (
                <InventoryCard key={item.id} item={item} onUpdateStatus={handleStatusUpdate} />
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  <p>No items found.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="low" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredItems.map(item => (
                <InventoryCard key={item.id} item={item} onUpdateStatus={handleStatusUpdate} />
              ))}
               {filteredItems.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground bg-white/50 rounded-xl border border-dashed border-border">
                  <p className="mb-2">🎉 Nothing to buy!</p>
                  <p className="text-sm">Everything is stocked up.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="stocked" className="mt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredItems.map(item => (
                <InventoryCard key={item.id} item={item} onUpdateStatus={handleStatusUpdate} />
              ))}
              {filteredItems.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  <p>No stocked items found.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
