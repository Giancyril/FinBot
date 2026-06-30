import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-indigo-300 font-bold">${Number(payload[0].value).toFixed(2)}</p>
    </div>
  );
};

export default function SpendingLineChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="h-full flex items-center justify-center text-gray-600 text-xs">No spending trend data for this period</div>
  );

  let cumulative = 0;
  const chartData = data.map(item => {
    cumulative += Number(item.daily_total);
    const d = new Date(item.date);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      cumulative: Number(cumulative.toFixed(2)),
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
        <defs>
          <linearGradient id="indigo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#818cf8" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis dataKey="date" stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#6b7280' }} />
        <YAxis stroke="#4b5563" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#6b7280' }} tickFormatter={(v) => `$${v}`} />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(129,140,248,0.3)', strokeWidth: 1 }} />
        <Area type="monotone" dataKey="cumulative" stroke="#818cf8" strokeWidth={2}
          fill="url(#indigo)" dot={false} activeDot={{ r: 4, fill: '#818cf8', stroke: '#1f2937', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
