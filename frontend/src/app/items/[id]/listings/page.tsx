'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getItem, getItemListings } from '@/lib/api';
import { MonitoredItem, Listing } from '@/types';
import ListingsGrid from '@/components/listings/ListingGrid';
import { useAuthProtection } from '@/lib/auth';

export default function ItemListingsPage() {
    useAuthProtection();
    const params = useParams();
    const router = useRouter();
    const [item, setItem] = useState<MonitoredItem | null>(null);
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (!params.id) {
                    router.push('/items');
                    return;
                }

                setIsLoading(true);
                const itemId = parseInt(params.id as string);

                // Pobierz dane przedmiotu
                const itemData = await getItem(itemId);
                setItem(itemData);

                // Pobierz ogłoszenia dla przedmiotu
                const listingsData = await getItemListings(itemId);
                setListings(listingsData);
            } catch (err: any) {
                console.error('Błąd podczas pobierania danych:', err);
                setError(err.response?.data?.message || 'Wystąpił błąd podczas pobierania danych');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [params.id, router]);

    const handleRefresh = async () => {
        try {
            setIsLoading(true);

            // Wywołaj endpoint do ręcznego uruchomienia scrapera
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/scraper/trigger`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const result = await response.json();

            if (result.success) {
                // Pobierz zaktualizowane dane
                const itemId = parseInt(params.id as string);
                const listingsData = await getItemListings(itemId);
                setListings(listingsData);
                alert('Scraper uruchomiony pomyślnie. Odświeżono dane.');
            } else {
                alert(`Błąd: ${result.message}`);
            }
        } catch (error) {
            console.error('Błąd podczas odświeżania:', error);
            alert('Wystąpił błąd podczas odświeżania danych');
        } finally {
            setIsLoading(false);
        }
    };

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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                    <h1 className="text-2xl text-gray-700 font-bold">Ogłoszenia dla: {item.name}</h1>
                    <p className="text-gray-500 mt-1">
                        {item.category && <span className="mr-2">{item.category}</span>}
                        {item.min_price && <span className="mr-2">Od: {item.min_price} zł</span>}
                        {item.max_price && <span className="mr-2">Do: {item.max_price} zł</span>}
                        {item.location && <span className="mr-2">Lokalizacja: {item.location}</span>}
                        <span>Stan: {
                            item.item_condition === 'new' ? 'Nowy' :
                                item.item_condition === 'used' ? 'Używany' : 'Dowolny'
                        }</span>
                    </p>
                </div>
                <div className="mt-4 md:mt-0 flex space-x-3">
                    <Link
                        href={`/items/${item.id}/edit`}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Edytuj przedmiot
                    </Link>
                    <Link
                        href="/items"
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Wróć do listy
                    </Link>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-6">
                <div className="flex items-center">
                    <div className="flex-shrink-0">
                        <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <h3 className="text-sm font-medium text-gray-900">Automatyczne monitorowanie</h3>
                        <p className="text-sm text-gray-500">
                            System sprawdza nowe ogłoszenia co 30 minut. Ostatnie sprawdzenie: {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                    <div className="ml-auto">
                        <button
                            onClick={handleRefresh}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Odśwież teraz
                        </button>
                    </div>
                </div>
            </div>

            <ListingsGrid listings={listings} isLoading={isLoading} />

            {!isLoading && listings.length === 0 && (
                <div className="text-center py-10 bg-white rounded-lg shadow">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Brak ogłoszeń</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Nie znaleziono jeszcze żadnych ogłoszeń dla tego przedmiotu. System sprawdza nowe ogłoszenia co 30 minut.
                    </p>
                </div>
            )}
        </div>
    );
}
