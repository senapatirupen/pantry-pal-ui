Nice, this is shaping up really well 👌
I’ll walk through the **full data flow + technical behavior** of this `Home` component step by step.

---

## 1. High-level responsibility of `Home`

This `Home` component is the **main authenticated page** of your Household Inventory app. It:

* Ensures the user is authenticated (via `useAuth` + `wouter` navigation)
* Loads inventory items from the backend (`apiService`)
* Manages **filters & search** on the client
* Handles **CRUD operations** for items (add, edit, delete, status update)
* Shows items as **cards** via `InventoryCard`
* Uses **AddItemDialog** as a reusable add/edit dialog
* Uses **toast** notifications for UX feedback

Think of it as the “container” page orchestrating:

> 🔐 Auth → 🌐 API calls → 🧠 State → 🎛 Filters → 🎨 UI

---

## 2. Imports & external dependencies

```ts
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { apiService } from "@/lib/api";
...
import { AddItemDialog } from "@/components/add-item-dialog";
import { InventoryCard } from "@/components/inventory-card";
```

* **`useAuth`**: gives you `{ user, logout, isAuthenticated }`

  * Internally, this is probably reading from a React context that:

    * Stores JWT / session token
    * Knows whether the user is logged in
* **`useLocation`**: from `wouter`, used for lightweight routing.
* **`apiService`**: your abstraction over `fetch`/`axios`:

  * `getItems(filters)`
  * `createItem(...)`
  * `updateItem(...)`
  * `updateItemStatus(...)`
  * `deleteItem(...)`
* **UI components**: all shadcn-based wrappers (Button, Card, Select, etc.)
* **`AddItemDialog`**:

  * Controlled dialog component that calls `onSubmit` with the form data.
* **`InventoryCard`**:

  * Presentational component for a single item card; raises events back up:

    * `onStatusChange`
    * `onEdit`
    * `onDelete`

---

## 3. Data models

```ts
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
```

* This matches what your backend likely returns.
* You treat this as the canonical shape of each item.

```ts
interface MonthlyData {
  month: string;
  amount: number;
}
```

* Placeholder for future analytics (monthly spending, charts, etc.).
* Not used yet, but `monthlyData` state is wired.

---

## 4. Top-level state & auth wiring

```ts
const { user, logout, isAuthenticated } = useAuth();
const [, setLocation] = useLocation();
const { toast } = useToast();
```

* You pull in:

  * `user` → UI display (header email, username)
  * `logout` → called from the "Logout" menu
  * `isAuthenticated` → used to guard the page
* `setLocation` → used to redirect if not authenticated.

### State variables

```ts
const [items, setItems] = useState<InventoryItem[]>([]);
const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
const [stats, setStats] = useState({...});
```

* `items`: source-of-truth items fetched from backend.
* `filteredItems`: derived view after applying search + filters.
* `monthlyData`: for future insights.
* `stats`: for future KPI cards (totalItems, lowStock, etc.).

Filter & UI state:

```ts
const [searchQuery, setSearchQuery] = useState("");
const [statusFilter, setStatusFilter] = useState<string>("all");
const [categoryFilter, setCategoryFilter] = useState<string>("all");
const [frequencyFilter, setFrequencyFilter] = useState<string>("all");
const [isLoading, setIsLoading] = useState(true);
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
```

* These drive what’s shown and how.
* `editingItem` being `null` means “Add mode”; non-null means “Edit mode”.

---

## 5. Auth guard – redirect if not logged in

```ts
useEffect(() => {
  if (!isAuthenticated) {
    setLocation("/auth");
  }
}, [isAuthenticated, setLocation]);
```

**Flow:**

1. When `Home` mounts, `useAuth` has some `isAuthenticated` state (maybe from context).
2. `useEffect` runs:

   * If `false`, call `setLocation("/auth")`.
3. `wouter` handles route change → user goes to login/registration page.

Also:

```ts
if (!isAuthenticated) {
  return null;
}
```

* Prevents any rendering while redirect is happening.
* Avoids flicker / rendering sensitive data for a moment.

---

## 6. Data fetching – `loadItems`

```ts
useEffect(() => {
  loadItems();
}, []);
```

* Runs **once on mount** (empty dependency array).
* Calls `loadItems`.

```ts
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
```

**Technical flow:**

1. Set `isLoading = true` → UI shows “Loading items…” message.
2. Build a `filters` object based on filter state (currently from client).

   * If all filters are `"all"`, you pass `{}` → backend returns all items.
   * If any are specific, e.g. `statusFilter = "low"`, you pass `{ status: "low" }`.
3. `apiService.getItems(filters)`:

   * Likely does `GET /items` with query params or `POST /items/search`.
   * Returns `InventoryItem[]`.
4. On success: `setItems(data)` → triggers re-render and `applyFilters()`.
5. On error: show toast + log.
6. `finally`: `setIsLoading(false)`.

> 💡 Note: Right now `loadItems` runs only once on mount. Filters are applied on client-side only.
> If you want server-side filtering, you can add `statusFilter, categoryFilter, frequencyFilter` to the `useEffect` dependency array so `loadItems()` re-runs when filters change.

---

## 7. Derived data – `applyFilters`

```ts
useEffect(() => {
  applyFilters();
}, [items, searchQuery, statusFilter, categoryFilter, frequencyFilter]);
```

