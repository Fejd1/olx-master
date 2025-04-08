// frontend/src/lib/auth.ts

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Sprawdza, czy token JWT jest ważny
export function isTokenValid() {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Dekoduj token JWT (tylko część payload)
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    
    // Sprawdź, czy token nie wygasł
    const expiryTime = payload.exp * 1000; // konwersja z sekund na milisekundy
    return Date.now() < expiryTime;
  } catch (error) {
    console.error('Błąd podczas weryfikacji tokenu:', error);
    return false;
  }
}

// Hook do ochrony stron wymagających autoryzacji
export function useAuthProtection() {
  const router = useRouter();
  
  useEffect(() => {
    if (!isTokenValid()) {
      // Usuń nieważny token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Przekieruj do strony logowania
      router.push('/login');
    }
  }, [router]);
}

// Funkcja do wylogowania
export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  
  // Przekieruj do strony logowania (jeśli jesteśmy w przeglądarce)
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
