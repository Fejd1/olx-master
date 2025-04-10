// src/app/items/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getItem } from '@/lib/api';
import { MonitoredItem } from '@/types';
import ItemFormWithUrlInput from '@/components/items/ItemFormWithIFrame';
import { useAuthProtection } from '@/lib/auth';

export default function EditItemPage() {
  useAuthProtection();
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<MonitoredItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        if (!params.id) {
          router.push('/items');
          return;
        }

        setIsLoading(true);
        const itemId = parseInt(params.id as string);
        const data = await getItem(itemId);
        setItem(data);
      } catch (err: any) {
        console.error('Błąd podczas pobierania przedmiotu:', err);
        setError(err.response?.data?.message || 'Wystąpił błąd podczas pobierania przedmiotu');
      } finally {
        setIsLoading(false);
      }
    };

    fetchItem();
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
          onClick={() => router.push('/items')}
          className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Wróć do listy przedmiotów
        </button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">Nie znaleziono przedmiotu</p>
        <button
          onClick={() => router.push('/items')}
          className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Wróć do listy przedmiotów
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Edytuj przedmiot</h1>
      <ItemFormWithUrlInput item={item} isEditing={true} />
    </div>
  );
}