Whenever:

* New data comes from server (`items` changes), or
* User types search, or
* User changes any filter,

→ `applyFilters` runs and recomputes `filteredItems`.

### Implementation:

```ts
const applyFilters = () => {
  // SAFE ACCESS: Always ensure items is an array
  const safeItems = Array.isArray(items) ? items : [];
  let filtered = [...safeItems];

  // Search filter
  if (searchQuery.trim()) {
    filtered = filtered.filter(item =>
      item?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item?.note && item.note.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }

  // Status filter
  if (statusFilter !== "all") {
    filtered = filtered.filter(item => item?.status === statusFilter);
  }

  // Category filter
  if (categoryFilter !== "all") {
    filtered = filtered.filter(item => item?.category === categoryFilter);
  }

  // Frequency filter
  if (frequencyFilter !== "all") {
    filtered = filtered.filter(item => item?.frequency === frequencyFilter);
  }

  setFilteredItems(filtered);
};
```

**Key points:**

* `safeItems` defensive coding avoids runtime crashes if `items` somehow becomes non-array.
* Search:

  * Checks `name` and `note`.
  * Both are lowercased for case-insensitive match.
* Each filter (`statusFilter`, `categoryFilter`, `frequencyFilter`) narrows the array step-by-step.
* Final result goes into `filteredItems`, which is what UI uses to render cards.

---

## 8. Add item flow – `handleAddItem`

```ts
const handleAddItem = async (
  newItem: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">
) => {
  try {
    const created = await apiService.createItem(newItem);
    setItems((prev) => {
      const safePrev = Array.isArray(prev) ? prev : [];
      return [created, ...safePrev];
    });
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
```

**Technical flow:**

1. **User opens dialog**:

   * Clicks “Add Item” button → `setEditingItem(null); setIsDialogOpen(true);`
   * `AddItemDialog` renders blank form.
2. **User submits form**:

   * `AddItemDialog` calls `onSubmit(formData)` → that calls `handleAddItem`.
3. `handleAddItem` sends `newItem` (without id/timestamps) to backend:

   * `apiService.createItem` → e.g. `POST /items`
   * Backend returns fully-hydrated `InventoryItem` with `id`, `createdAt`, `updatedAt`.
4. You **prepend** the new item to the existing `items`:

   * `setItems(prev => [created, ...safePrev]);`
   * This triggers `useEffect → applyFilters` → UI updates.
5. Close dialog + clear edit state + show success toast.

---

## 9. Edit item flow – `handleEditItem`

```ts
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
```

**Flow:**

1. **User clicks “Edit”** on an `InventoryCard`:

   * `onEdit={() => { setEditingItem(item); setIsDialogOpen(true); }}`
   * Dialog opens prefilled (because you pass `initialData={editingItem}`).
2. **User saves changes**:

   * Dialog calls `onSubmit(updates)` → `handleEditItem`.
3. Backend:

   * `apiService.updateItem(editingItem.id, updates)` → e.g. `PATCH /items/:id`
   * Returns updated record.
4. `setItems`:

   * Map through previous items, replace the one with same `id` with `updated`.
5. React re-renders, `applyFilters` runs, cards update.

---

## 10. Delete flow – `handleDeleteItem`

```ts
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
```

**Flow:**

1. User clicks “Delete” on a card → `onDelete={() => handleDeleteItem(item.id)}`.
2. Browser `confirm` pops up.
3. On confirm:

   * `apiService.deleteItem(id)` → e.g. `DELETE /items/:id`.
4. Local state is updated by **removing** that id from `items` → UI updates & filters re-run.

---

## 11. Status update flow – `handleStatusUpdate`

```ts
const handleStatusUpdate = async (
  id: string,
  status: "in_stock" | "low" | "out_of_stock"
) => {
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
```

**Flow:**

1. Inside `InventoryCard`, maybe you have a dropdown or buttons for status.
2. It calls `onStatusChange(newStatus)` → you pass:

   ```ts
   onStatusChange={(status) => handleStatusUpdate(item.id, status)}
   ```
3. Backend persists status change.
4. Local state is updated with new `updated` item.

---

## 12. Logout flow

```ts
const handleLogout = async () => {
  try {
    await logout();
    setLocation("/auth");
  } catch (error) {
    console.error("Logout error:", error);
  }
};
```

* `logout()` from `useAuth` probably:

  * Clears tokens (localStorage/cookies/context)
  * Sets `isAuthenticated = false`.
* `setLocation("/auth")` ensures navigation to auth screen.

---

## 13. Clear filters

```ts
const clearFilters = () => {
  setSearchQuery("");
  setStatusFilter("all");
  setCategoryFilter("all");
  setFrequencyFilter("all");
};
```

* Resets to default.
* `useEffect` triggers `applyFilters` → `filteredItems` becomes equal to `items`.

---

## 14. UI rendering & data bindings

### Header

* Shows app name + current user info (`user?.email`, `user?.username`).
* **Add Item** button opens dialog in “add” mode:

```tsx
<Button
  onClick={() => {
    setEditingItem(null);
    setIsDialogOpen(true);
  }}
>
  Add Item
</Button>
```

### `AddItemDialog`

