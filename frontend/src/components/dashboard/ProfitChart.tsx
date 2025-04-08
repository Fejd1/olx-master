// src/components/dashboard/ProfitChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ItemStat } from '@/types';

interface ProfitChartProps {
  itemStats: ItemStat[];
}

export default function ProfitChart({ itemStats }: ProfitChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Przygotuj dane do wykresu
    const data = itemStats.map(item => ({
      name: item.name,
      avgProfit: parseFloat(item.avg_profit_potential.toFixed(2)),
      maxProfit: parseFloat(item.max_profit_potential.toFixed(2)),
    }));

    setChartData(data);
  }, [itemStats]);

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Potencjał zysku według przedmiotu</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgProfit" name="Średni potencjał zysku (%)" fill="#8884d8" />
            <Bar dataKey="maxProfit" name="Maksymalny potencjał zysku (%)" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
