
export type ItemStatus = 'in-stock' | 'low' | 'out-of-stock';
export type Category = 'groceries' | 'household' | 'medicine' | 'personal' | 'other';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'occasional';

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  status: ItemStatus;
  frequency: Frequency;
  note?: string;
  price?: number;
  needBy?: string; // ISO date string
  lastUpdated: string; // ISO date string
}

export const initialItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Sugar',
    category: 'groceries',
    status: 'in-stock',
    frequency: 'monthly',
    price: 2.50,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Milk',
    category: 'groceries',
    status: 'low',
    frequency: 'daily',
    price: 1.20,
    needBy: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Detergent',
    category: 'household',
    status: 'in-stock',
    frequency: 'monthly',
    price: 12.00,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Paracetamol',
    category: 'medicine',
    status: 'out-of-stock',
    frequency: 'occasional',
    note: 'Prefer the 500mg pack',
    price: 5.50,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Rice (Basmati)',
    category: 'groceries',
    status: 'in-stock',
    frequency: 'monthly',
    price: 15.00,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '6',
    name: 'Toilet Paper',
    category: 'household',
    status: 'low',
    frequency: 'weekly',
    price: 8.00,
    needBy: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
    lastUpdated: new Date().toISOString(),
  },
];

export const monthlyStats = [
  { name: 'Jan', total: 120, items: 45 },
  { name: 'Feb', total: 135, items: 52 },
  { name: 'Mar', total: 110, items: 40 },
  { name: 'Apr', total: 150, items: 58 },
  { name: 'May', total: 142, items: 55 },
  { name: 'Jun', total: 160, items: 62 },
];
