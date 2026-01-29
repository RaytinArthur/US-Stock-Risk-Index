
import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Info, 
  RefreshCw, 
  ExternalLink,
  BarChart2,
  Zap,
  ShieldCheck,
  Search
} from 'lucide-react';
import { fetchRealMarketData, isGeminiRateLimited, recordGeminiRateLimit } from './services/marketService';
import { RiskData, RiskLevel } from './types';
import { RISK_THRESHOLDS, CATEGORIES } from './constants';
import RiskGauge from './components/RiskGauge';
import IndicatorCard from './components/IndicatorCard';
import { GoogleGenAI } from '@google/genai';

const App: React.FC = () => {
  const [data, setData] = useState<RiskData | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const hasAiKey = Boolean(import.meta.env.VITE_GEMINI_API_KEY);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const realData = await fetchRealMarketData();
      setData(realData);
      setAiAnalysis(null); // Reset analysis on refresh
    } catch (error) {
      console.error("Failed to fetch real data:", error);
      // Optional: keep old data or show error
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const currentStatus = useMemo(() => {
    if (!data) return null;
    return RISK_THRESHOLDS.find(t => data.totalScore >= t.min && data.totalScore <= t.max);
  }, [data]);

  const filteredIndicators = useMemo(() => {
    if (!data) return [];
    if (activeCategory === 'All') return data.indicators;
    return data.indicators.filter(ind => ind.category === activeCategory);
  }, [data, activeCategory]);

  const runAiAnalysis = async () => {
    if (!data || !hasAiKey) return;
    if (isGeminiRateLimited()) {
      setAiAnalysis("Gemini API rate limited. Please retry later.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      const prompt = `Based on these LIVE real-time market metrics fetched via Google Search:
      Total Risk Score: ${data.totalScore}/100
      Status: ${currentStatus?.level}
      
      Live Metrics:
      ${data.indicators.map(ind => `- ${ind.name}: ${ind.value}${ind.unit} (Sub-score: ${ind.subScore}/100)`).join('\n')}
      
      Write a professional 3-sentence summary highlighting the primary risk driver and the immediate outlook for US equities.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      
      setAiAnalysis(response.text || "Analysis unavailable.");
    } catch (error) {
      console.error("AI Analysis failed:", error);
      if (String(error).includes('429')) {
        recordGeminiRateLimit();
        setAiAnalysis("Gemini API rate limited. Please retry later.");
        return;
      }
      setAiAnalysis("Error generating AI insights. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Scanning live market data via Google Search...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-900/20">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">US Stock Risk Index</h1>
              <div className="ml-3 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[10px] text-emerald-500 font-bold uppercase tracking-tighter flex items-center gap-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Data
              </div>
            </div>
            {data?.sources?.[0]?.title?.includes('rate limited') && (
              <div className="hidden md:flex items-center gap-2 text-[10px] text-amber-400 uppercase tracking-widest font-semibold">
                <Info className="w-3 h-3" />
                Gemini API rate limited — showing cached data
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end text-[10px] text-slate-400 uppercase tracking-tighter">
                <span>Last Scan</span>
                <span className="text-slate-200">{new Date(data!.lastUpdated).toLocaleTimeString()}</span>
              </div>
              <button 
                onClick={refreshData}
                disabled={isRefreshing}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-slate-700/50 overflow-hidden mb-12 shadow-2xl relative">
          <div className="absolute top-4 right-6 flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <ShieldCheck className="w-3 h-3 text-blue-500" />
            AI Verified Indicators
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12 items-center">
            <div className="flex flex-col items-center justify-center">
              <RiskGauge score={data!.totalScore} />
              <div className="mt-4 text-center">
                <span 
                  className="text-2xl font-bold uppercase tracking-widest px-6 py-2 rounded-full inline-block shadow-lg"
                  style={{ backgroundColor: `${currentStatus?.color}22`, color: currentStatus?.color, border: `1px solid ${currentStatus?.color}44` }}
                >
                  {currentStatus?.level}
                </span>
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Live Risk Pulse</h2>
                <p className="text-slate-400 leading-relaxed text-sm md:text-base">
                  Current aggregate risk is <span className="text-white font-bold">{data!.totalScore}/100</span>. 
                  This real-time score is derived from high-frequency market data fetched via AI search.
                </p>
              </div>

              <div className="bg-slate-950/40 rounded-2xl p-5 border border-slate-700/50 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Gemini Market Analysis</span>
                  </div>
                  {!aiAnalysis && (
                    <button 
                      onClick={runAiAnalysis}
                      disabled={isAnalyzing || !hasAiKey}
                      className="text-[10px] bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all"
                    >
                      {isAnalyzing ? 'Analyzing...' : hasAiKey ? 'Generate Insight' : 'Configure API Key'}
                    </button>
                  )}
                </div>
                <div className="text-slate-300 text-sm italic min-h-[60px] leading-relaxed">
                  {aiAnalysis ? (
                    <p>"{aiAnalysis}"</p>
                  ) : isAnalyzing ? (
                    <div className="flex gap-2 items-center justify-center py-4">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  ) : !hasAiKey ? (
                    "Set VITE_GEMINI_API_KEY in your Vercel environment to enable AI insights."
                  ) : (
                    "Fetch latest insights to see how current volatility spikes or yield curves affect your portfolio risk."
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 bg-slate-950/30 p-4 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px] uppercase font-bold mb-1 tracking-widest">Primary Risk</div>
                  <div className="text-white font-semibold truncate text-sm">{data!.contributions[0].name}</div>
                  <div className="text-red-400 text-xs mt-1">Impact: +{data!.contributions[0].impact.toFixed(1)} pts</div>
                </div>
                <div className="flex-1 bg-slate-950/30 p-4 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px] uppercase font-bold mb-1 tracking-widest">Data Integrity</div>
                  <div className="text-white font-semibold text-sm">Grounding Enabled</div>
                  <div className="text-blue-400 text-xs mt-1">{data!.sources.length} citations found</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800 w-fit">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                activeCategory === cat 
                  ? 'bg-slate-700 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIndicators.map(ind => (
            <IndicatorCard key={ind.id} indicator={ind} />
          ))}
        </div>

        {/* Evidence Section - Requirement for Google Search Tool */}
        <section className="mt-16 bg-slate-900/30 rounded-3xl p-8 border border-slate-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-slate-800 p-2 rounded-lg">
              <Search className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Live Data Sources</h2>
              <p className="text-slate-500 text-sm font-medium">Citations and grounding evidence for current metrics</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data!.sources.length > 0 ? data!.sources.map((source, idx) => (
              <a 
                key={idx}
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-4 bg-slate-900/50 border border-slate-800 rounded-xl hover:border-blue-500/50 hover:bg-slate-800/50 transition-all group"
              >
                <div className="bg-slate-800 p-2 rounded-lg group-hover:bg-blue-500/10 transition-colors">
                  <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-slate-200 text-sm font-semibold truncate">{source.title}</div>
                  <div className="text-slate-500 text-[10px] truncate">{new URL(source.uri).hostname}</div>
                </div>
              </a>
            )) : (
              <div className="col-span-full text-center py-10 border-2 border-dashed border-slate-800 rounded-2xl">
                <p className="text-slate-500 text-sm italic">Refreshing data will populate live source evidence.</p>
              </div>
            )}
          </div>
        </section>

        <footer className="mt-20 py-12 border-t border-slate-800 text-center">
          <div className="max-w-3xl mx-auto px-6 py-5 bg-red-500/5 border border-red-500/10 rounded-2xl shadow-sm">
            <div className="flex items-center justify-center gap-2 text-red-500/70 mb-3 font-bold text-xs uppercase tracking-widest">
              <AlertTriangle className="w-4 h-4" />
              <span>Investment Risk Warning</span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Real-time data is fetched using automated AI search queries. While every effort is made to ensure accuracy, data may be delayed or subject to search engine indexing errors. This index is a quantitative experiment and does not constitute financial advice. Market risk is dynamic; never invest more than you can afford to lose.
            </p>
          </div>
          
          <div className="mt-8 text-slate-600 text-[10px] uppercase font-bold tracking-[0.2em]">
            &copy; {new Date().getFullYear()} US Stock Risk Index &bull; AI-Powered Market Grounding
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
