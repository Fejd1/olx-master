// frontend/src/app/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthProtection } from '@/lib/auth';

// Schemat formularza ustawień
interface SettingsFormData {
    email_notifications: boolean;
    push_notifications: boolean;
    sms_notifications: boolean;
    min_profit_threshold: string; // Zmiana z number na string
}

export default function SettingsPage() {
    useAuthProtection(); // Ochrona strony przed nieautoryzowanym dostępem

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SettingsFormData>({
        defaultValues: {
            email_notifications: true,
            push_notifications: false,
            sms_notifications: false,
            min_profit_threshold: '10', // Zmiana z 10 na '10'
        },
    });

    // Pobierz ustawienia użytkownika
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/settings`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                });

                if (!response.ok) {
                    throw new Error('Nie udało się pobrać ustawień');
                }

                const data = await response.json();

                if (data.success && data.settings) {
                    reset({
                        email_notifications: data.settings.email_notifications,
                        push_notifications: data.settings.push_notifications,
                        sms_notifications: data.settings.sms_notifications,
                        min_profit_threshold: data.settings.min_profit_threshold.toString(), // Konwersja na string
                    });
                }
            } catch (err) {
                console.error('Błąd podczas pobierania ustawień:', err);
                setError('Nie udało się pobrać ustawień. Używam ustawień domyślnych.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [reset]);

    // Zapisz ustawienia
    const onSubmit = async (data: SettingsFormData) => {
        try {
            setIsSaving(true);
            setError(null);
            setSuccess(null);

            // Konwersja min_profit_threshold na liczbę
            const settingsData = {
                ...data,
                min_profit_threshold: parseFloat(data.min_profit_threshold),
            };

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify(settingsData),
            });

            // Reszta kodu pozostaje bez zmian
        } catch (err) {
            // ...
        }
    };


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Ustawienia</h1>

            <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Ustawienia powiadomień</h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium mb-2">Kanały powiadomień</h3>
                        <div className="space-y-3">
                            <div className="flex items-center">
                                <input
                                    id="email_notifications"
                                    type="checkbox"
                                    {...register('email_notifications')}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="email_notifications" className="ml-2 block text-sm text-gray-900">
                                    Powiadomienia e-mail
                                </label>
                            </div>

                            <div className="flex items-center">
                                <input
                                    id="push_notifications"
                                    type="checkbox"
                                    {...register('push_notifications')}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="push_notifications" className="ml-2 block text-sm text-gray-900">
                                    Powiadomienia push
                                </label>
                            </div>

                            <div className="flex items-center">
                                <input
                                    id="sms_notifications"
                                    type="checkbox"
                                    {...register('sms_notifications')}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label htmlFor="sms_notifications" className="ml-2 block text-sm text-gray-900">
                                    Powiadomienia SMS
                                </label>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="min_profit_threshold" className="block text-sm font-medium text-gray-700">
                            Minimalny próg potencjału zysku (%)
                        </label>
                        <div className="mt-1">
                            <input
                                id="min_profit_threshold"
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                {...register('min_profit_threshold')}
                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            />
                            {errors.min_profit_threshold && (
                                <p className="mt-1 text-sm text-red-600">{errors.min_profit_threshold.message}</p>
                            )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                            Otrzymasz powiadomienia tylko dla ogłoszeń z potencjałem zysku powyżej tej wartości
                        </p>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                        >
                            {isSaving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
