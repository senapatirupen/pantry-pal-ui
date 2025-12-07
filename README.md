## financetbag.com

# PantryPal - Household Inventory Management System

A modern, intuitive web application for managing daily household items, groceries, and essentials. Track stock levels, set purchase deadlines, manage prices, and get insights on spending patterns.

---

## 📋 Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Running Locally](#running-locally)
- [Default Credentials](#default-credentials)
- [Usage Guide](#usage-guide)
- [API Integration Steps](#api-integration-steps)
- [Environment Variables](#environment-variables)
- [Future Enhancements](#future-enhancements)

---

## 🎯 Overview

**PantryPal** is a household inventory management application that helps families organize and track their daily items. Users can categorize items by type (groceries, household, medicine, personal care), set purchase frequency (daily, weekly, monthly, occasional), track prices, and receive alerts when items are running low.

**Current Mode:** Frontend Mockup with Local Storage Persistence
**Target Mode:** Full-Stack Application with Backend REST API

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19.2.0 with TypeScript
- **Build Tool:** Vite 7.1.9
- **Styling:** Tailwind CSS 4.1.14 + custom CSS
- **UI Components:** Radix UI (multiple component libraries)
- **State Management:** React Context API
- **Routing:** Wouter 3.3.5 (lightweight client-side routing)
- **Date Handling:** date-fns 3.6.0
- **Charts:** Recharts 2.15.4
- **Icons:** Lucide React 0.545.0
- **Forms:** React Hook Form 7.66.0 + Zod validation
- **Notifications:** Sonner 2.0.7 (toast notifications)

### Build & Deployment
- **Package Manager:** npm
- **Node Version:** Compatible with Node 16+
- **Transpiler:** tsx (for TypeScript execution)
- **Bundler:** Vite + esbuild

### Optional Backend (Currently Not Implemented)
- Express.js 4.21.2
- PostgreSQL (via Neon Database)
- Drizzle ORM 0.39.1
- Passport.js for authentication

---

## ✨ Features

### Core Features (Implemented)
1. **User Authentication (Mock)**
   - Login / Sign Up tabs
   - Forgot Password flow
   - Default credentials: `admin@local.com` / `admin123`
   - Session persistence via localStorage
   - User profile menu with logout

2. **Inventory Management**
   - Add, edit, delete inventory items
   - Quick status updates (In Stock, Running Low, Out of Stock)
   - Category filtering (Groceries, Household, Medicine, Personal Care, Other)
   - Frequency tagging (Daily, Weekly, Monthly, Occasional)

3. **Advanced Filtering**
   - Search by item name
   - Filter by status
   - Filter by category
   - Filter by frequency
   - Filter by "Need By" date range
   - Clear all filters at once

4. **Item Details**
   - Item name
   - Category classification
   - Purchase frequency
   - Estimated price tracking
   - Notes and special requests
   - "Need By" deadline dates
   - Last updated timestamp

5. **Dashboard & Analytics**
   - Monthly spending visualization (bar chart)
   - Current month budget tracking
   - Total items inventory count
   - Low stock alert badges
   - Quick statistics cards

6. **UI/UX**
   - Responsive design (mobile-first)
   - Smooth animations and transitions
   - Color-coded status indicators
   - Dropdown menus for item actions
   - Confirmation dialogs for destructive actions
   - Toast notifications for user feedback

---

## 🏗️ Architecture

### Current Architecture (Frontend-Only Mockup)

```
User Browser
    ↓
    ├── React App (Vite)
    │   ├── Auth Context (useAuth)
    │   ├── Page Router (Wouter)
    │   ├── UI Components (Radix UI)
    │   └── State Management (React Hooks)
    ↓
localStorage (Data Persistence)
```

### Proposed Full-Stack Architecture

```
User Browser (React Frontend)
    ↓
HTTP/REST API (Express Backend)
    ├── /auth/* (Login, Register, Forgot Password)
    ├── /items/* (CRUD operations)
    ├── /stats/* (Analytics & Reporting)
    └── /user/* (Profile Management)
    ↓
Backend Services
    ├── Authentication (Passport.js)
    ├── Request Validation (Zod)
    ├── ORM Layer (Drizzle ORM)
    ↓
PostgreSQL Database (Neon)
    ├── users table
    ├── items table
    ├── purchase_history table
    └── spending_stats table
```

### Data Flow

**Frontend State Management:**
- `AuthContext` → User authentication state
- `useState` → Local component state for filters, items, view mode
- `localStorage` → Persistence across sessions

**Component Hierarchy:**
```
App.tsx (Root with AuthProvider)
├── AuthPage.tsx (Login/Register)
├── ForgotPasswordPage.tsx
└── Home.tsx (Protected Route)
    ├── Header (User profile, view toggle)
    ├── Filter Section
    │   ├── Search input
    │   ├── Status dropdown
    │   ├── Category dropdown
    │   ├── Frequency dropdown
    │   └── Date picker
    └── Content Area
        ├── Inventory Grid
        │   └── InventoryCard (with edit/delete menu)
        └── Stats/Insights View
            ├── Chart component
            └── Statistics cards
```

---

## 📁 Project Structure

```
house-inventory/
├── client/
│   ├── public/
│   │   └── favicon.png
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                    # Radix UI components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── popover.tsx
│   │   │   │   ├── calendar.tsx
│   │   │   │   └── [other UI components...]
│   │   │   ├── add-item-dialog.tsx    # Dialog for adding/editing items
│   │   │   ├── inventory-card.tsx     # Individual item card component
│   │   ├── pages/
│   │   │   ├── auth.tsx               # Login/Sign up page
│   │   │   ├── forgot-password.tsx    # Password reset page
│   │   │   ├── home.tsx               # Main dashboard (protected)
│   │   │   └── not-found.tsx          # 404 page
│   │   ├── lib/
│   │   │   ├── auth-context.tsx       # Auth state management
│   │   │   ├── mock-data.ts           # Mock inventory data
│   │   │   ├── queryClient.ts         # React Query config
│   │   │   └── utils.ts               # Helper functions
│   │   ├── hooks/
│   │   │   ├── use-toast.ts           # Toast notification hook
│   │   │   └── use-mobile.tsx         # Mobile detection hook
│   │   ├── App.tsx                    # Root component with routing
│   │   ├── index.css                  # Tailwind + design system
│   │   └── main.tsx                   # React entry point
│   ├── index.html                     # HTML template with meta tags
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                            # Backend (Currently unused, for future integration)
│   ├── index-dev.ts
│   ├── index-prod.ts
│   ├── app.ts
│   ├── routes.ts
│   └── storage.ts
├── shared/
│   └── schema.ts                      # Shared TypeScript types/schemas
├── package.json                       # Dependencies & scripts
├── tsconfig.json
├── postcss.config.js                  # Tailwind PostCSS config
├── drizzle.config.ts                  # ORM config (for future backend)
└── README.md
```

---

## 💻 Installation & Setup

### Prerequisites
- Node.js 16+ and npm installed
- Git (for cloning the repository)
- Text editor (VS Code recommended)

### Step 1: Clone/Download the Project
```bash
# Clone from repository
git clone <repository-url>
cd house-inventory

# OR download as ZIP and extract
unzip house-inventory.zip
cd house-inventory
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install all required packages including React, Vite, Tailwind CSS, and UI components.

### Step 3: Verify Installation
```bash
npm run check
```

This runs TypeScript type checking to ensure all dependencies are properly installed.

---

## 🚀 Running Locally

### Development Mode
```bash
npm run dev:client
```

- Starts the Vite development server on `http://localhost:5000`
- Hot module replacement (HMR) enabled for live reloading
- Open browser and navigate to the URL

### Production Build
```bash
npm run build
```

- Bundles the React app for production
- Outputs to `dist/public` directory
- Optimized and minified code

### Type Checking
```bash
npm run check
```

- Runs TypeScript compiler
- Validates all type definitions
- Catches potential bugs before runtime

---

## 🔐 Default Credentials

For local development, use these credentials:

**Admin Account:**
- **Email:** `admin@local.com`
- **Password:** `admin123`

**Test Account:**
- **Email:** Any email address
- **Password:** Any password (no validation on mock)

*Note: In mock mode, password validation only applies to the admin account. Other accounts accept any password for testing.*

---

## 📖 Usage Guide

### 1. **Login**
   - Navigate to `http://localhost:5000`
   - Use default credentials or any email/password
   - Session persists in browser localStorage

### 2. **Add Items**
   - Click "Add Item" button in header
   - Fill in item details:
     - **Name:** Item name (required)
     - **Category:** Select from dropdown
     - **Frequency:** Daily/Weekly/Monthly/Occasional
     - **Price:** Estimated cost (optional)
     - **Need By Date:** Purchase deadline (optional)
     - **Note:** Special requests or preferences
   - Click "Add Item"

### 3. **Update Item Status**
   - On each card, use three buttons:
     - ✓ **Stocked:** Item is in stock
     - ⚠️ **Low:** Item quantity running low
     - ✗ **Empty:** Item out of stock

### 4. **Edit Item**
   - Hover over card and click "..." menu
   - Select "Edit"
   - Modify any field
   - Click "Save Changes"

### 5. **Delete Item**
   - Hover over card and click "..." menu
   - Select "Delete"
   - Confirm in dialog

### 6. **Filter & Search**
   - **Search:** Type item name in search box
   - **Status Filter:** In Stock, Running Low, Out of Stock
   - **Category Filter:** Groceries, Household, Medicine, etc.
   - **Frequency Filter:** Daily, Weekly, Monthly, Occasional
   - **Date Filter:** Items needed by specific date
   - **Clear Filters:** Reset all filters

### 7. **View Analytics**
   - Click "Insights" tab
   - View monthly spending chart
   - Check statistics cards

### 8. **Logout**
   - Click user profile icon (top right)
   - Select "Log out"

---

## 🔗 API Integration Steps

To connect this frontend to a real backend, follow these steps:

### Step 1: Update Auth Context

**File:** `client/src/lib/auth-context.tsx`

Replace the mock login function with actual API calls:

```typescript
const login = async (email: string, password?: string) => {
  setIsLoading(true);
  try {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include", // For cookies
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();
    setUser(data.user);
    localStorage.setItem("auth_token", data.token); // Or use cookie
    localStorage.setItem("mock_user", JSON.stringify(data.user));
    
    toast({
      title: "Welcome back!",
      description: `Successfully logged in as ${data.user.username}`,
    });
  } catch (error) {
    toast({
      title: "Login Failed",
      description: error instanceof Error ? error.message : "Unknown error",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};
```

### Step 2: Create API Service Layer

**File:** `client/src/lib/api.ts` (Create new file)

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api";

export const apiClient = {
  // Auth endpoints
  login: (email: string, password: string) =>
    fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    }).then(r => r.json()),

  register: (username: string, email: string, password: string) =>
    fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
      credentials: "include",
    }).then(r => r.json()),

  // Items endpoints
  getItems: () =>
    fetch(`${API_BASE_URL}/items`, {
      credentials: "include",
    }).then(r => r.json()),

  addItem: (item: any) =>
    fetch(`${API_BASE_URL}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item),
      credentials: "include",
    }).then(r => r.json()),

  updateItem: (id: string, updates: any) =>
    fetch(`${API_BASE_URL}/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
      credentials: "include",
    }).then(r => r.json()),

  deleteItem: (id: string) =>
    fetch(`${API_BASE_URL}/items/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).then(r => r.json()),

  // Stats endpoints
  getStats: () =>
    fetch(`${API_BASE_URL}/stats`, {
      credentials: "include",
    }).then(r => r.json()),
};
```

### Step 3: Update Home Component

**File:** `client/src/pages/home.tsx`

Replace local state with API calls:

```typescript
import { apiClient } from "@/lib/api";

export default function Home() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch items from API
    apiClient.getItems()
      .then(data => {
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch items:", error);
        setLoading(false);
      });
  }, []);

  const handleAddItem = async (newItemData) => {
    try {
      const response = await apiClient.addItem(newItemData);
      setItems(prev => [response, ...prev]);
      toast({
        title: "Item Added",
        description: "Successfully added to inventory",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await apiClient.deleteItem(id);
      setItems(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Item Deleted",
        description: "Item removed from inventory",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  // Similar updates for edit and status update...
}
```

### Step 4: Backend API Endpoints Required

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/forgot-password` - Password reset
- `POST /api/auth/logout` - User logout

**Inventory Items:**
- `GET /api/items` - Fetch all items for user
- `POST /api/items` - Create new item
- `PATCH /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

**Statistics:**
- `GET /api/stats` - Get monthly spending data
- `GET /api/stats/summary` - Get summary statistics

### Step 5: Environment Configuration

**File:** `.env.local` (Create in project root)

```
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=PantryPal
```

**File:** `client/src/lib/api.ts` (Update base URL)

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";
```

### Step 6: Error Handling & Authentication

Add token handling to all API requests:

```typescript
export const apiClient = {
  request: async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("auth_token");
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (response.status === 401) {
      // Token expired, redirect to login
      localStorage.removeItem("auth_token");
      window.location.href = "/auth";
    }

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  },

  getItems: () => apiClient.request("/items"),
  addItem: (data) => apiClient.request("/items", { method: "POST", body: JSON.stringify(data) }),
  // ... other methods
};
```

---

## 🌍 Environment Variables

### Frontend Configuration

Create `.env.local` in the project root:

```env
# API Configuration
VITE_API_URL=http://localhost:3000/api

# App Configuration
VITE_APP_NAME=PantryPal
VITE_APP_VERSION=1.0.0
```

### Backend Configuration (When Implementing)

Create `.env` in the server root:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/houseinventory

# Authentication
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here

# CORS
CORS_ORIGIN=http://localhost:5000
```

---

## 🚀 Future Enhancements

### Phase 2: Backend Implementation
- [ ] Implement Express.js REST API
- [ ] Set up PostgreSQL database with Drizzle ORM
- [ ] Add Passport.js authentication
- [ ] Implement JWT token-based auth
- [ ] Add password hashing and security

### Phase 3: Advanced Features
- [ ] Real-time notifications
- [ ] Multi-user household support (shared inventory)
- [ ] Barcode scanning for items
- [ ] Purchase history tracking
- [ ] Budget alerts and recommendations
- [ ] Export inventory as PDF/CSV
- [ ] Mobile app (React Native)

### Phase 4: DevOps & Deployment
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] AWS/GCP deployment
- [ ] Database backups and recovery
- [ ] Performance monitoring

