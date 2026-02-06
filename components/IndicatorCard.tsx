import React from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis } from 'recharts';
import { Indicator } from '../types';
import { RISK_THRESHOLDS } from '../constants';

interface IndicatorCardProps {
  indicator: Indicator;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({ indicator }) => {
  const getRiskColor = (score: number) => {
    const threshold = RISK_THRESHOLDS.find(t => score >= t.min && score <= t.max);
    return threshold ? threshold.color : '#94a3b8';
  };

  const formatTickDate = (value: string) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-500 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-slate-200 font-semibold text-lg">{indicator.name}</h3>
          <p className="text-slate-400 text-xs uppercase tracking-wider">{indicator.category}</p>
        </div>
        <div
          className="px-2.5 py-1 rounded-full text-xs font-bold"
          style={{ backgroundColor: `${getRiskColor(indicator.subScore)}33`, color: getRiskColor(indicator.subScore) }}
        >
          Score: {indicator.subScore}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold mono tracking-tighter">
          {indicator.value}{indicator.unit}
        </span>
        <span className="text-slate-500 text-sm">current</span>
      </div>

      <div className="h-24 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={indicator.history}>
            <defs>
              <linearGradient id={`color-${indicator.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={getRiskColor(indicator.subScore)} stopOpacity={0.3} />
                <stop offset="95%" stopColor={getRiskColor(indicator.subScore)} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={['auto', 'auto']} />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              minTickGap={24}
              interval="preserveStartEnd"
              tickFormatter={formatTickDate}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={getRiskColor(indicator.subScore)}
              fillOpacity={1}
              fill={`url(#color-${indicator.id})`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="text-slate-400 text-sm line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
        {indicator.explanation}
      </div>
    </div>
  );
};

export default IndicatorCard;
