import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SpendingLineChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
        No spending trend data for this period
      </div>
    );
  }

  // Map and calculate cumulative spending to show a smooth rising line over the month
  let cumulative = 0;
  const chartData = data.map((item) => {
    cumulative += Number(item.daily_total);
    const dateObj = new Date(item.date);
    return {
      dateStr: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      daily: Number(item.daily_total),
      cumulative: Number(cumulative.toFixed(2)),
    };
  });

  const formatValue = (value) => `$${Number(value).toFixed(2)}`;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={chartData}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="dateStr"
          stroke="#94a3b8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#94a3b8"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          formatter={formatValue}
          contentStyle={{
            backgroundColor: '#1b1e2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#f8fafc',
            fontFamily: 'inherit',
            fontSize: '12px',
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          name="Cumulative Spend"
          stroke="#6366f1"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorCumulative)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
