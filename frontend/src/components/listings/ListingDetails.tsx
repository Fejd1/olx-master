// src/components/listings/ListingDetails.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Listing, PriceHistory } from '@/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ListingDetailsProps {
    listing: Listing;
    priceHistory: PriceHistory[];
}

export default function ListingDetails({ listing, priceHistory }: ListingDetailsProps) {
    const router = useRouter();
    const [showFullDescription, setShowFullDescription] = useState(false);

    // Przygotuj dane do wykresu cen
    const chartData = priceHistory.map(item => ({
        date: new Date(item.date).toLocaleDateString('pl-PL'),
        price: item.price
    }));

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Szczegóły ogłoszenia</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Informacje o ogłoszeniu z OLX</p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Powrót
                </button>
            </div>

            text
            <div className="border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-4">
                        {listing.image_url && (
                            <img
                                src={listing.image_url}
                                alt={listing.title}
                                className="w-full h-auto rounded-lg"
                            />
                        )}

                        <div className="mt-4">
                            <h2 className="text-xl font-bold text-gray-900">{listing.title}</h2>
                            <p className="text-2xl font-bold text-gray-900 mt-2">{listing.price} zł</p>
                            <p className="text-sm text-gray-500 mt-1">Lokalizacja: {listing.location}</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Stan: {listing.item_condition === 'new' ? 'Nowy' : 'Używany'}
                            </p>

                            <div className="mt-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${listing.profit_potential > 20 ? 'bg-green-100 text-green-800' :
                                        listing.profit_potential > 10 ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-gray-100 text-gray-800'
                                    }`}>
                                    Potencjalny zysk: {listing.profit_potential.toFixed(2)}%
                                </span>

                                <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${listing.authenticity_score > 0.7 ? 'bg-green-100 text-green-800' :
                                        listing.authenticity_score > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                    }`}>
                                    Wiarygodność: {(listing.authenticity_score * 100).toFixed(0)}%
                                </span>
                            </div>

                            <div className="mt-4">
                                <a
                                    href={listing.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    Zobacz na OLX
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Historia cen</h3>
                        {chartData.length > 1 ? (
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={chartData}
                                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Line type="monotone" dataKey="price" stroke="#8884d8" activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-gray-500">Brak historii cen dla tego ogłoszenia</p>
                        )}

                        <div className="mt-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Opis</h3>
                            {listing.description ? (
                                <>
                                    <div className={`text-gray-700 ${!showFullDescription && 'line-clamp-5'}`}>
                                        {listing.description}
                                    </div>
                                    {listing.description.length > 200 && (
                                        <button
                                            onClick={() => setShowFullDescription(!showFullDescription)}
                                            className="mt-2 text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                        >
                                            {showFullDescription ? 'Pokaż mniej' : 'Pokaż więcej'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <p className="text-gray-500">Brak opisu</p>
                            )}
                        </div>

                        <div className="mt-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Informacje dodatkowe</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">ID ogłoszenia OLX</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{listing.olx_id}</dd>
                                </div>
                                {listing.seller_id && (
                                    <div className="sm:col-span-1">
                                        <dt className="text-sm font-medium text-gray-500">ID sprzedającego</dt>
                                        <dd className="mt-1 text-sm text-gray-900">{listing.seller_id}</dd>
                                    </div>
                                )}
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Data dodania</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {new Date(listing.created_at).toLocaleDateString('pl-PL')}
                                    </dd>
                                </div>
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Ostatnia aktualizacja</dt>
                                    <dd className="mt-1 text-sm text-gray-900">
                                        {new Date(listing.updated_at).toLocaleDateString('pl-PL')}
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

