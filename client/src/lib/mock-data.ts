
export type ItemStatus = 'in-stock' | 'low' | 'out-of-stock';
export type Category = 'groceries' | 'household' | 'medicine' | 'personal' | 'other';

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  status: ItemStatus;
  lastUpdated: string; // ISO date string
}

export const initialItems: InventoryItem[] = [
  {
    id: '1',
    name: 'Sugar',
    category: 'groceries',
    status: 'in-stock',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Milk',
    category: 'groceries',
    status: 'low',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Detergent',
    category: 'household',
    status: 'in-stock',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Paracetamol',
    category: 'medicine',
    status: 'out-of-stock',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '5',
    name: 'Rice (Basmati)',
    category: 'groceries',
    status: 'in-stock',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: '6',
    name: 'Toilet Paper',
    category: 'household',
    status: 'low',
    lastUpdated: new Date().toISOString(),
  },
];
