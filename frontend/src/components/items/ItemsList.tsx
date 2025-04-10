// src/components/items/ItemsList.tsx (dokończenie)
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MonitoredItem } from '@/types';
import { deleteItem } from '@/lib/api';

interface ItemsListProps {
    items: MonitoredItem[];
}

export default function ItemsList({ items }: ItemsListProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async (id: number) => {
        try {
            setIsDeleting(true);
            setDeleteItemId(id);
            setError(null);
            await deleteItem(id);
            router.refresh();
        } catch (err: any) {
            setError('Wystąpił błąd podczas usuwania przedmiotu');
            console.error(err);
        } finally {
            setIsDeleting(false);
            setDeleteItemId(null);
        }
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-gray-500 mb-4">Nie masz jeszcze żadnych monitorowanych przedmiotów</p>
                <Link href="/items/add" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" >
                    Dodaj pierwszy przedmiot
                </Link>
            </div>
        );
    }

    return (
        <div>
            {error && (
                <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                    {error}
                </div>
            )}

            <div className="overflow-hidden bg-white shadow sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {items.map((item) => (
                        <li key={item.id}>
                            <div className="flex items-center justify-between px-4 py-4 sm:px-6">
                                <div className="flex flex-1 items-center">
                                    <div className="flex-shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <span className="text-indigo-600 font-medium">{item.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div className="ml-4">
                                        <div className="font-medium text-gray-900">{item.name}</div>
                                        <div className="text-sm text-gray-500">
                                            {item.category && <span className="mr-2">{item.category}</span>}
                                            {item.min_price && <span className="mr-2">Od: {item.min_price} zł</span>}
                                            {item.max_price && <span className="mr-2">Do: {item.max_price} zł</span>}
                                            {item.location && <span className="mr-2">Lokalizacja: {item.location}</span>}
                                            <span>Stan: {
                                                item.item_condition === 'new' ? 'Nowy' :
                                                    item.item_condition === 'used' ? 'Używany' : 'Dowolny'
                                            }</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <Link
                                        href={`/items/${item.id}/listings`}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Ogłoszenia
                                    </Link>
                                    <Link
                                        href={`/items/${item.id}/edit`}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                    >
                                        Edytuj
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        disabled={isDeleting && deleteItemId === item.id}
                                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-5 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                    >
                                        {isDeleting && deleteItemId === item.id ? 'Usuwanie...' : 'Usuń'}
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}