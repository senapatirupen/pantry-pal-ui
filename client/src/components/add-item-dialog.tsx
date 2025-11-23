import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Category, Frequency, InventoryItem } from "@/lib/mock-data";
import { Plus, Calendar as CalendarIcon, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface AddItemDialogProps {
  onAddItem?: (item: Omit<InventoryItem, 'id' | 'lastUpdated' | 'status'>) => void;
  onEditItem?: (id: string, item: Partial<InventoryItem>) => void;
  existingItem?: InventoryItem;
  trigger?: React.ReactNode;
}

export function AddItemDialog({ onAddItem, onEditItem, existingItem, trigger }: AddItemDialogProps) {
  const isEditMode = !!existingItem;
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("groceries");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState<Date>();
  const [open, setOpen] = useState(false);
  
  const { toast } = useToast();

  // Populate form when editing
  useEffect(() => {
    if (existingItem && open) {
      setName(existingItem.name);
      setCategory(existingItem.category);
      setFrequency(existingItem.frequency);
      setPrice(existingItem.price ? existingItem.price.toString() : "");
      setNote(existingItem.note || "");
      setDate(existingItem.needBy ? new Date(existingItem.needBy) : undefined);
    } else if (!open && !existingItem) {
      // Reset when closing add dialog
      resetForm();
    }
  }, [existingItem, open]);

  const resetForm = () => {
    setName("");
    setCategory("groceries");
    setFrequency("weekly");
    setPrice("");
    setNote("");
    setDate(undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const itemData = {
      name,
      category,
      frequency,
      price: price ? parseFloat(price) : undefined,
      note: note || undefined,
      needBy: date ? date.toISOString() : undefined
    };

    if (isEditMode && onEditItem && existingItem) {
      onEditItem(existingItem.id, itemData);
      toast({
        title: "Item Updated",
        description: `${name} has been updated.`,
      });
    } else if (onAddItem) {
      onAddItem(itemData);
      toast({
        title: "Item Added",
        description: `${name} has been added to your inventory.`,
      });
      resetForm();
    }
    
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 shadow-md hover:shadow-lg transition-all">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-primary">
            {isEditMode ? "Edit Item" : "Add New Item"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode ? "Update the details for this item." : "Add a new item to track in your household inventory."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Olive Oil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={!isEditMode}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(val) => setCategory(val as Category)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="groceries">Groceries</SelectItem>
                  <SelectItem value="household">Household</SelectItem>
                  <SelectItem value="medicine">Medicine</SelectItem>
                  <SelectItem value="personal">Personal Care</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(val) => setFrequency(val as Frequency)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="occasional">Occasional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price">Price (Est.)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-7"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label>Need By Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                  {date && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => setDate(undefined)}>
                        Clear Date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              placeholder="e.g., Brand preference, size, etc."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none h-20"
            />
          </div>

          <DialogFooter>
            <Button type="submit">{isEditMode ? "Save Changes" : "Add Item"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
