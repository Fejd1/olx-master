// src/types/index.ts
export interface User {
    id: number;
    username: string;
    email: string;
    created_at: string;
    last_login: string;
  }
  
  export interface MonitoredItem {
    id: number;
    user_id: number;
    category?: string; // Dodaj to pole, aby rozwiązać błędy TypeScript
    name: string;
    olx_url?: string; // Dodaj to pole
    min_price: number | null;
    max_price: number | null;
    location: string | null;
    item_condition: string | null;
    created_at: string;
  }
  
  
  export interface Listing {
    id: number;
    monitored_item_id: number;
    olx_id: string;
    title: string;
    price: number;
    location: string;
    item_condition: string | null;
    url: string;
    image_url: string | null;
    description: string | null;
    seller_id: string | null;
    profit_potential: number;
    authenticity_score: number;
    created_at: string;
    updated_at: string;
    monitored_item_name?: string;
  }
  
  export interface PriceHistory {
    id: number;
    listing_id: number;
    price: number;
    date: string;
  }
  
  export interface Notification {
    id: number;
    user_id: number;
    listing_id: number;
    type: 'email' | 'push' | 'sms';
    status: 'pending' | 'sent' | 'read';
    created_at: string;
    listing_title?: string;
    listing_price?: number;
    listing_url?: string;
    listing_image?: string;
  }
  
  export interface DashboardStats {
    itemsCount: number;
    listingsCount: number;
    newListingsCount: number;
  }
  
  export interface CategoryCount {
    category: string;
    count: number;
  }
  
  export interface ItemStat {
    id: number;
    name: string;
    listing_count: number;
    avg_profit_potential: number;
    max_profit_potential: number;
  }
  
  export interface PriceTrend {
    date: string;
    name?: string;
    avg_price: number;
    listing_count: number;
  }
  