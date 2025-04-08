// src/components/items/ItemForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { MonitoredItem } from '@/types';
import { createItem, updateItem } from '@/lib/api';

const itemSchema = z.object({
    name: z.string().min(3, 'Nazwa przedmiotu musi mieć co najmniej 3 znaki'),
    category: z.string().optional(),
    min_price: z.string().optional().transform(val => val ? parseFloat(val) : null),
    max_price: z.string().optional().transform(val => val ? parseFloat(val) : null),
    location: z.string().optional(),
    item_condition: z.enum(['new', 'used', 'any']),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormProps {
    item?: MonitoredItem;
    isEditing?: boolean;
}

export default function ItemForm({ item, isEditing = false }: ItemFormProps) {
    const router = useRouter();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ItemFormData>({
        resolver: zodResolver(itemSchema),
        defaultValues: item ? {
            name: item.name,
            category: item.category,
            min_price: item.min_price?.toString(),
            max_price: item.max_price?.toString(),
            location: item.location || '',
            item_condition: item.item_condition,
        } : {
            item_condition: 'any',
        },
    });

    const onSubmit = async (data: ItemFormData) => {
        try {
            setIsLoading(true);
            setError('');

            if (isEditing && item) {
                await updateItem(item.id, data);
            } else {
                await createItem(data);
            }

            router.push('/items');
            router.refresh();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Wystąpił błąd podczas zapisywania przedmiotu');
        } finally {
            setIsLoading(false);
        }
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Nazwa przedmiotu *
                    </label>
                    <input
                        id="name"
                        type="text"
                        {...register('name')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.name && (
                        <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                        Kategoria
                    </label>
                    <input
                        id="category"
                        type="text"
                        {...register('category')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="min_price" className="block text-sm font-medium text-gray-700">
                            Minimalna cena (zł)
                        </label>
                        <input
                            id="min_price"
                            type="number"
                            step="0.01"
                            min="0"
                            {...register('min_price')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="max_price" className="block text-sm font-medium text-gray-700">
                            Maksymalna cena (zł)
                        </label>
                        <input
                            id="max_price"
                            type="number"
                            step="0.01"
                            min="0"
                            {...register('max_price')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                        Lokalizacja
                    </label>
                    <input
                        id="location"
                        type="text"
                        {...register('location')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Stan przedmiotu
                    </label>
                    <div className="mt-2 space-y-2">
                        <div className="flex items-center">
                            <input
                                id="condition-any"
                                type="radio"
                                value="any"
                                {...register('item_condition')}
                                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="condition-any" className="ml-2 block text-sm text-gray-700">
                                Dowolny
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                id="condition-new"
                                type="radio"
                                value="new"
                                {...register('item_condition')}
                                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="condition-new" className="ml-2 block text-sm text-gray-700">
                                Nowy
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                id="condition-used"
                                type="radio"
                                value="used"
                                {...register('item_condition')}
                                className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="condition-used" className="ml-2 block text-sm text-gray-700">
                                Używany
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Anuluj
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                    >
                        {isLoading ? 'Zapisywanie...' : isEditing ? 'Zapisz zmiany' : 'Dodaj przedmiot'}
                    </button>
                </div>
            </form>
        </div>
    );
}
