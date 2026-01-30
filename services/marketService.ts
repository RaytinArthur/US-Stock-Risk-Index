
import { RiskData, Indicator } from "../types";

const fredApiKey = import.meta.env.VITE_FRED_API_KEY;

const MOCK_HISTORY = (val: number) => Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  value: Number((val * (0.95 + Math.random() * 0.1)).toFixed(2))
}));

export const fetchRealMarketData = async (): Promise<RiskData> => {
  const seriesConfigs = [
    { key: 'vix', seriesId: 'VIXCLS', label: 'CBOE Volatility Index (VIX)', fallback: 16.2 },
    { key: 't10y2y', seriesId: 'T10Y2Y', label: '10-Year minus 2-Year Treasury Yield Spread', fallback: 0.2 },
    { key: 'hy_oas', seriesId: 'BAMLH0A0HYM2', label: 'ICE BofA US High Yield OAS', fallback: 3.5 },
    { key: 'pe', seriesId: 'SP500PE', label: 'S&P 500 P/E Ratio', fallback: 20.8 },
    { key: 'pc', seriesId: 'PUTCALL', label: 'CBOE Equity Put/Call Ratio', fallback: 0.9 },
    { key: 'ted', seriesId: 'TEDRATE', label: 'TED Spread', fallback: 0.25 }
  ];

  const results = await Promise.all(
    seriesConfigs.map(async (config) => {
      if (config.key === 'vix') {
        return {
          config,
          ...(await fetchVixSeries(config.seriesId, config.fallback))
        };
      }

      const result = await fetchFredSeries(config.seriesId, config.fallback);
      return {
        config,
        ...result,
        sources: result.failed
          ? []
          : [
              {
                title: `FRED: ${config.label}`,
                uri: `https://fred.stlouisfed.org/series/${config.seriesId}`
              }
            ]
      };
    })
  );

  const failedSeries = results.filter(result => result.failed).map(result => result.config.label);
  const sources = results.flatMap(result => result.sources ?? []);

  if (sources.length === 0) {
    return buildFallbackData("FRED API unavailable. Showing cached baseline metrics.");
  }

  if (failedSeries.length > 0) {
    sources.unshift({
      title: `Live data unavailable for ${failedSeries.join(', ')} — showing cached baseline for those indicators.`,
      uri: 'https://fred.stlouisfed.org/'
    });
  }

  const values = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.config.key] = result.value;
    return acc;
  }, {});

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
      history: results.find(result => result.config.key === 'vix')?.history ?? MOCK_HISTORY(values.vix),
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
      history: results.find(result => result.config.key === 't10y2y')?.history ?? MOCK_HISTORY(values.t10y2y),
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
      history: results.find(result => result.config.key === 'hy_oas')?.history ?? MOCK_HISTORY(values.hy_oas),
      subScore: mapToSubScore(values.hy_oas, 2.8, 6.5, 'higher_is_risky'),
      explanation: 'Widening credit spreads indicate tightening financial conditions and default risk.'
    },
    {
      id: 'pe-ratio',
      name: 'S&P 500 P/E Ratio',
      category: 'Valuation',
      value: values.pe,
      unit: 'x',
      direction: 'higher_is_risky',
      description: 'Price relative to trailing 12m earnings.',
      weight: 0.20,
      history: results.find(result => result.config.key === 'pe')?.history ?? MOCK_HISTORY(values.pe),
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
      history: results.find(result => result.config.key === 'pc')?.history ?? MOCK_HISTORY(values.pc),
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
      history: results.find(result => result.config.key === 'ted')?.history ?? MOCK_HISTORY(values.ted),
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
      name: 'S&P 500 P/E Ratio',
      category: 'Valuation',
      value: 20.8,
      unit: 'x',
      direction: 'higher_is_risky',
      description: 'Price relative to trailing 12m earnings.',
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
        uri: 'https://fred.stlouisfed.org/'
      }
    ]
  };
};

type FredSeriesResult = {
  value: number;
  history: { date: string; value: number }[];
  failed: boolean;
  sources?: { title: string; uri: string }[];
};

