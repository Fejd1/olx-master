// src/components/items/ItemFormWithUrlInput.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MonitoredItem } from '@/types';
import { createItem, updateItem } from '@/lib/api';

interface ItemFormWithUrlInputProps {
  item?: MonitoredItem;
  isEditing?: boolean;
}

export default function ItemFormWithUrlInput({ item, isEditing = false }: ItemFormWithUrlInputProps) {
  const router = useRouter();
  const [name, setName] = useState(item?.name || '');
  const [olxUrl, setOlxUrl] = useState(item?.olx_url || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

// Funkcja do zapisywania przedmiotu
const handleSave = async () => {
    try {
      if (!name.trim()) {
        setError('Nazwa przedmiotu jest wymagana');
        return;
      }
  
      if (!olxUrl.trim() || !olxUrl.startsWith('https://www.olx.pl/')) {
        setError('Prawidłowy URL z OLX jest wymagany');
        return;
      }
  
      setIsLoading(true);
      setError('');
  
      const itemData = {
        name,
        olx_url: olxUrl
      };
  
      let response;
      if (isEditing && item) {
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/items/${item.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(itemData)
        });
      } else {
        response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(itemData)
        });
      }
  
      const data = await response.json();
      
      if (data.success) {
        router.push('/items');
      } else {
        setError(data.message || 'Wystąpił błąd podczas zapisywania przedmiotu');
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd podczas zapisywania przedmiotu');
    } finally {
      setIsLoading(false);
    }
  };
  

  const openOlxInNewTab = () => {
    window.open('https://www.olx.pl/', '_blank');
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        {isEditing ? 'Edytuj przedmiot' : 'Dodaj nowy przedmiot do monitorowania'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Nazwa przedmiotu *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>

        <div>
          <div className="flex justify-between items-center">
            <label htmlFor="olxUrl" className="block text-sm font-medium text-gray-700">
              URL z filtrami OLX *
            </label>
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              {showInstructions ? 'Ukryj instrukcje' : 'Pokaż instrukcje'}
            </button>
          </div>
          <input
            id="olxUrl"
            type="text"
            value={olxUrl}
            onChange={(e) => setOlxUrl(e.target.value)}
            placeholder="https://www.olx.pl/oferty/q-nazwa-przedmiotu/?search[...]"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
          />
        </div>

        {showInstructions && (
          <div className="p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Jak uzyskać URL z filtrami OLX:</h3>
            <ol className="list-decimal pl-5 text-sm text-blue-700 space-y-1">
              <li>Kliknij przycisk "Otwórz OLX w nowej karcie"</li>
              <li>W nowej karcie wyszukaj interesujący Cię przedmiot</li>
              <li>Ustaw wszystkie filtry według swoich preferencji (kategoria, cena, lokalizacja, itp.)</li>
              <li>Skopiuj cały adres URL z paska adresu przeglądarki</li>
              <li>Wróć do tej strony i wklej URL w pole powyżej</li>
            </ol>
            <div className="mt-3">
              <button
                type="button"
                onClick={openOlxInNewTab}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Otwórz OLX w nowej karcie
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
          >
            {isLoading ? 'Zapisywanie...' : 'Zapisz'}
          </button>
        </div>
      </div>
    </div>
  );
}
