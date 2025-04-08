// src/lib/api.ts
import axios from 'axios';
import { 
  User, 
  MonitoredItem, 
  Listing, 
  Notification, 
  DashboardStats, 
  ItemStat, 
  PriceTrend 
} from '@/types';



const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
      // Obsługa błędu 401 (Unauthorized)
      if (error.response && error.response.status === 401) {
        // Usuń nieważny token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Przekieruj do strony logowania (jeśli jesteśmy w przeglądarce)
        if (typeof window !== 'undefined') {
          window.location.href = '/login?error=session_expired';
        }
      }
      
      return Promise.reject(error);
    }
  );

// Interceptor do dodawania tokenu autoryzacyjnego
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = async (username: string, email: string, password: string) => {
  const response = await api.post('/auth/register', { username, email, password });
  return response.data;
};

export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const getUser = async (): Promise<User> => {
  const response = await api.get('/auth/user');
  return response.data.user;
};

// Monitored Items
export const getItems = async (): Promise<MonitoredItem[]> => {
  const response = await api.get('/items');
  return response.data.items;
};

export const getItem = async (id: number): Promise<MonitoredItem> => {
  const response = await api.get(`/items/${id}`);
  return response.data.item;
};

export const createItem = async (item: Partial<MonitoredItem>): Promise<MonitoredItem> => {
  const response = await api.post('/items', item);
  return response.data.item;
};

export const updateItem = async (id: number, item: Partial<MonitoredItem>): Promise<MonitoredItem> => {
  const response = await api.put(`/items/${id}`, item);
  return response.data.item;
};

export const deleteItem = async (id: number): Promise<void> => {
  await api.delete(`/items/${id}`);
};

// Listings
export const getListings = async (
  sort = 'profit_potential',
  order = 'desc',
  limit = 50,
  offset = 0
): Promise<{ listings: Listing[], pagination: { total: number, limit: number, offset: number, hasMore: boolean } }> => {
  const response = await api.get('/listings', {
    params: { sort, order, limit, offset }
  });
  return response.data;
};

export const getListing = async (id: number): Promise<{ listing: Listing, priceHistory: any[] }> => {
  const response = await api.get(`/listings/${id}`);
  return response.data;
};

export const getItemListings = async (itemId: number): Promise<Listing[]> => {
  const response = await api.get(`/items/${itemId}/listings`);
  return response.data.listings;
};

// Stats
export const getDashboardStats = async (): Promise<{
  stats: DashboardStats,
  topDeals: Listing[],
  categoryCounts: { category: string, count: number }[]
}> => {
  const response = await api.get('/stats/dashboard');
  return response.data;
};

export const getProfitPotentialStats = async (): Promise<{
  topListings: Listing[],
  itemStats: ItemStat[]
}> => {
  const response = await api.get('/stats/profit-potential');
  return response.data;
};

export const getPriceTrends = async (
  itemId?: number,
  days = 30
): Promise<{ trends: PriceTrend[] }> => {
  const params: any = { days };
  if (itemId) params.item_id = itemId;
  
  const response = await api.get('/stats/price-trends', { params });
  return response.data;
};

// Notifications
export const getNotifications = async (
  status?: string,
  limit = 20,
  offset = 0
): Promise<{ 
  notifications: Notification[],
  pagination: { total: number, limit: number, offset: number, hasMore: boolean }
}> => {
  const params: any = { limit, offset };
  if (status) params.status = status;
  
  const response = await api.get('/notifications', { params });
  return response.data;
};

export const updateNotification = async (id: number, status: string): Promise<void> => {
  await api.put(`/notifications/${id}`, { status });
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await api.put('/notifications/mark-all-read');
};

export default api;
