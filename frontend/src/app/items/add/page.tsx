'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ItemForm from '@/components/items/ItemForm';
import { useAuthProtection } from '@/lib/auth';

export default function AddItemPage() {
  useAuthProtection(); // Ochrona strony przed nieautoryzowanym dostępem
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dodaj nowy przedmiot do monitorowania</h1>
      <ItemForm />
    </div>
  );
}
