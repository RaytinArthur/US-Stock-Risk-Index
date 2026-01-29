
import { GoogleGenAI } from "@google/genai";
import { RiskData, Indicator } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const MOCK_HISTORY = (val: number) => Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  value: Number((val * (0.95 + Math.random() * 0.1)).toFixed(2))
}));

export const fetchRealMarketData = async (): Promise<RiskData> => {
  if (!ai) {
    return buildFallbackData("Missing Gemini API key. Using cached baseline metrics.");
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Retrieve the most recent values for these 6 US market indicators. 
    Return ONLY a JSON-like structure (but as plain text) with these fields:
    1. VIX Index
    2. 10-Year minus 2-Year Treasury Yield Spread (T10Y2Y)
    3. ICE BofA US High Yield Index Option-Adjusted Spread (OAS)
    4. S&P 500 Forward P/E Ratio
    5. CBOE Equity Put/Call Ratio
    6. TED Spread
    
    Format your response like this exactly for parsing:
    VIX: [value]
    T10Y2Y: [value]
    HY_OAS: [value]
    PE_RATIO: [value]
    PUT_CALL: [value]
    TED: [value]`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text;
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.map((chunk: any) => ({
      title: chunk.web?.title || "Market Source",
      uri: chunk.web?.uri || "#"
    })) || [];

  // Parsing helper
  const extract = (key: string, fallback: number) => {
    const match = text.match(new RegExp(`${key}:\\s*(-?\\d+\\.?\\d*)`));
    return match ? parseFloat(match[1]) : fallback;
  };

  const values = {
    vix: extract('VIX', 15.5),
    t10y2y: extract('T10Y2Y', 0.1),
    hy_oas: extract('HY_OAS', 3.2),
    pe: extract('PE_RATIO', 21.5),
    pc: extract('PUT_CALL', 0.8),
    ted: extract('TED', 0.2)
  };

  const mapToSubScore = (val: number, min: number, max: number, direction: 'higher_is_risky' | 'lower_is_risky'): number => {
    let score = ((val - min) / (max - min)) * 100;
    if (direction === 'lower_is_risky') score = 100 - score;
    return Math.min(100, Math.max(0, Math.round(score)));
  };

  const indicators: Indicator[] = [
    {
      id: 'vix',
      name: 'VIX (Fear Index)',
      category: 'Volatility',
      value: values.vix,
      unit: '',
      direction: 'higher_is_risky',
      description: 'Market expectation of 30-day forward volatility.',
      weight: 0.25,
      history: MOCK_HISTORY(values.vix),
      subScore: mapToSubScore(values.vix, 12, 35, 'higher_is_risky'),
      explanation: 'VIX measures the cost of S&P 500 options. Higher values signal investor fear.'
    },
    {
      id: 'yield-curve',
      name: '10Y-2Y Yield Spread',
      category: 'Macro',
      value: values.t10y2y,
      unit: '%',
      direction: 'lower_is_risky',
      description: 'Difference between long and short term yields.',
      weight: 0.15,
      history: MOCK_HISTORY(values.t10y2y),
      subScore: mapToSubScore(values.t10y2y, -0.5, 1.5, 'lower_is_risky'),
      explanation: 'Inverted yield curves (negative) are classic recession precursors.'
    },
    {
      id: 'hy-spread',
      name: 'High Yield OAS',
      category: 'Credit/Stress',
      value: values.hy_oas,
      unit: '%',
      direction: 'higher_is_risky',
      description: 'Risk premium on "junk" bonds.',
      weight: 0.20,
      history: MOCK_HISTORY(values.hy_oas),
      subScore: mapToSubScore(values.hy_oas, 2.8, 6.5, 'higher_is_risky'),
      explanation: 'Widening credit spreads indicate tightening financial conditions and default risk.'
    },
    {
      id: 'pe-ratio',
      name: 'Forward P/E Ratio',
      category: 'Valuation',
      value: values.pe,
      unit: 'x',
      direction: 'higher_is_risky',
      description: 'Price relative to next 12m earnings.',
      weight: 0.20,
      history: MOCK_HISTORY(values.pe),
      subScore: mapToSubScore(values.pe, 15, 26, 'higher_is_risky'),
      explanation: 'Valuations above 20x are historically high for the S&P 500.'
    },
    {
      id: 'put-call',
      name: 'Put/Call Ratio',
      category: 'Volatility',
      value: values.pc,
      unit: '',
      direction: 'higher_is_risky',
      description: 'Options volume ratio.',
      weight: 0.10,
      history: MOCK_HISTORY(values.pc),
      subScore: mapToSubScore(values.pc, 0.6, 1.2, 'higher_is_risky'),
      explanation: 'A high ratio shows bearish sentiment; an extremely low ratio suggests bubble territory.'
    },
    {
      id: 'ted-spread',
      name: 'TED Spread',
      category: 'Liquidity',
      value: values.ted,
      unit: '%',
      direction: 'higher_is_risky',
      description: 'Interbank credit risk measure.',
      weight: 0.10,
      history: MOCK_HISTORY(values.ted),
      subScore: mapToSubScore(values.ted, 0.1, 0.8, 'higher_is_risky'),
      explanation: 'Spikes in TED spread signal liquidity stress in the banking sector.'
    }
  ];

  return buildRiskPayload(indicators, sources);
};

const buildRiskPayload = (indicators: Indicator[], sources: { title: string; uri: string }[]): RiskData => {
  const totalScore = Math.round(indicators.reduce((acc, ind) => acc + (ind.subScore * ind.weight), 0));
  const contributions = indicators
    .map(ind => ({ id: ind.id, name: ind.name, impact: ind.subScore * ind.weight }))
    .sort((a, b) => b.impact - a.impact);

  return {
    totalScore,
    lastUpdated: new Date().toISOString(),
    indicators,
    contributions,
    sources
  };
};

const buildFallbackData = (note: string): RiskData => {
  const indicators: Indicator[] = [
    {
      id: 'vix',
      name: 'VIX (Fear Index)',
      category: 'Volatility',
      value: 16.2,
      unit: '',
      direction: 'higher_is_risky',
      description: 'Market expectation of 30-day forward volatility.',
      weight: 0.25,
      history: MOCK_HISTORY(16.2),
      subScore: 20,
      explanation: 'Fallback data when live metrics are unavailable.'
    },
    {
      id: 'yield-curve',
      name: '10Y-2Y Yield Spread',
      category: 'Macro',
      value: 0.2,
      unit: '%',
      direction: 'lower_is_risky',
      description: 'Difference between long and short term yields.',
      weight: 0.15,
      history: MOCK_HISTORY(0.2),
      subScore: 50,
      explanation: 'Fallback data when live metrics are unavailable.'
    },
    {
      id: 'hy-spread',
      name: 'High Yield OAS',
      category: 'Credit/Stress',
      value: 3.5,
      unit: '%',
      direction: 'higher_is_risky',
      description: 'Risk premium on "junk" bonds.',
      weight: 0.20,
      history: MOCK_HISTORY(3.5),
      subScore: 30,
      explanation: 'Fallback data when live metrics are unavailable.'
    },
    {
      id: 'pe-ratio',
      name: 'Forward P/E Ratio',
      category: 'Valuation',
      value: 20.8,
      unit: 'x',
      direction: 'higher_is_risky',
      description: 'Price relative to next 12m earnings.',
      weight: 0.20,
      history: MOCK_HISTORY(20.8),
      subScore: 55,
      explanation: 'Fallback data when live metrics are unavailable.'
    },
    {
      id: 'put-call',
      name: 'Put/Call Ratio',
      category: 'Volatility',
      value: 0.9,
      unit: '',
      direction: 'higher_is_risky',
      description: 'Options volume ratio.',
      weight: 0.10,
      history: MOCK_HISTORY(0.9),
      subScore: 45,
      explanation: 'Fallback data when live metrics are unavailable.'
    },
    {
      id: 'ted-spread',
      name: 'TED Spread',
      category: 'Liquidity',
      value: 0.25,
      unit: '%',
      direction: 'higher_is_risky',
      description: 'Interbank credit risk measure.',
      weight: 0.10,
      history: MOCK_HISTORY(0.25),
      subScore: 35,
      explanation: 'Fallback data when live metrics are unavailable.'
    }
  ];

  return {
    ...buildRiskPayload(indicators, []),
    sources: [
      {
        title: note,
        uri: 'https://vercel.com/docs/projects/environment-variables'
      }
    ]
  };
};
