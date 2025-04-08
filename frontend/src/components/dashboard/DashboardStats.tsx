// src/components/dashboard/DashboardStats.tsx
import { DashboardStats as Stats } from '@/types';

interface DashboardStatsProps {
  stats: Stats;
}

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
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
  );
}
