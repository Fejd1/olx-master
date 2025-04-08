// src/app/dashboard/page.jsx
'use client';

import { useEffect, useState } from 'react';
import { getDashboardStats } from '@/lib/api';
import { DashboardStats, Listing, CategoryCount } from '@/types';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topDeals, setTopDeals] = useState<Listing[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data.stats);
        setTopDeals(data.topDeals);
        setCategoryCounts(data.categoryCounts);
      } catch (err) {
        setError('Wystąpił błąd podczas ładowania danych dashboardu');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <div>Ładowanie...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Monitorowane przedmioty</h2>
            <p className="text-3xl font-bold">{stats.itemsCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Znalezione ogłoszenia</h2>
            <p className="text-3xl font-bold">{stats.listingsCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Nowe ogłoszenia (24h)</h2>
            <p className="text-3xl font-bold">{stats.newListingsCount}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Najlepsze okazje</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {topDeals.map((deal) => (
                <li key={deal.id} className="p-4 hover:bg-gray-50">
                  <a href={deal.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-4">
                    <img src={deal.image_url || '/placeholder.png'} alt={deal.title} className="w-16 h-16 object-cover rounded" />
                    <div>
                      <p className="font-semibold">{deal.title}</p>
                      <p className="text-sm text-gray-500">{deal.price} zł</p>
                      <p className="text-sm text-green-600">Potencjalny zysk: {deal.profit_potential.toFixed(2)}%</p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Ogłoszenia według kategorii</h2>
          <div className="bg-white p-4 rounded-lg shadow">
            <ul className="space-y-2">
              {categoryCounts.map((category) => (
                <li key={category.category} className="flex justify-between items-center">
                  <span>{category.category}</span>
                  <span className="font-semibold">{category.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
