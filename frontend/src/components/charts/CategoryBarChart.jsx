import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#818cf8', '#a78bfa', '#34d399', '#f59e0b', '#f87171', '#22d3ee', '#ec4899', '#60a5fa'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-white font-bold">${Number(payload[0].value).toFixed(2)}</p>
    </div>
  );
};

export default function CategoryBarChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="h-full flex items-center justify-center text-gray-600 text-xs">No spending data for this period</div>
  );

  const chartData = data.map(item => ({ name: item.category, amount: Number(item.total) }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="name" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false}
          tick={{ fill: '#6b7280' }} />
        <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false}
          tick={{ fill: '#6b7280' }} tickFormatter={(v) => `$${v}`} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