```tsx
<AddItemDialog
  open={isDialogOpen}
  onOpenChange={setIsDialogOpen}
  onSubmit={editingItem ? handleEditItem : handleAddItem}
  initialData={editingItem || undefined}
  isEditing={!!editingItem}
/>
```

* Controlled component:

  * `open` and `onOpenChange` tied to `isDialogOpen`.
  * `onSubmit` is dynamic:

    * If `editingItem` exists → `handleEditItem`
    * Else → `handleAddItem`
  * `initialData` used to pre-fill form when editing.

### Filters card

* Each filter is bound to state:

```tsx
<Input
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
/>

<Select value={statusFilter} onValueChange={setStatusFilter}>
  ...
</Select>
```

* Change of any filter triggers `useEffect` → `applyFilters`.

### Inventory grid

```tsx
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
```

* Each card is connected back to container handlers.
* **One-way data flow, event callbacks upward**:

  * Container owns data (`items`).
  * Children display data, emit events to request changes.
  * Container talks to backend and updates `items`.

---

## 15. Summary in sequence-diagram style

### Example: Add new item

1. User clicks **“Add Item”** button.
2. `Home` → `setEditingItem(null); setIsDialogOpen(true);`
3. `AddItemDialog` opens empty.
4. User fills form & hits **Save**.
5. `AddItemDialog` calls `onSubmit(formData)`.
6. `Home.handleAddItem(newItem)`:

   * Calls `apiService.createItem(newItem)`.
   * Backend returns `createdItem`.
   * `setItems(prev => [createdItem, ...prev])`.
7. React re-renders:

   * `items` changed → `applyFilters()` runs → `filteredItems` updated.
   * UI shows the new `InventoryCard`.

Same pattern holds for **edit/delete/status**.

---

If you want, I can next:

* Draw this as a **Mermaid sequence diagram** (Controller–Service–API–DB style).
* Or refactor this into:

  * **`useInventory` custom hook** (encapsulating `items`, filters, load/add/edit/delete).
  * Or **Redux / Zustand** store if you want shared state across pages.

Nice, this `AddItemDialog` is pretty polished already 👌
I’ll walk through **how it works technically + how data flows** end-to-end.

---

## 1. What this component is responsible for

`AddItemDialog` is a **reusable modal form** that can work in two modes:

* **Add mode** – create a new inventory item
* **Edit mode** – update an existing inventory item

It does **not** talk to the API directly. Instead:

* It collects/validates the input.
* It builds a typed `itemData` object.
* It hands that object to the parent via `onSubmit(...)`.
* The parent (your `Home` page) decides whether to call `createItem` or `updateItem`.

So: **UI + form logic here, business logic in parent.**

---

## 2. Props & data contracts

```ts
interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">) => void;
  initialData?: InventoryItem;
  isEditing?: boolean;
}
```

* `open`: controlled flag from parent (dialog visible or not).
* `onOpenChange`: callback used by the dialog to tell parent “I opened/closed”.
* `onSubmit`: called when user clicks **Add Item / Save Changes** with a **partial InventoryItem** (without id/timestamps).
* `initialData`: existing item passed when editing (used to pre-fill).
* `isEditing`: boolean to switch labels & behavior (Add vs Edit).

**Important:**
This is a **controlled dialog pattern** – `open` is not owned internally; parent owns it.

---

## 3. Local state inside the dialog

```ts
const [name, setName] = useState("");
const [category, setCategory] = useState<...>("groceries");
const [frequency, setFrequency] = useState<...>("weekly");
const [status, setStatus] = useState<...>("in_stock");
const [price, setPrice] = useState("");
const [note, setNote] = useState("");
const [date, setDate] = useState<Date>();
const { toast } = useToast();
```

Local state = pure UI/form state:

* `name`, `category`, `frequency`, `status`, `price`, `note`, `date`:

  * Mirror the relevant fields in `InventoryItem`.
  * `price` is stored as **string** for easier `<input type="number">` handling; converted to number later.
  * `date` is a `Date | undefined` for the calendar UI; later converted to ISO string for `needBy`.

---

## 4. Syncing with `initialData` & open/close behavior

```ts
useEffect(() => {
  if (initialData && open) {
    setName(initialData.name);
    setCategory(initialData.category);
    setFrequency(initialData.frequency);
    setStatus(initialData.status);
    setPrice(initialData.price ? initialData.price.toString() : "");
    setNote(initialData.note || "");
    setDate(initialData.needBy ? new Date(initialData.needBy) : undefined);
  } else if (!open && !initialData) {
    resetForm();
  }
}, [initialData, open]);
```

This is the **“mode switch” and form sync logic**:

1. **Edit mode** (`initialData` exists & `open === true`)

   * When dialog is opened for editing, we:

     * Fill all fields from `initialData`.
     * Convert `price` to string.
     * Convert `needBy` ISO string to `Date` instance for the calendar.

2. **Add mode** + dialog closed (`!open && !initialData`)

   * When an “Add” dialog is closed (no `initialData`), we reset the form so the next time it opens, it’s fresh.

`resetForm()` just brings everything to default:

```ts
const resetForm = () => {
  setName("");
  setCategory("groceries");
  setFrequency("weekly");
  setStatus("in_stock");
  setPrice("");
  setNote("");
  setDate(undefined);
};
```

