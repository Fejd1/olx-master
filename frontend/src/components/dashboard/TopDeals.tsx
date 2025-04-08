// src/components/dashboard/TopDeals.tsx
import { Listing } from '@/types';

interface TopDealsProps {
  deals: Listing[];
}

export default function TopDeals({ deals }: TopDealsProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Najlepsze okazje</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {deals.length === 0 ? (
          <p className="p-4 text-gray-500">Brak okazji do wyświetlenia</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {deals.map((deal) => (
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
        )}
      </div>
    </div>
  );
}
