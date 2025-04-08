// src/components/shared/Layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Sprawdź, czy użytkownik jest zalogowany
    const token = localStorage.getItem('token');
    
    // Jeśli nie jesteśmy na stronie logowania/rejestracji i nie ma tokenu, przekieruj do logowania
    if (!token && pathname !== '/login' && pathname !== '/register' && pathname !== '/') {
      router.push('/login');
    } else if (token && pathname === '/') {
      // Jeśli jest token i jesteśmy na stronie głównej, przekieruj do dashboardu
      router.push('/dashboard');
    }
    
    setIsLoading(false);
  }, [pathname, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
