'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getListing } from '@/lib/api';
import { Listing, PriceHistory } from '@/types';
import ListingDetails from '@/components/listings/ListingDetails';
import { useAuthProtection } from '@/lib/auth';

export default function ListingDetailsPage() {
  useAuthProtection();
  const params = useParams();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        if (!params.id) {
          router.push('/listings');
          return;
        }

        setIsLoading(true);
        const listingId = parseInt(params.id as string);
        const data = await getListing(listingId);
        setListing(data.listing);
        setPriceHistory(data.priceHistory || []);
      } catch (err: any) {
        console.error('Błąd podczas pobierania ogłoszenia:', err);
        setError(err.response?.data?.message || 'Wystąpił błąd podczas pobierania ogłoszenia');
      } finally {
        setIsLoading(false);
      }
    };

    fetchListing();
  }, [params.id, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-700">
        <p className="font-medium">Wystąpił błąd</p>
        <p>{error}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Wróć
        </button>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Nie znaleziono ogłoszenia</p>
        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Wróć
        </button>
      </div>
    );
  }

  return <ListingDetails listing={listing} priceHistory={priceHistory} />;
}
