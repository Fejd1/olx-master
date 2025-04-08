// frontend/src/app/listings/page.tsx
// Jeśli ten plik nie istnieje, utwórz go z poniższą zawartością:

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { getListings } from '@/lib/api';
import { Listing } from '@/types';
import ListingsGrid from '@/components/listings/ListingGrid';
import { useAuthProtection } from '@/lib/auth';

export default function ListingsPage() {
  useAuthProtection();
  
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 12,
    offset: 0,
    hasMore: false
  });
  
  // Pobierz parametry sortowania z URL
  const sort = searchParams.get('sort') || 'profit_potential';
  const order = searchParams.get('order') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  
  useEffect(() => {
    const fetchListings = async () => {
      try {
        setIsLoading(true);
        const offset = (page - 1) * pagination.limit;
        const result = await getListings(sort, order, pagination.limit, offset);
        
        setListings(result.listings);
        setPagination(result.pagination);
      } catch (err: any) {
        console.error('Błąd podczas pobierania ogłoszeń:', err);
        setError(err.response?.data?.message || 'Wystąpił błąd podczas pobierania ogłoszeń');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchListings();
  }, [sort, order, page, pagination.limit]);
  
  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const [newSort, newOrder] = value.split('-');
    
    // Zaktualizuj URL z nowymi parametrami
    const url = new URL(window.location.href);
    url.searchParams.set('sort', newSort);
    url.searchParams.set('order', newOrder);
    url.searchParams.set('page', '1'); // Resetuj stronę
    window.history.pushState({}, '', url.toString());
    
    // Odśwież stronę (Next.js nie odświeża automatycznie przy zmianie URL)
    window.location.href = url.toString();
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Wszystkie ogłoszenia</h1>
        
        <div className="flex items-center space-x-4">
          <label htmlFor="sort" className="text-sm font-medium text-gray-700">
            Sortuj według:
          </label>
          <select
            id="sort"
            value={`${sort}-${order}`}
            onChange={handleSortChange}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="profit_potential-desc">Najwyższy potencjał zysku</option>
            <option value="profit_potential-asc">Najniższy potencjał zysku</option>
            <option value="price-asc">Najniższa cena</option>
            <option value="price-desc">Najwyższa cena</option>
            <option value="created_at-desc">Najnowsze</option>
            <option value="created_at-asc">Najstarsze</option>
          </select>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md text-red-700 mb-6">
          <p className="font-medium">Wystąpił błąd</p>
          <p>{error}</p>
        </div>
      )}
      
      <ListingsGrid listings={listings} isLoading={isLoading} />
      
      {/* Paginacja */}
      {!isLoading && pagination.total > 0 && (
        <div className="mt-8 flex justify-center">
          <nav className="inline-flex rounded-md shadow">
            <button
              onClick={() => {
                if (page > 1) {
                  const url = new URL(window.location.href);
                  url.searchParams.set('page', (page - 1).toString());
                  window.location.href = url.toString();
                }
              }}
              disabled={page === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Poprzednia
            </button>
            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
              Strona {page} z {Math.ceil(pagination.total / pagination.limit)}
            </span>
            <button
              onClick={() => {
                if (pagination.hasMore) {
                  const url = new URL(window.location.href);
                  url.searchParams.set('page', (page + 1).toString());
                  window.location.href = url.toString();
                }
              }}
              disabled={!pagination.hasMore}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Następna
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
