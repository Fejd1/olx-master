// src/components/notifications/NotificationItem.tsx
import { useState } from 'react';
import { Notification } from '@/types';
import { updateNotification } from '@/lib/api';

interface NotificationItemProps {
    notification: Notification;
    onUpdate: () => void;
}

export default function NotificationItem({ notification, onUpdate }: NotificationItemProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleMarkAsRead = async () => {
        try {
            setIsLoading(true);
            await updateNotification(notification.id, 'read');
            onUpdate();
        } catch (error) {
            console.error('Błąd podczas aktualizacji powiadomienia', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className={`p - 4 border-b ${notification.status !== 'read' ? 'bg-indigo-50' : ''}`}>
            <div className="flex items-start">
                {notification.listing_image ? (
                    <img src={notification.listing_image} alt="" className="h-12 w-12 object-cover rounded mr-4" />
                ) : (
                    <div className="h-12 w-12 bg-indigo-100 rounded flex items-center justify-center mr-4">
                        <span className="text-indigo-600 font-medium">OLX</span>
                    </div>
                )}


                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-gray-900">
                            {notification.listing_title || 'Nowe ogłoszenie'}
                        </h3>
                        <span className="text-xs text-gray-500">{formatDate(notification.created_at)}</span>
                    </div>

                    <p className="text-sm text-gray-600 mt-1">
                        Znaleziono nową okazję dla monitorowanego przedmiotu
                        {notification.listing_price && ` w cenie ${notification.listing_price} zł`}
                    </p>

                    <div className="mt-2 flex justify-between items-center">
                        {notification.listing_url ? (
                            <a
                                href={notification.listing_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:text-indigo-900 font-medium"
                            >
                                Zobacz ogłoszenie
                            </a>
                        ) : (
                            <span></span>
                        )}

                        {notification.status !== 'read' && (
                            <button
                                onClick={handleMarkAsRead}
                                disabled={isLoading}
                                className="text-xs text-gray-600 hover:text-gray-900 font-medium disabled:opacity-50"
                            >
                                {isLoading ? 'Aktualizacja...' : 'Oznacz jako przeczytane'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
</div >
);
}