> 🔎 Note: If you close an edit dialog (backdrop click / Esc) but **don’t** clear `initialData` from parent, the form will keep the last values, which is usually good: open again → same data.

---

## 5. Submit flow & validation

```ts
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
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
    category,
    status,
    frequency,
    price: price ? parseFloat(price) : undefined,
    note: note || undefined,
    needBy: date ? date.toISOString() : undefined,
  };

  try {
    await onSubmit(itemData);
    resetForm();
  } catch (error) {
    console.error("Submit error:", error);
  }
};
```

**Detailed flow:**

1. Prevent default `<form>` submit refresh.
2. Minimal validation:

   * `name` is required.
   * If empty → show `toast` and abort.
3. Build `itemData` object:

   * `price`: if non-empty string, `parseFloat`; otherwise `undefined`.
   * `note`: convert `""` to `undefined` to avoid empty strings in DB.
   * `needBy`: if `date` exists, convert to ISO (`yyyy-MM-ddTHH:mm:ss.sssZ`).
4. `await onSubmit(itemData)`:

   * `onSubmit` is owned by parent (`Home`):

     * In add mode → `apiService.createItem(itemData)`
     * In edit mode → `apiService.updateItem(...)`
   * `await` to give parent a chance to throw error if API fails.
5. On success: `resetForm()`.

> ⚠️ The dialog itself is not closed here; the **parent usually closes it** inside its `onSubmit` handler after successful API call (`setIsDialogOpen(false)`).

---

## 6. Dialog + trigger structure

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogTrigger asChild>
    <Button className="gap-2 shadow-md hover:shadow-lg transition-all">
      <Plus className="w-4 h-4" /> Add Item
    </Button>
  </DialogTrigger>
  <DialogContent> ... </DialogContent>
</Dialog>
```

Key points:

* `Dialog` is a **controlled** component:

  * `open` and `onOpenChange` are passed in from parent.
* `DialogTrigger`:

  * Wraps a `Button`.
  * When clicked, it calls `onOpenChange(true)` and opens the dialog.
* `DialogContent`:

  * Contains the entire form and footer.

👉 **Important design note:**
In your `Home` component you are *already* rendering an “Add Item” button that sets `isDialogOpen(true)` and then renders `<AddItemDialog open={isDialogOpen} ... />`.

So you have **two possible open flows**:

1. Home header button (`Add Item` in header)
2. This internal `DialogTrigger`’s `Add Item` button (inside dialog component)

You can choose one strategy:

* **Option A (container-controlled only):**

  * Keep the header button in `Home`.
  * **Remove `DialogTrigger`** and that inner `Add Item` button from `AddItemDialog` (just keep the dialog content).
* **Option B (self-contained dialog):**

  * Use this component directly wherever you want an “Add Item” button, and let it open itself.
  * Then don’t duplicate another Add button in `Home`.

Right now it’s a bit hybrid but still works.

---

## 7. Form components & bindings

### Name input

```tsx
<Input
  id="name"
  placeholder="e.g., Olive Oil"
  value={name}
  onChange={(e) => setName(e.target.value)}
  autoFocus={!isEditing}
  required
/>
```

* Bound to `name` state.
* Auto-focus only in add mode (nice UX).

### Category & frequency

Each uses a `Select`:

```tsx
<Select value={category} onValueChange={(val) => setCategory(val as any)}>
  ...
</Select>

<Select value={frequency} onValueChange={(val) => setFrequency(val as any)}>
  ...
</Select>
```

* Controlled selects.
* Cast `val as any` because `Select` gives a string and TS union is more specific.

### Price

```tsx
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
```

* Visual prefix with `$` (you can change to `₹`).
* Stored as string.
* Validated/converted to `number` on submit.

### Need By Date – Calendar + Popover

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      className={cn(
        "w-full justify-start text-left font-normal",
        !date && "text-muted-foreground"
      )}
      type="button"
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
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => setDate(undefined)}
        >
          Clear Date
        </Button>
      </div>
    )}
  </PopoverContent>
</Popover>
```

* Clicking button opens calendar popover.
* `Calendar` is a controlled input:

  * `selected={date}`
  * `onSelect={setDate}`
* `format(date, "PPP")` shows e.g. `Dec 03, 2025`.
* `Clear Date` button sets `date` to `undefined`.

On submit, that `date` becomes `needBy: date.toISOString()`.

### Note

```tsx
<Textarea
  id="note"
  placeholder="e.g., Brand preference, size, etc."
  value={note}
  onChange={(e) => setNote(e.target.value)}
  className="resize-none h-20"
/>
```

* Simple description/extra info field.

---

## 8. Footer / submit button

```tsx
<DialogFooter>
  <Button type="submit">
    {isEditing ? "Save Changes" : "Add Item"}
  </Button>
</DialogFooter>
```

* Uses `<form onSubmit={handleSubmit}>`, so clicking this button triggers `handleSubmit`.
* Label switches based on mode.

---

## 9. Data flow summary (Add vs Edit)

### Add flow

1. Parent (`Home`) calls:

   ```tsx
   <AddItemDialog
     open={isDialogOpen}
     onOpenChange={setIsDialogOpen}
     onSubmit={handleAddItem}
     isEditing={false}
   />
   ```

2. User clicks Add button (either in header or `DialogTrigger`).

