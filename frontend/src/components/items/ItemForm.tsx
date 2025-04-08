// src/components/items/ItemForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

// Definicja struktury kategorii i filtrów
const categories = {
    "elektronika": {
        name: "Elektronika",
        subcategories: {
            "telefony": {
                name: "Telefony",
                subcategories: {
                    "smartfony-telefony-komorkowe": {
                        name: "Smartfony",
                        filters: ["brand", "model", "color", "memory"]
                    },
                    "akcesoria-gsm": {
                        name: "Akcesoria GSM",
                        filters: ["type"]
                    }
                }
            },
            "komputery": {
                name: "Komputery",
                subcategories: {
                    "laptopy": {
                        name: "Laptopy",
                        filters: ["brand", "processor", "ram", "disk"]
                    },
                    "komputery-stacjonarne": {
                        name: "Komputery stacjonarne",
                        filters: ["brand", "processor", "ram", "disk"]
                    }
                }
            }
        }
    },
    "motoryzacja": {
        name: "Motoryzacja",
        subcategories: {
            "samochody-osobowe": {
                name: "Samochody osobowe",
                filters: ["brand", "model", "year", "fuel", "mileage"]
            }
        }
    }
};

// Definicja filtrów
const filterComponents = {
    "brand": (register) => (
        <div>
            <label className="block text-sm font-medium text-gray-700">Marka</label>
            <select {...register('filters.brand')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                <option value="">Wszystkie</option>
                <option value="apple">Apple</option>
                <option value="samsung">Samsung</option>
                <option value="xiaomi">Xiaomi</option>
                <option value="huawei">Huawei</option>
            </select>
        </div>
    ),
    "model": (register) => (
        <div>
            <label className="block text-sm font-medium text-gray-700">Model</label>
            <input type="text" {...register('filters.model')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
        </div>
    ),
    // Pozostałe filtry...
};

export default function ItemForm({ item, isEditing = false }) {
    const router = useRouter();
    const [mainCategory, setMainCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [detailCategory, setDetailCategory] = useState('');
    const [availableFilters, setAvailableFilters] = useState([]);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
        defaultValues: item ? {
            name: item.name,
            min_price: item.min_price?.toString() || '',
            max_price: item.max_price?.toString() || '',
            location: item.location || '',
            item_condition: item.item_condition || 'any',
            // Rozdziel kategorię na części
            mainCategory: '',
            subCategory: '',
            detailCategory: '',
            filters: {}
        } : {
            name: '',
            min_price: '',
            max_price: '',
            location: '',
            item_condition: 'any',
            mainCategory: '',
            subCategory: '',
            detailCategory: '',
            filters: {}
        }
    });

    // Obserwuj zmiany kategorii
    const watchMainCategory = watch('mainCategory');
    const watchSubCategory = watch('subCategory');
    const watchDetailCategory = watch('detailCategory');

    // Aktualizuj dostępne podkategorie i filtry
    useEffect(() => {
        if (watchMainCategory) {
            setMainCategory(watchMainCategory);
            setSubCategory('');
            setDetailCategory('');
            setAvailableFilters([]);
        }
    }, [watchMainCategory]);

    useEffect(() => {
        if (watchMainCategory && watchSubCategory) {
            setSubCategory(watchSubCategory);
            setDetailCategory('');
            setAvailableFilters([]);
        }
    }, [watchSubCategory, watchMainCategory]);

    useEffect(() => {
        if (watchMainCategory && watchSubCategory && watchDetailCategory) {
            setDetailCategory(watchDetailCategory);

            // Ustaw dostępne filtry na podstawie wybranej kategorii
            const categoryPath = categories[watchMainCategory]?.subcategories[watchSubCategory]?.subcategories[watchDetailCategory];
            if (categoryPath && categoryPath.filters) {
                setAvailableFilters(categoryPath.filters);
            }
        }
    }, [watchDetailCategory, watchMainCategory, watchSubCategory]);

    // Funkcja do przesyłania formularza
    const onSubmit = async (data) => {
        try {
            // Przygotuj dane do wysłania
            const categoryPath = [];
            if (data.mainCategory) categoryPath.push(data.mainCategory);
            if (data.subCategory) categoryPath.push(data.subCategory);
            if (data.detailCategory) categoryPath.push(data.detailCategory);

            const itemData = {
                name: data.name,
                min_price: data.min_price ? parseFloat(data.min_price) : null,
                max_price: data.max_price ? parseFloat(data.max_price) : null,
                location: data.location,
                item_condition: data.item_condition,
                category: categoryPath.join('/'), // Połącz ścieżkę kategorii
                filters: data.filters
            };

            if (isEditing && item) {
                // Kod aktualizacji przedmiotu
            } else {
                // Kod dodawania nowego przedmiotu
            }

            router.push('/items');
        } catch (error) {
            console.error('Błąd:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Nazwa przedmiotu */}
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nazwa przedmiotu *
                </label>
                <input
                    id="name"
                    type="text"
                    {...register('name', { required: true })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">Nazwa przedmiotu jest wymagana</p>}
            </div>

            {/* Kategorie */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Główna kategoria</label>
                    <select
                        {...register('mainCategory')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    >
                        <option value="">Wybierz kategorię</option>
                        {Object.entries(categories).map(([key, category]) => (
                            <option key={key} value={key}>{category.name}</option>
                        ))}
                    </select>
                </div>

                {mainCategory && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Podkategoria</label>
                        <select
                            {...register('subCategory')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        >
                            <option value="">Wybierz podkategorię</option>
                            {Object.entries(categories[mainCategory]?.subcategories || {}).map(([key, subcategory]) => (
                                <option key={key} value={key}>{subcategory.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {mainCategory && subCategory && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Szczegółowa kategoria</label>
                        <select
                            {...register('detailCategory')}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        >
                            <option value="">Wybierz szczegółową kategorię</option>
                            {Object.entries(categories[mainCategory]?.subcategories[subCategory]?.subcategories || {}).map(([key, detailCategory]) => (
                                <option key={key} value={key}>{detailCategory.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Cena */}
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    />
                </div>
            </div>

            {/* Lokalizacja */}
            <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Lokalizacja
                </label>
                <input
                    id="location"
                    type="text"
                    {...register('location')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    placeholder="np. Warszawa, Kraków"
                />
            </div>

            {/* Stan przedmiotu */}
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

            {/* Dynamiczne filtry na podstawie wybranej kategorii */}
            {availableFilters.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-900">Dodatkowe filtry</h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availableFilters.map(filter => (
                            <div key={filter}>
                                {filterComponents[filter] && filterComponents[filter](register)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Przyciski */}
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
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    {isEditing ? 'Zapisz zmiany' : 'Dodaj przedmiot'}
                </button>
            </div>
        </form>
    );
}