const buildFredUrl = (seriesId: string, limit: number) => {
  const params = new URLSearchParams({
    series_id: seriesId,
    file_type: 'json',
    sort_order: 'desc',
    limit: String(limit)
  });
  if (fredApiKey) {
    params.set('api_key', fredApiKey);
  }
  return `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
};

const parseObservationValue = (value: string): number | null => {
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const fetchFredSeries = async (seriesId: string, fallbackValue: number): Promise<FredSeriesResult> => {
  try {
    const response = await fetch(buildFredUrl(seriesId, 30));
    if (!response.ok) {
      throw new Error(`FRED request failed for ${seriesId}`);
    }
    const data = await response.json();
    const observations = Array.isArray(data.observations) ? data.observations : [];
    const validObservations = observations
      .map((obs: { date: string; value: string }) => ({
        date: obs.date,
        value: parseObservationValue(obs.value)
      }))
      .filter((obs: { value: number | null }) => obs.value !== null) as { date: string; value: number }[];

    if (validObservations.length === 0) {
      throw new Error(`No valid observations for ${seriesId}`);
    }

    const latestValue = validObservations[0].value;
    const history = validObservations
      .slice()
      .reverse()
      .map(obs => ({ date: obs.date, value: obs.value }));

    return {
      value: latestValue,
      history,
      failed: false
    };
  } catch (error) {
    console.error("FRED request failed:", error);
    return {
      value: fallbackValue,
      history: MOCK_HISTORY(fallbackValue),
      failed: true
    };
  }
};

const VIX_PROXY_PREFIX = 'https://r.jina.ai/http://';
const VIX_YAHOO_URL = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5EVIX';
const VIX_STOOQ_URL = 'https://stooq.com/q/l/?s=^vix&f=sd2t2ohlcv&h&e=csv';

const extractJsonPayload = (text: string): unknown => {
  const start = text.indexOf('{');
  if (start === -1) {
    throw new Error('No JSON payload detected');
  }
  return JSON.parse(text.slice(start));
};

const parseYahooVix = (text: string): number | null => {
  try {
    const payload = extractJsonPayload(text) as {
      quoteResponse?: { result?: { regularMarketPrice?: number }[] };
    };
    const price = payload.quoteResponse?.result?.[0]?.regularMarketPrice;
    return typeof price === 'number' ? price : null;
  } catch (error) {
    console.warn('Failed to parse Yahoo VIX response', error);
    return null;
  }
};

const parseStooqVix = (text: string): number | null => {
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return null;
  }
  const dataLine = lines[lines.length - 1];
  const columns = dataLine.split(',');
  const closeValue = columns[4];
  const parsed = Number(closeValue);
  return Number.isNaN(parsed) ? null : parsed;
};

const fetchRealtimeVix = async (): Promise<{ value: number; source: { title: string; uri: string } } | null> => {
  try {
    const response = await fetch(`${VIX_PROXY_PREFIX}${VIX_YAHOO_URL}`);
    if (response.ok) {
      const text = await response.text();
      const value = parseYahooVix(text);
      if (value !== null) {
        return {
          value,
          source: { title: 'Yahoo Finance: CBOE VIX (near real-time)', uri: VIX_YAHOO_URL }
        };
      }
    }
  } catch (error) {
    console.warn('Yahoo VIX fetch failed', error);
  }

  try {
    const response = await fetch(`${VIX_PROXY_PREFIX}${VIX_STOOQ_URL}`);
    if (!response.ok) {
      return null;
    }
    const text = await response.text();
    const value = parseStooqVix(text);
    if (value === null) {
      return null;
    }
    return {
      value,
      source: { title: 'Stooq: CBOE VIX (delayed)', uri: VIX_STOOQ_URL }
    };
  } catch (error) {
    console.warn('Stooq VIX fetch failed', error);
    return null;
  }
};

const fetchVixSeries = async (seriesId: string, fallbackValue: number): Promise<FredSeriesResult> => {
  const [fredResult, realtimeVix] = await Promise.all([
    fetchFredSeries(seriesId, fallbackValue),
    fetchRealtimeVix()
  ]);

  const value = realtimeVix?.value ?? fredResult.value;
  const sources: { title: string; uri: string }[] = [];

  if (!fredResult.failed) {
    sources.push({
      title: 'FRED: CBOE Volatility Index (VIX)',
      uri: `https://fred.stlouisfed.org/series/${seriesId}`
    });
  }

  if (realtimeVix) {
    sources.push(realtimeVix.source);
  }

  return {
    value,
    history: fredResult.failed ? MOCK_HISTORY(value) : fredResult.history,
    failed: fredResult.failed && !realtimeVix,
    sources
  };
};