3. `open` becomes true → dialog opens with empty fields.

4. User fills form & submits.

5. `handleSubmit` builds `itemData` and calls `handleAddItem(itemData)` in parent.

6. Parent:

   * Sends API call `createItem`.
   * On success updates `items` state.
   * Closes dialog (`setIsDialogOpen(false)`).

### Edit flow

1. Parent sets:

   ```tsx
   setEditingItem(item);
   setIsDialogOpen(true);
   ```

   and renders:

   ```tsx
   <AddItemDialog
     open={isDialogOpen}
     onOpenChange={setIsDialogOpen}
     onSubmit={handleEditItem}
     initialData={editingItem}
     isEditing
   />
   ```

2. `useEffect` sees `initialData && open` → populates form with existing item.

3. User modifies & submits.

4. `handleSubmit` calls `handleEditItem(itemData)` in parent.

5. Parent:

   * Sends `updateItem` API.
   * Merges updated item into `items` array.
   * Clears `editingItem`, closes dialog.

---

If you want, I can:

* Suggest a **refactor** to split this into a generic `InventoryItemForm` + `AddItemDialog` wrapper.
* Or write a **Mermaid diagram** that includes `Home`, `AddItemDialog`, `apiService`, and backend.

Nice, you’ve basically built a mini auth system with clean separation:

* `AuthPage` = UI + basic validation + navigation
* `AuthProvider` = global state + talking to `apiService` + token handling

I’ll walk through both in detail.

---

# 1. `AuthPage` – Login & Register UI + Flow

This is your public page where user can:

* Login
* Register
* Navigate to “forgot password”

## 1.1. Hooks and state

```ts
const { login, register, isLoading } = useAuth();
const [, setLocation] = useLocation();
const [activeTab, setActiveTab] = useState("login");
  
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [username, setUsername] = useState("");
const [error, setError] = useState("");
```

* `useAuth()` gives you:

  * `login(email, password)`
  * `register(email, username, password)`
  * `isLoading`: spinner flag when auth calls are in progress.
* `useLocation()` from `wouter` → `setLocation("/path")` for navigation.
* `activeTab`: `"login"` or `"register"` → controlled `<Tabs>` state.
* `email`, `password`, `username`, `error`: local form state.

---

## 1.2. Login flow

```ts
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
    setError(err instanceof Error ? err.message : "Login failed");
  }
};
```

**Step-by-step:**

1. Prevent page refresh.
2. Clear previous error.
3. Simple validation: if either field empty → set error and abort.
4. Call `await login(email, password)` from context:

   * This talks to backend via `apiService.login`.
   * If success: user & token are persisted in context/localStorage.
5. On success: `setLocation("/")` → navigate to Home dashboard.
6. On failure: show error from thrown exception.

---

## 1.3. Register flow

```ts
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
    setError(err instanceof Error ? err.message : "Registration failed");
  }
};
```

**Step-by-step:**

1. Prevent refresh.
2. Clear error.
3. Validate all fields present.
4. Basic password length check.
5. Call `register(...)` from context:

   * This calls `apiService.register` → backend creates user and returns token/user.
6. On success: go to `/`.
7. On failure: show error.

---

## 1.4. Layout, tabs and forms

```tsx
<Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="grid w-full grid-cols-2 mb-6">
    <TabsTrigger value="login">Login</TabsTrigger>
    <TabsTrigger value="register">Sign Up</TabsTrigger>
  </TabsList>
  
  <TabsContent value="login">
    <form onSubmit={handleLogin}> ... </form>
  </TabsContent>

  <TabsContent value="register">
    <form onSubmit={handleRegister}> ... </form>
  </TabsContent>
</Tabs>
```

* `Tabs` is **controlled** via `activeTab`.
* Switching tab changes form and the title/description in `CardHeader`.
* Both forms reuse the same `email` & `password` state, but `username` only used in register.

### Forgot password link

```tsx
<Button 
  variant="link"
  onClick={() => setLocation("/forgot-password")}
  type="button"
>
  Forgot password?
</Button>
```

* Simple client-side navigation to a `/forgot-password` route.

### Buttons with loading state

```tsx
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
```

* Uses `isLoading` from context so UI is disabled during API calls.
* Same idea for the register button (“Creating account…”).

---

## 1.5. Demo credentials

```tsx
<div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4 text-xs">
  <p className="font-semibold text-blue-900 mb-1">Demo Credentials:</p>
  <p className="text-blue-800">Email: <code>demo@example.com</code></p>
  <p className="text-blue-800">Password: <code>demo123</code></p>
</div>
```

* Purely front-end convenience.
* Your backend should accept these for demo login.

---

# 2. `AuthProvider` + `useAuth` – Global Auth State & API Wiring

Now the backbone.

This is a **React Context** that:

* Stores `user`, `isAuthenticated`, `isLoading`.
* Talks to `apiService` for login/register/logout/verifyToken.
* Persists data in `localStorage`.
* Exposes `useAuth()` hook for any component.

---

## 2.1. Types & context

```ts
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
```

* `User` is your minimal user shape.
* `AuthContextType` defines everything your auth layer exposes.
* Context is initialized with `undefined` so you can detect misuse.

---

## 2.2. `AuthProvider` – initial state & localStorage