### Phase 5: Analytics & AI
- [ ] Predictive purchasing recommendations
- [ ] Smart budget forecasting
- [ ] Seasonal purchase patterns
- [ ] AI-powered shopping list generation

---

## 📝 API Response Examples

### Login Response
```json
{
  "success": true,
  "user": {
    "id": "user_123",
    "username": "admin",
    "email": "admin@local.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Get Items Response
```json
{
  "success": true,
  "items": [
    {
      "id": "item_1",
      "name": "Milk",
      "category": "groceries",
      "status": "low",
      "frequency": "daily",
      "price": 1.20,
      "note": "Full cream milk",
      "needBy": "2024-11-30T00:00:00Z",
      "lastUpdated": "2024-11-29T10:30:00Z"
    }
  ]
}
```

### Add Item Response
```json
{
  "success": true,
  "item": {
    "id": "item_new",
    "name": "Rice",
    "category": "groceries",
    "status": "in-stock",
    "frequency": "monthly",
    "price": 15.00,
    "createdAt": "2024-11-29T10:35:00Z"
  }
}
```

---

## 🛠️ Development Tips

1. **Hot Reload:** Changes to React components automatically reload in browser
2. **TypeScript:** All code is typed; use IDE autocomplete
3. **Styling:** Modify Tailwind classes directly in components
4. **Debugging:** Use browser DevTools to inspect React components (React DevTools extension recommended)
5. **Testing:** Add test cases in `__tests__` directories before production

---

## 📄 License

MIT License - Feel free to use and modify for personal or commercial projects.

---

## 📧 Support

For issues, questions, or suggestions, please create an issue in the repository or contact the development team.

---

**Built with ❤️ for better household organization**
