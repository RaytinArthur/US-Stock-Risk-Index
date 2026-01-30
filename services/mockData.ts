
import { Indicator, RiskData } from '../types';

const generateHistory = (base: number, volatility: number, length: number = 30) => {
  return Array.from({ length }, (_, i) => ({
    date: new Date(Date.now() - (length - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    value: Number((base + (Math.random() - 0.5) * volatility).toFixed(2))
  }));
};

const mapToSubScore = (val: number, min: number, max: number, direction: 'higher_is_risky' | 'lower_is_risky'): number => {
  let score = ((val - min) / (max - min)) * 100;
  if (direction === 'lower_is_risky') {
    score = 100 - score;
  }
  return Math.min(100, Math.max(0, Math.round(score)));
};

export const getMockMarketData = (): RiskData => {
  const indicators: Indicator[] = [
    {
      id: 'vix',
      name: 'VIX (Fear Index)',
      category: 'Volatility',
      value: 18.42,
      unit: '',
      direction: 'higher_is_risky',
      description: 'CBOE Volatility Index tracking S&P 500 options implied volatility.',
      weight: 0.25,
      history: generateHistory(18, 5),
      subScore: 0, // calculated below
      explanation: 'High VIX indicates market expectation of large price swings and investor fear.'
    },
    {
      id: 'yield-curve',
      name: '10Y-2Y Yield Spread',
      category: 'Macro',
      value: -0.15,
      unit: '%',
      direction: 'lower_is_risky',
      description: 'The difference between 10-year and 2-year Treasury yields.',
      weight: 0.15,
      history: generateHistory(-0.1, 0.1),
      subScore: 0,
      explanation: 'Inversion (negative spread) historically precedes economic recessions.'
    },
    {
      id: 'hy-spread',
      name: 'High Yield OAS',
      category: 'Credit/Stress',
      value: 3.25,
      unit: '%',
      direction: 'higher_is_risky',
      description: 'Risk premium demanded for holding low-rated corporate debt.',
      weight: 0.20,
      history: generateHistory(3.1, 0.4),
      subScore: 0,
      explanation: 'Widening spreads indicate rising credit risk and tightening financial conditions.'
    },
    {
      id: 'pe-ratio',
      name: 'S&P 500 P/E Ratio',
      category: 'Valuation',
      value: 21.8,
      unit: 'x',
      direction: 'higher_is_risky',
      description: 'Current price divided by trailing 12-month earnings.',
      weight: 0.20,
      history: generateHistory(21, 1),
      subScore: 0,
      explanation: 'High valuation ratios relative to historical averages suggest a "stretched" market.'
    },
    {
      id: 'ted-spread',
      name: 'TED Spread',
      category: 'Liquidity',
      value: 0.22,
      unit: '%',
      direction: 'higher_is_risky',
      description: 'Difference between the interest rate on interbank loans and short-term US Treasury bills.',
      weight: 0.10,
      history: generateHistory(0.2, 0.05),
      subScore: 0,
      explanation: 'Increases in the TED spread signal a decrease in liquidity and higher counterparty risk.'
    },
    {
      id: 'put-call',
      name: 'Put/Call Ratio',
      category: 'Volatility',
      value: 0.95,
      unit: '',
      direction: 'higher_is_risky',
      description: 'Ratio of trading volume of put options to call options.',
      weight: 0.10,
      history: generateHistory(0.9, 0.2),
      subScore: 0,
      explanation: 'An extremely high ratio suggests panic, while extremely low suggests complacency.'
    }
  ];

  // Scoring logic
  const scoredIndicators = indicators.map(ind => {
    let subScore = 0;
    if (ind.id === 'vix') subScore = mapToSubScore(ind.value, 10, 35, 'higher_is_risky');
    if (ind.id === 'yield-curve') subScore = mapToSubScore(ind.value, -0.5, 2.0, 'lower_is_risky');
    if (ind.id === 'hy-spread') subScore = mapToSubScore(ind.value, 2.5, 6.0, 'higher_is_risky');
    if (ind.id === 'pe-ratio') subScore = mapToSubScore(ind.value, 15, 25, 'higher_is_risky');
    if (ind.id === 'ted-spread') subScore = mapToSubScore(ind.value, 0.1, 1.0, 'higher_is_risky');
    if (ind.id === 'put-call') subScore = mapToSubScore(ind.value, 0.5, 1.2, 'higher_is_risky');
    return { ...ind, subScore };
  });

  const totalScore = Math.round(scoredIndicators.reduce((acc, ind) => acc + (ind.subScore * ind.weight), 0));
  
  const contributions = scoredIndicators
    .map(ind => ({ id: ind.id, name: ind.name, impact: ind.subScore * ind.weight }))
    .sort((a, b) => b.impact - a.impact);

  // FIX: Added missing 'sources' property to return object
  return {
    totalScore,
    lastUpdated: new Date().toISOString(),
    indicators: scoredIndicators,
    contributions,
    sources: []
  };
};