```ts
const [user, setUser] = useState<User | null>(() => {
  const saved = localStorage.getItem("pantrypal_user");
  return saved ? JSON.parse(saved) : null;
});
const [isLoading, setIsLoading] = useState(false);
const [isAuthenticated, setIsAuthenticated] = useState(!!user);
const { toast } = useToast();
```

* `user` initial value:

  * Reads `"pantrypal_user"` from localStorage on first render.
  * If exists → parse JSON and set as current user (so refresh keeps session).
* `isAuthenticated` initialized from `!!user`.
* `isLoading`: for UI spinners.
* `toast`: global feedback for auth operations.

---

## 2.3. Verify token on app load

```ts
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
```

**Flow:**

1. On first mount of `AuthProvider`, run `verifyAuth`.
2. Look for `pantrypal_auth_token` in `localStorage`.
3. If token exists:

   * Call `apiService.verifyToken()` (probably `GET /auth/me` or `/auth/verify`).
   * If valid:

     * Update `user` and `isAuthenticated`.
     * Refresh `"pantrypal_user"` in localStorage.
   * If invalid (expired/invalid token):

     * Call `apiService.clearAuth()` to remove token (and maybe auth headers).
     * Reset `user` + `isAuthenticated`.

So this gives you **“auto-login on refresh”** and also validates that token is still good.

---

## 2.4. `login` function

```ts
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
```

**What happens:**

1. Set `isLoading = true`.
2. Call `apiService.login(email, password)`:

   * This should:

     * `POST /auth/login` with credentials.
     * Receive `{ token, user }`.
     * Save token to `localStorage` (inside apiService) and configure default headers.
3. Update context:

   * `setUser(response.user);`
   * `setIsAuthenticated(true);`
4. Show success toast.
5. On error:

   * Show error toast.
   * `throw error` so that `AuthPage` can also set its own `error` message.
6. Reset `isLoading`.

---

## 2.5. `register` function

```ts
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
```

Same pattern as `login`, but for `register`:

* Backend should create user, issue token, return `user`.

---

## 2.6. `logout` function

```ts
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
```

**Flow:**

1. Set `isLoading = true`.
2. Try calling `apiService.logout()`:

   * Optionally hit a logout endpoint (invalidate refresh token, etc.).
   * Clear token from localStorage.
3. Reset context: `user = null`, `isAuthenticated = false`.
4. Show “Logged out” toast.
5. If API call fails (e.g. network):

   * Still do `clearAuth()`, clear user & isAuthenticated.
6. End by setting `isLoading = false`.

---

## 2.7. Providing the context

```tsx
<AuthContext.Provider
  value={{ user, login, register, logout, isLoading, isAuthenticated }}
>
  {children}
</AuthContext.Provider>
```

* Wrap your entire app in `<AuthProvider>` in `main.tsx` / `App.tsx`:

  ```tsx
  <AuthProvider>
    <Router> ... </Router>
  </AuthProvider>
  ```

* Any child component can now call `useAuth()`.

---

## 2.8. `useAuth` hook

```ts
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

* Tiny custom hook that enforces correct usage:

  * If you accidentally use `useAuth()` outside `<AuthProvider>`, it throws a clear error.
* Makes the consumer code clean:

  ```ts
  const { user, isAuthenticated, logout } = useAuth();
  ```

---

## 3. How everything ties together

Full flow when a user logs in:

1. `AuthPage` → user fills login form → `handleLogin`.
2. `handleLogin` calls `await login(email, password)` from `useAuth`.
3. `login()`:

   * Calls `apiService.login`.
   * Saves token in `localStorage` (inside apiService).
   * Sets `user` + `isAuthenticated`.
4. `AuthPage` then does `setLocation("/")`.
5. Your `Home` page:

   * Calls `const { isAuthenticated, user } = useAuth();`
   * If not authenticated, redirects to `/auth`.
   * Otherwise, calls `apiService.getItems` with the token already attached.
6. On app refresh:

   * `AuthProvider` `useEffect` runs `verifyToken`.
   * If token valid → sets `user` + `isAuthenticated`.
   * Protected pages continue to work without forcing re-login.

---

If you want next, I can:

* Sketch an **auth sequence diagram** (AuthPage → useAuth → apiService → backend).
* Or help you implement `apiService` in a clean way (login/register/verify/logout with Axios/fetch, interceptors, error handling).

Nice, this ties everything together – this is your **typed API client** for the whole PantryPal app 👌
Let’s break it down into:

1. Core design idea
2. Generic `request` wrapper (the heart)
3. Token management
4. Auth endpoints
5. Inventory endpoints
6. Stats endpoints
7. How this fits with `AuthProvider` + `Home` + `AddItemDialog`

---

## 1. Core design idea

You’ve wrapped all backend calls into a single class:

```ts
class ApiService { ... }
export const apiService = new ApiService();
```

So everywhere in the app you do:

```ts
apiService.login(...)
apiService.getItems(...)
apiService.updateItemStatus(...)
```

Instead of scattering `fetch` everywhere. This gives:

* One place for **base URL** (`API_CONFIG.BASE_URL`)
* One place for **token injection** (`Authorization: Bearer ...`)
* One place for **error handling + redirects**
* Strong TypeScript types for all responses

This is basically a mini Axios-like client but built with `fetch`.

---

## 2. The generic `request<T>` wrapper

```ts
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
```

### What this does:

1. **Build full URL**:

   ```ts
   const url = `${this.baseUrl}${endpoint}`;
   ```

   `BASE_URL` from `API_CONFIG` might be like `http://localhost:8080/api/v1`.

