import React from 'react';

interface RiskGaugeProps {
  score: number;
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ score }) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  const angle = -120 + (clampedScore / 100) * 240;

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      <svg viewBox="0 0 220 220" className="w-full h-full">
        <defs>
          <linearGradient id="riskArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="45%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="needleGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#ffffff" floodOpacity="0.6" />
          </filter>
        </defs>

        <path
          d="M 30 160 A 90 90 0 0 1 190 160"
          stroke="#1e293b"
          strokeWidth="16"
          fill="none"
          strokeLinecap="round"
        />

        <path
          d="M 30 160 A 90 90 0 0 1 190 160"
          stroke="url(#riskArcGradient)"
          strokeWidth="16"
          fill="none"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          strokeDashoffset={100 - clampedScore}
          style={{ transition: 'stroke-dashoffset 900ms ease-out' }}
        />

        {[0, 20, 40, 60, 80, 100].map((tick) => {
          const tickAngle = (-120 + (tick / 100) * 240) * (Math.PI / 180);
          const x1 = 110 + Math.cos(tickAngle) * 82;
          const y1 = 160 + Math.sin(tickAngle) * 82;
          const x2 = 110 + Math.cos(tickAngle) * 92;
          const y2 = 160 + Math.sin(tickAngle) * 92;
          const tx = 110 + Math.cos(tickAngle) * 106;
          const ty = 160 + Math.sin(tickAngle) * 106;

          return (
            <g key={tick}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#64748b" strokeWidth="1.5" />
              <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="9">
                {tick}
              </text>
            </g>
          );
        })}

        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: '110px 160px',
            transition: 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)'
          }}
          filter="url(#needleGlow)"
        >
          <polygon points="110,76 106,160 114,160" fill="#e2e8f0" />
          <circle cx="110" cy="160" r="5" fill="#e2e8f0" />
        </g>

        <circle cx="110" cy="160" r="8" fill="#0f172a" stroke="#475569" strokeWidth="2" />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
        <span className="text-5xl font-bold mono">{clampedScore}</span>
        <span className="text-slate-400 text-sm font-medium uppercase tracking-widest mt-1">/ 100</span>
      </div>
    </div>
  );
};

export default RiskGauge;
