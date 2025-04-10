'use client';

import { useAuthProtection } from '@/lib/auth';
import ItemFormWithIframe from '@/components/items/ItemFormWithIFrame';

export default function AddItemPage() {
  useAuthProtection();
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dodaj nowy przedmiot do monitorowania</h1>
      <ItemFormWithIframe />
    </div>
  );
}
