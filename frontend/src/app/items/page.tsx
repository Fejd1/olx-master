'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getItems } from '@/lib/api';
import { MonitoredItem } from '@/types';
import ItemsList from '@/components/items/ItemsList';
import { useAuthProtection } from '@/lib/auth';

export default function ItemsPage() {
    useAuthProtection();

    const [items, setItems] = useState<MonitoredItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                setIsLoading(true);
                const data = await getItems();
                setItems(data);
            } catch (err: any) {
                console.error('Błąd podczas pobierania przedmiotów:', err);
                setError(err.response?.data?.message || 'Wystąpił błąd podczas pobierania przedmiotów');
            } finally {
                setIsLoading(false);
            }
        };

        fetchItems();
    }, []);


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Monitorowane przedmioty</h1>
                <Link
                    href="/items/add"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Dodaj nowy przedmiot
                </Link>
            </div>


            {error && (
                <div className="bg-red-50 p-4 rounded-md text-red-700 mb-6">
                    <p className="font-medium">Wystąpił błąd</p>
                    <p>{error}</p>
                </div>
            )}

            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <ItemsList items={items} />
            )}
        </div>
    );
}