2. **Attach token if available**:

   ```ts
   const token = this.getToken();
   const headers: HeadersInit = {
     "Content-Type": "application/json",
     ...(token && { Authorization: `Bearer ${token}` }),
     ...options.headers,
   };
   ```

   * Reads JWT from `localStorage`.
   * Conditionally adds `Authorization: Bearer <token>` header.

3. **Prepare `fetch` config**:

   ```ts
   const config: RequestInit = {
     ...options,
     headers,
     credentials: "include",
   };
   ```

   * Merges your method/body options.
   * Always includes `credentials: "include"` (cookies allowed if server sets any).

4. **Do the request**:

   ```ts
   const response = await fetch(url, config);
   ```

5. **HTTP status handling**:

   * `401`: Unauthorized

     * Clear auth from localStorage.
     * Force redirect to `/auth`.
     * Throw error so caller can know it failed.
   * `403`: Forbidden → throw permission error.
   * `>= 500`: Server error → generic “Server error” message.

6. **Parse API response format**:

   Your API is assumed to always return JSON in shape:

   ```ts
   type ApiResponse<T> = {
     data: T;
     message?: string;
   };
   ```

   So:

   ```ts
   const data: ApiResponse<T> = await response.json();

   if (!response.ok) {
     throw new Error(data.message || "An error occurred");
   }

   return data.data as T;
   ```

   * For non-2xx responses, use `data.message` or fallback generic error.
   * For success, return `data.data` typed as `T`.

7. **Catch & log**:

   ```ts
   console.error(`API Error at ${endpoint}:`, error);
   throw error;
   ```

   * Logs endpoint + error.
   * Re-throws so upper layers (auth, UI) can show toast / set error messages.

**Everything else (login, getItems, stats, etc.) is built on top of this.**

---

## 3. Token management

```ts
private tokenKey = API_CONFIG.TOKEN_KEY;

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
```

* `TOKEN_KEY` & `USER_KEY` are stored in `API_CONFIG`.
* `setToken` called after login/register success.
* `getToken` used in `request` to build the Authorization header.
* `clearAuth`:

  * Clears JWT & cached user.
  * Called when:

    * `logout()` is called.
    * Token is invalid (`401` from server).

Your `AuthProvider` also uses the same keys, so both are consistent.

---

## 4. Auth endpoints

### 4.1. `login`

```ts
async login(email: string, password: string): Promise<AuthResponse> {
  const response = await this.request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (response.token) {
    this.setToken(response.token);
    localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(response.user));
  }

  return response;
}
```

**Flow:**

1. Calls `POST /auth/login` with JSON `{ email, password }`.

2. `request` handles HTTP, JSON, error-handling.

3. On success, expects an `AuthResponse` like:

   ```ts
   type AuthResponse = {
     token: string;
     user: { id; username; email; ... };
   };
   ```

4. If token present:

   * Save JWT → `localStorage[TOKEN_KEY]`
   * Save user → `localStorage[USER_KEY]`

5. Return the whole auth response so caller (`AuthProvider.login`) can:

   * Set `user` state.
   * Set `isAuthenticated`.

### 4.2. `register`

```ts
async register(email: string, username: string, password: string): Promise<AuthResponse> {
  const response = await this.request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });

  if (response.token) {
    this.setToken(response.token);
    localStorage.setItem(API_CONFIG.USER_KEY, JSON.stringify(response.user));
  }

  return response;
}
```

* Same pattern as `login`, different payload & endpoint.

### 4.3. `logout`

```ts
async logout(): Promise<void> {
  try {
    await this.request("/auth/logout", { method: "POST" });
  } finally {
    this.clearAuth();
  }
}
```

* Tries to inform backend: `POST /auth/logout` (invalidate refresh token, sessions, etc.).
* **Regardless of response**, it:

  * Clears token & user from `localStorage`.
* This is why `AuthProvider.logout` can safely call `clearAuth` fallback in catch.

### 4.4. Forgot / reset password

```ts
async forgotPassword(email: string): Promise<{ message: string }> {
  return this.request<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return this.request<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}
```

* Good for future `/forgot-password` and `/reset-password` pages you already hinted at in the UI.

### 4.5. Token verification

```ts
async verifyToken(): Promise<{ user: any }> {
  return this.request<{ user: any }>("/auth/verify", {
    method: "GET",
  });
}
```

* Used by `AuthProvider` at startup:

  * If token exists in `localStorage`, hits `/auth/verify`.
  * If OK → updates `user`.
  * If not → clears auth.

---

## 5. Inventory endpoints

### 5.1. `getItems` (with filters)

```ts
async getItems(filters?: {
  status?: string;
  category?: string;
  frequency?: string;
}): Promise<InventoryItem[]> {
  const queryString = filters
    ? "?" + new URLSearchParams(
        Object.entries(filters).filter(([, v]) => v) as any
      ).toString()
    : "";
  return this.request<InventoryItem[]>(`/items${queryString}`, {
    method: "GET",
  });
}
```

