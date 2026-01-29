
import React from 'react';

interface RiskGaugeProps {
  score: number;
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ score }) => {
  const radius = 90;
  const stroke = 18;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Arc segments
  const segments = [
    { offset: 0, color: '#22c55e', width: 20 },
    { offset: 20, color: '#84cc16', width: 20 },
    { offset: 40, color: '#eab308', width: 20 },
    { offset: 60, color: '#f97316', width: 20 },
    { offset: 80, color: '#ef4444', width: 20 },
  ];

  const getPointerRotation = (s: number) => {
    // 0 is -90deg, 100 is 90deg (semicircle) 
    // Wait, let's do a full circle or standard 240 degree arc? 
    // Simple 240 deg arc is more professional.
    return (s / 100) * 240 - 120;
  };

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-[210deg]"
      >
        <circle
          stroke="#1e293b"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray="240 360"
          style={{ strokeDasharray: `${circumference} ${circumference}`, strokeDashoffset: circumference - (0.66 * circumference) }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#gradient)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ 
            strokeDashoffset: circumference - ((score * 0.66) / 100) * circumference,
            transition: 'stroke-dashoffset 1s ease-out'
          }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>

      {/* Needle */}
      <div 
        className="absolute w-1 h-32 origin-bottom transition-transform duration-1000 ease-out"
        style={{ transform: `rotate(${getPointerRotation(score)}deg) translateY(-40px)` }}
      >
        <div className="w-1 h-24 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
      </div>

      {/* Center Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
        <span className="text-5xl font-bold mono">{score}</span>
        <span className="text-slate-400 text-sm font-medium uppercase tracking-widest mt-1">/ 100</span>
      </div>
    </div>
  );
};

export default RiskGauge;
