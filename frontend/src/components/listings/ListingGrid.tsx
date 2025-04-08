// frontend/src/components/listings/ListingsGrid.tsx
import { Listing } from '@/types';
import Link from 'next/link';

interface ListingsGridProps {
  listings: Listing[];
  isLoading?: boolean;
}

export default function ListingsGrid({ listings, isLoading = false }: ListingsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200"></div>
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="flex justify-between pt-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Nie znaleziono żadnych ogłoszeń</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {listings.map((listing) => (
        <div key={listing.id} className="bg-white rounded-lg shadow overflow-hidden">
          <div className="relative pb-[56.25%]">
            <img 
              src={listing.image_url || '/placeholder.png'} 
              alt={listing.title}
              className="absolute h-full w-full object-cover"
            />
          </div>
          <div className="p-4">
            <h3 className="font-medium text-gray-900 truncate">{listing.title}</h3>
            <p className="text-lg font-bold text-gray-900 mt-1">{listing.price} zł</p>
            <p className="text-sm text-gray-500 mt-1">{listing.location}</p>
            
            <div className="mt-2 flex items-center">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                listing.profit_potential > 20 ? 'bg-green-100 text-green-800' :
                listing.profit_potential > 10 ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                Potencjalny zysk: {typeof listing.profit_potential === 'number' ? listing.profit_potential.toFixed(2) : '0.00'}%
              </span>
            </div>
            
            <div className="mt-4 flex justify-between">
              <Link
                href={`/listings/${listing.id}`}
                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
              >
                Szczegóły
              </Link>
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
              >
                Zobacz na OLX
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