**Flow:**

1. Optional `filters` object like:

   ```ts
   { status: "low", category: "groceries" }
   ```
2. `Object.entries(filters)` → `[["status", "low"], ["category", "groceries"]]`
3. `.filter(([, v]) => v)` removes empty/undefined values.
4. `new URLSearchParams(...).toString()` → `"status=low&category=groceries"`.
5. Final URL: `/items?status=low&category=groceries`.
6. `request<InventoryItem[]>` returns a typed array.

Your `Home` page currently builds filters and passes them to this.

### 5.2. `getItem`

```ts
async getItem(id: string): Promise<InventoryItem> {
  return this.request<InventoryItem>(`/items/${id}`, { method: "GET" });
}
```

* For detail view or edit page (if you ever route like `/items/:id`).

### 5.3. `createItem`

```ts
async createItem(
  item: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">
): Promise<InventoryItem> {
  return this.request<InventoryItem>("/items", {
    method: "POST",
    body: JSON.stringify(item),
  });
}
```

* This is called by `Home.handleAddItem` from the add dialog.
* Backend returns full item (with `id`, `createdAt`, `updatedAt`).

### 5.4. `updateItem` (PUT) & `patchItem` (PATCH)

```ts
async updateItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
  return this.request<InventoryItem>(`/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

async patchItem(id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
  return this.request<InventoryItem>(`/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}
```

* `PUT` → full replacement intention.
* `PATCH` → partial update.
* You’re using `updateItem` from `Home.handleEditItem`.

### 5.5. `updateItemStatus`

```ts
async updateItemStatus(
  id: string,
  status: "in_stock" | "low" | "out_of_stock"
): Promise<InventoryItem> {
  return this.request<InventoryItem>(`/items/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
```

* Specific endpoint for status-only change.
* Called by `Home.handleStatusUpdate` from `InventoryCard` actions.

### 5.6. Delete endpoints

```ts
async deleteItem(id: string): Promise<{ message: string }> {
  return this.request<{ message: string }>(`/items/${id}`, {
    method: "DELETE",
  });
}
```

* Called by `Home.handleDeleteItem`.

### 5.7. Search & bulk operations

```ts
async searchItems(query: string): Promise<InventoryItem[]> {
  return this.request<InventoryItem[]>(
    `/items/search?q=${encodeURIComponent(query)}`,
    { method: "GET" }
  );
}

async bulkCreateItems(
  items: Omit<InventoryItem, "id" | "createdAt" | "updatedAt">[]
): Promise<InventoryItem[]> {
  return this.request<InventoryItem[]>("/items/bulk", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

async bulkDeleteItems(ids: string[]): Promise<{ deletedCount: number }> {
  return this.request<{ deletedCount: number }>("/items/bulk", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}
```

* `searchItems`: could power typeahead search, or global search.
* `bulkCreateItems`: nice for seeding inventory quickly.
* `bulkDeleteItems`: for “Delete selected items” feature later.

---

## 6. Stats endpoints

To support insights/analytics dashboards.

```ts
async getStatsSummary(): Promise<{
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  averagePrice: number;
}> {
  return this.request("/stats/summary", { method: "GET" });
}
```

* Total counts & aggregated metrics.

```ts
async getMonthlySpending(months: number = 12): Promise<StatsData["monthlySpending"]> {
  return this.request(`/stats/monthly-spending?months=${months}`, {
    method: "GET",
  });
}
```

* For charting monthly expense over last N months.

```ts
async getCategoryBreakdown(): Promise<StatsData["categoryBreakdown"]> {
  return this.request("/stats/category-breakdown", { method: "GET" });
}
```

* For donut / bar charts by category.

```ts
async getFrequencyReport(): Promise<{
  frequency: string;
  count: number;
  totalSpending: number;
}[]> {
  return this.request("/stats/frequency-report", { method: "GET" });
}
```

* For reporting: how many items are daily/weekly/monthly, how much we spend on each cadence.

Your `Home` page already calls:

* `getStatsSummary()`
* `getMonthlySpending(12)` in that `Insights` tab version.

---

## 7. How this all fits together

* **AuthPage** uses `useAuth` → `AuthProvider` uses `apiService.login/register/logout/verifyToken`.
* **AuthProvider**:

  * On app startup, calls `apiService.verifyToken()` to auto-login if token still valid.
  * `login`/`register` call `apiService.login/register` which set token & user in localStorage.
* **Home** (inventory page):

  * Calls `apiService.getItems(filters)` in `loadItems()`.
  * Calls `apiService.createItem`, `updateItem`, `deleteItem`, `updateItemStatus` via handlers passed to `AddItemDialog` and `InventoryCard`.
* **AddItemDialog**:

  * Only cares about form data; calls `onSubmit(item)`; the parent calls `apiService` methods.

So essentially:

> UI (AuthPage / Home / Dialog) → `useAuth` & handlers → `apiService` → Backend
> `apiService` ensures consistent headers, error-handling, token usage, and redirect behavior.

---

If you’d like, next I can:

* Help you sketch the **Spring Boot REST API** that matches these endpoints and JSON shapes,
* Or write the `API_CONFIG` file with proper `BASE_URL`, `TOKEN_KEY`, `USER_KEY`, and `StatsData`/`ApiResponse` types.
