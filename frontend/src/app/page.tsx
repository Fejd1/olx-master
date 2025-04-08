'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isTokenValid } from '@/lib/auth';

export default function HomePage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Sprawdź, czy użytkownik jest zalogowany
    const loggedIn = isTokenValid();
    setIsLoggedIn(loggedIn);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-200 to-indigo-800 opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>
        
        <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              OLX Monitor
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Automatycznie monitoruj i analizuj okazje na platformie OLX. Znajdź najlepsze oferty i zwiększ swoje zyski.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Przejdź do dashboardu
                  </Link>
                  <Link
                    href="/items"
                    className="text-sm font-semibold leading-6 text-gray-900"
                  >
                    Monitorowane przedmioty <span aria-hidden="true">→</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Zaloguj się
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm font-semibold leading-6 text-gray-900"
                  >
                    Zarejestruj się <span aria-hidden="true">→</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
          <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-indigo-200 to-indigo-800 opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"></div>
        </div>
      </div>
      
      {/* Sekcja funkcji */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-indigo-600">Monitoruj okazje</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Wszystko, czego potrzebujesz do znajdowania najlepszych ofert
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              OLX Monitor automatycznie przeszukuje platformę OLX, analizuje ceny i pomaga Ci znaleźć najlepsze okazje.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16">
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </div>
                  Automatyczne wyszukiwanie
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  System automatycznie przeszukuje OLX co 30 minut, aby znaleźć nowe ogłoszenia pasujące do Twoich kryteriów.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75h-.75m-6-1.5H2.25m19.5 0v.75c0 .414-.336.75-.75.75h-.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75h-.75" />
                    </svg>
                  </div>
                  Analiza potencjału zysku
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Zaawansowane algorytmy analizują ceny rynkowe i obliczają potencjalny zysk dla każdego ogłoszenia.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                  </div>
                  Powiadomienia o okazjach
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Otrzymuj natychmiastowe powiadomienia o nowych okazjach przez email, push lub SMS.
                </dd>
              </div>
              <div className="relative pl-16">
                <dt className="text-base font-semibold leading-7 text-gray-900">
                  <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                    </svg>
                  </div>
                  Statystyki i trendy
                </dt>
                <dd className="mt-2 text-base leading-7 text-gray-600">
                  Analizuj trendy cenowe i statystyki, aby podejmować lepsze decyzje zakupowe.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
