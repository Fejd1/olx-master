// src/components/listings/ListingCard.tsx
import Link from 'next/link';
import { Listing } from '@/types';

interface ListingCardProps {
    listing: Listing;
}

export default function ListingCard({ listing }: ListingCardProps) {
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="relative pb-[56.25%]">
                <img
                    src={listing.image_url || '/placeholder.png'}
                    alt={listing.title}
                    className="absolute h-full w-full object-cover"
                />
            </div>
            <div className="p-4">
                <h3 className="font-medium text-gray-900 truncate">{listing.title}</h3>
                <p className="text-lg font-bold text-gray-900 mt-1">{listing.price} zł</p>
                <p className="text-sm text-gray-500 mt-1">{listing.location}</p>

                <div className="mt-2 flex items-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${listing.profit_potential > 20 ? 'bg-green-100 text-green-800' :
                            listing.profit_potential > 10 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                        }`}>
                        Potencjalny zysk: {listing.profit_potential.toFixed(2)}%
                    </span>
                </div>

                <div className="mt-4 flex justify-between">
                    <Link
                        href={`/listings/${listing.id}`}
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                        Szczegóły
                    </Link>
                    <a
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                    >
                        Zobacz na OLX
                    </a>
                </div>
            </div>
        </div>
    );
}