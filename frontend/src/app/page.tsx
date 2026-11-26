"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Activity, BrainCircuit, LineChart, Wallet, Search, Loader2, ArrowRight, 
  TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, Newspaper, BarChart3, 
  FileText, ExternalLink, Globe, Database, RefreshCw, Filter, BookOpen, 
  CheckCircle2, ChevronDown, ChevronUp, Copy, Check, Layers, TableProperties,
  Building2, Sparkles, Compass
} from "lucide-react";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const [ticker, setTicker] = useState("RELIANCE");
  const [market, setMarket] = useState<"NSE" | "US">("NSE");
  const [riskProfile, setRiskProfile] = useState("Moderate");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const quickPicks = market === "NSE"
    ? ["RELIANCE", "TCS", "HDFCBANK", "INFY", "TATAMOTORS", "ZOMATO"]
    : ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "GOOGL"];

  const curr = data?.currency_symbol || (market === "NSE" ? "₹" : "$");
  
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestData, setBacktestData] = useState<any>(null);
  
  const [portfolio, setPortfolio] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  const [newHoldingTicker, setNewHoldingTicker] = useState("");
  const [newHoldingQty, setNewHoldingQty] = useState("");
  const [newHoldingPrice, setNewHoldingPrice] = useState("");
  const [addingHolding, setAddingHolding] = useState(false);

  // Memory Explorer state
  const [memoryQuery, setMemoryQuery] = useState("");
  const [selectedLayer, setSelectedLayer] = useState("all");
  const [memoriesList, setMemoriesList] = useState<any[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [backtestPeriod, setBacktestPeriod] = useState("1y");
  
  const [activeAgentTab, setActiveAgentTab] = useState<"fundamental" | "technical" | "news" | "risk" | "all">("fundamental");
  const [showFullReport, setShowFullReport] = useState(true);
  const [copiedReport, setCopiedReport] = useState(false);

  const formatLargeNumber = (num: any, prefix = "$") => {
    if (num === null || num === undefined || isNaN(Number(num)) || num === 0) return "N/A";
    const n = Number(num);
    if (n >= 1e12) return `${prefix}${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `${prefix}${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `${prefix}${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${prefix}${(n / 1e3).toFixed(2)}K`;
    return `${prefix}${n.toLocaleString()}`;
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const fetchMemories = async (query = "", layer = "all") => {
    setMemoryLoading(true);
    try {
      const layerParam = layer !== "all" ? `&layer=${layer}` : "";
      const res = await fetch(`${API_BASE_URL}/api/v1/memory/search?query=${encodeURIComponent(query)}&k=25${layerParam}`);
      if (res.ok) {
        const result = await res.json();
        setMemoriesList(result.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch memories:", e);
    } finally {
      setMemoryLoading(false);
    }
  };

  // Portfolio analysis state
  const [portfolioAnalyzing, setPortfolioAnalyzing] = useState<string | null>(null);
  const [holdingAnalysis, setHoldingAnalysis] = useState<Record<string, any>>({});

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/portfolio`);
      if (response.ok) {
        const result = await response.json();
        setPortfolio(result.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    fetchMemories();
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/analysis/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, market, risk_profile: riskProfile })
      });
      if (!response.ok) throw new Error("Failed to fetch analysis");
      const result = await response.json();
      setData(result.data);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze ticker. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteTrade = async () => {
    if (!data || !data.ticker) return;
    setExecuting(true);
    try {
      const marketRes = await fetch(`${API_BASE_URL}/api/v1/market/${data.ticker}`);
      if (!marketRes.ok) throw new Error("Failed to fetch market price");
      const marketData = await marketRes.json();
      const currentPrice = marketData.data.close || 150.0;
      
      const quantity = data.quantity && data.quantity > 0 ? data.quantity : 10;
      
      const response = await fetch(`${API_BASE_URL}/api/v1/portfolio/trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: data.ticker, action: data.decision, quantity, price: currentPrice })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || result.message);
      
      alert(result.message);
      fetchPortfolio();
    } catch (error: any) {
      alert("Trade Failed: " + error.message);
    } finally {
      setExecuting(false);
    }
  };

  const handleAddHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoldingTicker || !newHoldingQty || !newHoldingPrice) return;
    setAddingHolding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/portfolio/holdings/initial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ticker: newHoldingTicker, 
          quantity: parseInt(newHoldingQty), 
          price: parseFloat(newHoldingPrice) 
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || result.message);
      alert("Holding Added!");
      setNewHoldingTicker("");
      setNewHoldingQty("");
      setNewHoldingPrice("");
      fetchPortfolio();
    } catch (error: any) {
      alert("Failed to add holding: " + error.message);
    } finally {
      setAddingHolding(false);
    }
  };

  const handleAnalyzeHolding = async (holdingTicker: string) => {
    setPortfolioAnalyzing(holdingTicker);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/analysis/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: holdingTicker, risk_profile: riskProfile })
      });
      if (!response.ok) throw new Error("Failed to analyze");
      const result = await response.json();
      setHoldingAnalysis(prev => ({ ...prev, [holdingTicker]: result.data }));
    } catch (error: any) {
      alert("Analysis failed: " + error.message);
    } finally {
      setPortfolioAnalyzing(null);
    }
  };

  const handleBacktest = async () => {
    if (!ticker) return;
    setBacktestLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/backtest/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, period: backtestPeriod })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || result.message || "Failed to run backtest");
      setBacktestData(result.data);
    } catch (error: any) {
      console.error(error);
      alert("Backtest Failed: " + (error.message || "Ensure ticker is valid and backend is running."));
    } finally {
      setBacktestLoading(false);
    }
  };

  // Helper to safely convert any value to a displayable string
  const safeStr = (val: any): string => {
    if (val === null || val === undefined) return "N/A";
    if (typeof val === "string") return val;
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    return JSON.stringify(val);
  };

  // Helper to safely extract agent result data
  const getAgentResult = (agentData: any) => {
    if (!agentData) return null;
    return agentData.result || agentData;
  };

  const getSignalIcon = (signal: string) => {
    const s = (signal || "").toUpperCase();
    if (s === "BUY" || s === "BULLISH" || s === "POSITIVE") return <TrendingUp className="h-5 w-5 text-emerald-600" />;
    if (s === "SELL" || s === "BEARISH" || s === "NEGATIVE") return <TrendingDown className="h-5 w-5 text-rose-600" />;
    return <Minus className="h-5 w-5 text-slate-500" />;
  };

  const getSignalColor = (signal: string) => {
    const s = (signal || "").toUpperCase();
    if (s === "BUY" || s === "BULLISH" || s === "POSITIVE") return "text-emerald-700 font-extrabold";
    if (s === "SELL" || s === "BEARISH" || s === "NEGATIVE") return "text-rose-700 font-extrabold";
    return "text-amber-700 font-extrabold";
  };

  return (
    <div className="flex-1 space-y-8 p-8 md:p-10 bg-slate-50 min-h-screen text-slate-900 font-sans">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <BrainCircuit className="h-7 w-7 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-slate-950">
                  Stocks-AI
                </h1>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-bold py-0.5 px-2.5">
                  Multi-Agent · MCP · FAISS
                </Badge>
              </div>
              <p className="text-sm font-medium text-slate-600 mt-1">
                Cognitive Hierarchical Memory & Algorithmic Decision Support System
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Market Selector */}
            <div className="flex items-center bg-slate-100 border border-slate-300 rounded-xl p-1 text-sm font-semibold">
              <button
                type="button"
                onClick={() => { setMarket("NSE"); setTicker("RELIANCE"); }}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  market === "NSE" 
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200" 
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                🇮🇳 Indian (NSE)
              </button>
              <button
                type="button"
                onClick={() => { setMarket("US"); setTicker("AAPL"); }}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  market === "US" 
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200" 
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                🇺🇸 US Market
              </button>
            </div>

            {/* Search Input Form */}
            <form onSubmit={handleAnalyze} className="flex flex-1 sm:flex-initial items-center space-x-2 bg-white border-2 border-slate-300 focus-within:border-indigo-600 rounded-xl p-1 shadow-sm transition-all">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input 
                  type="text" 
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder={market === "NSE" ? "Ticker (e.g. RELIANCE)" : "Ticker (e.g. AAPL)"} 
                  className="pl-9 pr-3 py-2 bg-transparent text-sm font-bold text-slate-900 placeholder-slate-400 uppercase focus:outline-none w-full"
                />
              </div>
              <div className="border-l border-slate-200 pl-2">
                <select 
                  value={riskProfile} 
                  onChange={(e) => setRiskProfile(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-800 py-2 pr-3 cursor-pointer focus:outline-none"
                >
                  <option value="Conservative">Conservative</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Aggressive">Aggressive</option>
                </select>
              </div>
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow-md transition-all">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {loading ? "Analyzing..." : "Analyze"}
              </Button>
            </form>
          </div>
        </div>

        {/* Quick Picks Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-sm">
          <span className="text-slate-600 font-bold mr-1">Quick Picks:</span>
          {quickPicks.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => { setTicker(sym); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                ticker === sym 
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm" 
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm gap-1 h-auto flex-wrap">
          <TabsTrigger value="overview" className="font-bold text-sm px-5 py-2.5 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow text-slate-700">
            Overview & Agent Analysis
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="font-bold text-sm px-5 py-2.5 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow text-slate-700">
            Portfolio
          </TabsTrigger>
          <TabsTrigger value="signals" className="font-bold text-sm px-5 py-2.5 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow text-slate-700">
            Trading Signals
          </TabsTrigger>
          <TabsTrigger value="memory" className="font-bold text-sm px-5 py-2.5 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow text-slate-700">
            Memory Explorer (FAISS)
          </TabsTrigger>
          <TabsTrigger value="backtest" className="font-bold text-sm px-5 py-2.5 rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow text-slate-700">
            Algorithmic Backtesting
          </TabsTrigger>
        </TabsList>
        
        {/* ============ OVERVIEW TAB ============ */}
        <TabsContent value="overview" className="space-y-6">
          {data ? (
            <div className="space-y-6">
              {/* Active Stock & Market Header Card */}
              <div className="flex flex-wrap items-center justify-between p-6 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                    <Globe className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl font-black text-slate-950 tracking-tight">{data.ticker}</h2>
                      <Badge className="bg-slate-100 text-slate-800 border-slate-300 font-bold text-xs py-1 px-3">
                        {data.market === "NSE" ? "🇮🇳 National Stock Exchange of India (NSE)" : "🇺🇸 United States Market"}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mt-1">
                      Execution Time: <span className="font-mono text-indigo-600 font-bold">{data.execution_time_ms}ms</span> · Cognitive Memories Used: <span className="font-mono text-indigo-600 font-bold">{data.memories_used || 0}</span>
                    </p>
                  </div>
                </div>
                {data.current_price && (
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Current Market Price</span>
                    <div className="text-3xl font-black text-slate-950">
                      {curr}{typeof data.current_price === 'number' ? data.current_price.toLocaleString() : data.current_price}
                    </div>
                  </div>
                )}
              </div>

              {/* Specialist Agent Top Summary Cards */}
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {/* News Agent Card */}
                <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl hover:border-slate-300 transition-all p-5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-3">
                    <CardTitle className="text-base font-bold text-slate-900">News Agent</CardTitle>
                    <div className="p-2 rounded-lg bg-blue-50 border border-blue-200">
                      <Newspaper className="h-5 w-5 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {(() => { const r = getAgentResult(data.news_analysis); return r ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          {getSignalIcon(r.sentiment)}
                          <span className={`text-xl font-black ${getSignalColor(r.sentiment)}`}>{r.sentiment || "N/A"}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">Confidence: {((r.confidence || 0) * 100).toFixed(0)}%</p>
                        <p className="text-xs font-medium text-slate-500">Impact: {r.market_impact || r.importance || "Moderate"}</p>
                      </div>
                    ) : <p className="text-sm text-slate-500 font-medium">Pending analysis...</p> })()}
                  </CardContent>
                </Card>

                {/* Technical Agent Card */}
                <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl hover:border-slate-300 transition-all p-5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-3">
                    <CardTitle className="text-base font-bold text-slate-900">Technical Agent</CardTitle>
                    <div className="p-2 rounded-lg bg-purple-50 border border-purple-200">
                      <BarChart3 className="h-5 w-5 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {(() => { const r = getAgentResult(data.technical_analysis); return r ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          {getSignalIcon(r.signal)}
                          <span className={`text-xl font-black ${getSignalColor(r.signal)}`}>{r.signal || "N/A"}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">Trend: {r.trend || "?"} ({r.strength || "?"})</p>
                        <p className="text-xs font-medium text-slate-500">Confidence: {((r.confidence || 0) * 100).toFixed(0)}%</p>
                      </div>
                    ) : <p className="text-sm text-slate-500 font-medium">Pending analysis...</p> })()}
                  </CardContent>
                </Card>

                {/* Fundamental Agent Card */}
                <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl hover:border-slate-300 transition-all p-5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-3">
                    <CardTitle className="text-base font-bold text-slate-900">Fundamental Agent</CardTitle>
                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {(() => { const r = getAgentResult(data.fundamental_analysis); return r ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          {getSignalIcon(r.valuation === "Undervalued" ? "BUY" : r.valuation === "Overvalued" ? "SELL" : "HOLD")}
                          <span className={`text-xl font-black ${getSignalColor(r.valuation === "Undervalued" ? "BUY" : r.valuation === "Overvalued" ? "SELL" : "HOLD")}`}>{r.valuation || "N/A"}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">Growth: {r.growth || "?"}</p>
                        <p className="text-xs font-medium text-slate-500">Confidence: {((r.confidence || 0) * 100).toFixed(0)}%</p>
                      </div>
                    ) : <p className="text-sm text-slate-500 font-medium">Pending analysis...</p> })()}
                  </CardContent>
                </Card>

                {/* Risk Agent Card */}
                <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl hover:border-slate-300 transition-all p-5">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 p-0 pb-3">
                    <CardTitle className="text-base font-bold text-slate-900">Risk Agent</CardTitle>
                    <div className="p-2 rounded-lg bg-rose-50 border border-rose-200">
                      <Shield className="h-5 w-5 text-rose-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {(() => { const r = getAgentResult(data.risk_assessment); return r ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-5 w-5 ${r.risk === "Low" ? "text-emerald-600" : r.risk === "High" || r.risk === "Critical" ? "text-rose-600" : "text-amber-600"}`} />
                          <span className={`text-xl font-black ${r.risk === "Low" ? "text-emerald-700" : r.risk === "High" || r.risk === "Critical" ? "text-rose-700" : "text-amber-700"}`}>{r.risk || "N/A"}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">Recommended Size: {r.position_size || "?"}</p>
                        <p className="text-xs font-medium text-slate-500 truncate" title={r.recommendation}>{r.recommendation || "N/A"}</p>
                      </div>
                    ) : <p className="text-sm text-slate-500 font-medium">Pending analysis...</p> })()}
                  </CardContent>
                </Card>
              </div>

              {/* CIO Final Decision & Investment Rationale Row */}
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                {/* Decision Box */}
                <Card className="bg-white border-2 border-slate-300 shadow-md rounded-2xl lg:col-span-1 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-950">
                        <BrainCircuit className="h-6 w-6 text-indigo-600" />
                        CIO Final Decision
                      </CardTitle>
                      <Badge className="text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200">
                        Multi-Agent Consensus
                      </Badge>
                    </div>

                    <div className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center text-center space-y-2 mb-4 ${
                      data.decision === 'BUY' ? 'bg-emerald-50 border-emerald-400 text-emerald-950' :
                      data.decision === 'SELL' ? 'bg-rose-50 border-rose-400 text-rose-950' :
                      'bg-slate-100 border-slate-300 text-slate-900'
                    }`}>
                      <div className="text-5xl font-black tracking-wider">{data.decision || "HOLD"}</div>
                      {data.decision !== 'HOLD' && (
                        <div className="text-base font-extrabold text-slate-800">
                          Recommended Allocation: {data.quantity > 0 ? `${data.quantity} Shares` : "Calculated on sizing"}
                        </div>
                      )}
                      <div className="text-sm font-bold text-slate-700">
                        Confidence Score: {((data.confidence || 0) * 100).toFixed(1)}%
                      </div>
                    </div>

                    {data.explanation?.result?.summary && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                        <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block mb-1">
                          CIO Executive Summary
                        </span>
                        <p className="text-sm font-medium text-slate-800 leading-relaxed italic">
                          "{safeStr(data.explanation.result.summary)}"
                        </p>
                      </div>
                    )}
                  </div>

                  {data.decision !== 'HOLD' && (
                    <Button 
                      onClick={handleExecuteTrade} 
                      disabled={executing}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base py-3 rounded-xl shadow-lg transition-all"
                    >
                      {executing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ArrowRight className="h-5 w-5 mr-2" />}
                      Execute {data.decision} Trade
                    </Button>
                  )}
                </Card>

                {/* Synthesis Reasoning & Risks */}
                <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl lg:col-span-2 p-6">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-lg font-black flex items-center gap-2 text-slate-950">
                      <Layers className="h-6 w-6 text-indigo-600" />
                      Investment Rationale & Identified Risks
                    </CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-600">
                      Multi-agent cross-verification highlighting core supporting logic and protective boundaries.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 grid gap-5 md:grid-cols-2">
                    {/* Reasoning */}
                    <div className="p-5 bg-emerald-50/60 rounded-xl border border-emerald-200">
                      <div className="flex items-center gap-2 text-sm font-bold text-emerald-800 mb-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span>Core Supporting Reasons</span>
                      </div>
                      {data.reasoning && data.reasoning.length > 0 ? (
                        <ul className="space-y-2 text-sm font-medium text-slate-800">
                          {data.reasoning.map((r: any, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-emerald-700 font-black">•</span>
                              <span className="leading-snug">{safeStr(r)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500">No specific reasoning items generated.</p>
                      )}
                    </div>

                    {/* Risks */}
                    <div className="p-5 bg-rose-50/60 rounded-xl border border-rose-200">
                      <div className="flex items-center gap-2 text-sm font-bold text-rose-800 mb-3">
                        <AlertTriangle className="h-5 w-5 text-rose-600" />
                        <span>Identified Risk Warnings</span>
                      </div>
                      {data.risks && data.risks.length > 0 ? (
                        <ul className="space-y-2 text-sm font-medium text-slate-800">
                          {data.risks.map((r: any, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-rose-700 font-black">⚠</span>
                              <span className="leading-snug">{safeStr(r)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-slate-500">No critical risks flagged for this asset.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Comprehensive Specialist Agent Intelligence Hub (Standard Column Format) */}
              <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="p-6 pb-4 border-b border-slate-200 bg-white">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-2xl font-black flex items-center gap-2 text-slate-950">
                        <TableProperties className="h-6 w-6 text-indigo-600" />
                        Specialist Agent Intelligence Hub
                      </CardTitle>
                      <CardDescription className="text-sm font-semibold text-slate-600 mt-0.5">
                        In-depth granular outputs, full corporate reports, and multi-market metrics presented in standardized column format.
                      </CardDescription>
                    </div>

                    {/* Sub-tab Navigation */}
                    <div className="flex flex-wrap items-center bg-slate-100 p-1.5 rounded-xl border border-slate-300 text-sm gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveAgentTab("fundamental")}
                        className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                          activeAgentTab === "fundamental" 
                            ? "bg-white text-indigo-700 shadow-sm border border-slate-200" 
                            : "text-slate-700 hover:text-slate-950 hover:bg-slate-200/50"
                        }`}
                      >
                        <FileText className="h-4 w-4 text-amber-600" />
                        Fundamental & Full Report
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAgentTab("technical")}
                        className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                          activeAgentTab === "technical" 
                            ? "bg-white text-indigo-700 shadow-sm border border-slate-200" 
                            : "text-slate-700 hover:text-slate-950 hover:bg-slate-200/50"
                        }`}
                      >
                        <BarChart3 className="h-4 w-4 text-purple-600" />
                        Technical Indicators
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAgentTab("news")}
                        className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                          activeAgentTab === "news" 
                            ? "bg-white text-indigo-700 shadow-sm border border-slate-200" 
                            : "text-slate-700 hover:text-slate-950 hover:bg-slate-200/50"
                        }`}
                      >
                        <Newspaper className="h-4 w-4 text-blue-600" />
                        News Intelligence
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAgentTab("risk")}
                        className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                          activeAgentTab === "risk" 
                            ? "bg-white text-indigo-700 shadow-sm border border-slate-200" 
                            : "text-slate-700 hover:text-slate-950 hover:bg-slate-200/50"
                        }`}
                      >
                        <Shield className="h-4 w-4 text-rose-600" />
                        Risk & Sizing
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveAgentTab("all")}
                        className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${
                          activeAgentTab === "all" 
                            ? "bg-white text-indigo-700 shadow-sm border border-slate-200" 
                            : "text-slate-700 hover:text-slate-950 hover:bg-slate-200/50"
                        }`}
                      >
                        <Layers className="h-4 w-4 text-emerald-600" />
                        Multi-Agent Matrix
                      </button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-8">
                  {/* ================= FUNDAMENTAL TAB ================= */}
                  {activeAgentTab === "fundamental" && (
                    <div className="space-y-8">
                      {(() => {
                        const r = getAgentResult(data.fundamental_analysis);
                        const c = data.company_info || {};
                        return (
                          <>
                            {/* Summary Callout Banner */}
                            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-5">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-5 w-5 text-amber-700" />
                                  <span className="font-extrabold text-slate-950 text-base">Fundamental Stance:</span>
                                  <Badge className={
                                    r?.valuation === "Undervalued" ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold text-xs" :
                                    r?.valuation === "Overvalued" ? "bg-rose-100 text-rose-900 border-rose-300 font-extrabold text-xs" :
                                    "bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-xs"
                                  }>
                                    {r?.valuation || "Fair Value"}
                                  </Badge>
                                  {r?.confidence && (
                                    <span className="text-sm font-semibold text-slate-600">({(r.confidence * 100).toFixed(0)}% Confidence)</span>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-slate-800 leading-relaxed max-w-4xl">
                                  {safeStr(r?.summary) || "Fundamental analysis synthesizes balance sheet leverage, quarterly margins, and corporate reports."}
                                </p>
                              </div>

                              <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
                                <div className="text-right">
                                  <span className="text-xs font-bold text-slate-500 uppercase block">Market Cap</span>
                                  <span className="text-base font-black text-slate-950">{formatLargeNumber(c.market_cap, curr)}</span>
                                </div>
                                <div className="text-right border-l border-slate-200 pl-4">
                                  <span className="text-xs font-bold text-slate-500 uppercase block">Trailing P/E</span>
                                  <span className="text-base font-black text-slate-950">{c.pe_ratio ? `${c.pe_ratio}x` : "N/A"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Standard Column Table 1: Valuation & Financial Multiples */}
                            <div className="space-y-3">
                              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <TableProperties className="h-4 w-4 text-indigo-600" />
                                Key Valuation & Financial Multiples (Standard Columns)
                              </h3>
                              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <Table>
                                  <TableHeader className="bg-slate-100 border-b-2 border-slate-200">
                                    <TableRow className="border-slate-200">
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Financial Metric</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Reported Value</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Category</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Industry Benchmark</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Analytical Assessment</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Trailing P/E Ratio</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-indigo-900 py-3.5 px-4">{c.pe_ratio ? `${c.pe_ratio}x` : "N/A"}</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Valuation Multiples</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">18.0x - 25.0x Median</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className={!c.pe_ratio ? "bg-slate-100 text-slate-700 border-slate-300" : c.pe_ratio < 20 ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" : "bg-amber-50 text-amber-800 border-amber-300 font-bold"}>
                                          {!c.pe_ratio ? "Data Pending" : c.pe_ratio < 20 ? "Attractively Valued" : "Growth Premium"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Forward P/E Ratio</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-indigo-900 py-3.5 px-4">{c.forward_pe ? `${c.forward_pe}x` : "N/A"}</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Future Earnings Multiple</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">15.0x - 22.0x Range</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className={!c.forward_pe ? "bg-slate-100 text-slate-700 border-slate-300" : c.forward_pe < (c.pe_ratio || 25) ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" : "bg-amber-50 text-amber-800 border-amber-300 font-bold"}>
                                          {!c.forward_pe ? "N/A" : c.forward_pe < (c.pe_ratio || 25) ? "Earnings Expansion Expected" : "Contracting Multiples"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Price to Book (P/B)</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-indigo-900 py-3.5 px-4">{c.price_to_book ? `${c.price_to_book}x` : "N/A"}</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Asset Valuation</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">&lt; 3.0x Baseline</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-800 py-3.5 px-4">
                                        {c.price_to_book ? (c.price_to_book < 3 ? "Healthy asset backing" : "Asset-light / premium brand") : "N/A"}
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Earnings Per Share (EPS)</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-indigo-900 py-3.5 px-4">{c.eps ? `${curr}${c.eps}` : "N/A"}</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Bottom-line Profitability</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">&gt; 0 Positive</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className={c.eps && c.eps > 0 ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" : "bg-rose-50 text-rose-800 border-rose-300 font-bold"}>
                                          {c.eps && c.eps > 0 ? "Profitable Operations" : "Marginal / Negative"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Profit Margin</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-indigo-900 py-3.5 px-4">{c.profit_margins !== null && c.profit_margins !== undefined ? `${c.profit_margins}%` : "N/A"}</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Operating Margin</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">&gt; 12.0% Peer Group</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className={c.profit_margins && c.profit_margins > 12 ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" : "bg-amber-50 text-amber-800 border-amber-300 font-bold"}>
                                          {c.profit_margins && c.profit_margins > 12 ? "Strong Margin Moat" : "Standard Margin"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Debt to Equity</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-indigo-900 py-3.5 px-4">{c.debt_to_equity !== null && c.debt_to_equity !== undefined ? `${c.debt_to_equity}` : "N/A"}</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Solvency & Capital Structure</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">&lt; 1.5 Prudent Limit</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className={!c.debt_to_equity || c.debt_to_equity < 1.5 ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" : "bg-rose-50 text-rose-800 border-rose-300 font-bold"}>
                                          {!c.debt_to_equity || c.debt_to_equity < 1.5 ? "Low/Controlled Leverage" : "Elevated Debt"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">52-Week Range</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-indigo-900 py-3.5 px-4">
                                        {c.low_52 && c.high_52 ? `${curr}${c.low_52} - ${curr}${c.high_52}` : "N/A"}
                                      </TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Price Dispersion</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">Annual High / Low</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-800 py-3.5 px-4">
                                        Current: {curr}{data.current_price || "N/A"}
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Dividend Yield & Beta</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-indigo-900 py-3.5 px-4">
                                        Yield: {c.dividend_yield ? `${c.dividend_yield}%` : "0.0%"} | Beta: {c.beta || "1.0"}
                                      </TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Shareholder Return / Volatility</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">Beta = 1.0 (Market)</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-800 py-3.5 px-4">
                                        {c.beta ? (c.beta > 1.2 ? "High sensitivity to broad market" : c.beta < 0.9 ? "Low systemic risk" : "Tracks benchmark") : "Standard market volatility"}
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            {/* Standard Column Table 2: Qualitative Fundamental Pillars */}
                            <div className="space-y-3">
                              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-amber-600" />
                                Fundamental Health Pillars (Agent Evaluations)
                              </h3>
                              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <Table>
                                  <TableHeader className="bg-slate-100 border-b-2 border-slate-200">
                                    <TableRow className="border-slate-200">
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Pillar Dimension</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Agent Rating</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Health Status</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Strategic Meaning & Notes</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Revenue & Growth Outlook</TableCell>
                                      <TableCell className="text-sm font-bold text-amber-800 py-3.5 px-4">{safeStr(r?.growth) || "Moderate"}</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">Active</Badge>
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-slate-800 py-3.5 px-4">
                                        Forward trajectory of core operational revenue and market expansion.
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Debt & Capital Solvency</TableCell>
                                      <TableCell className="text-sm font-bold text-amber-800 py-3.5 px-4">{safeStr(r?.debt) || "Low"}</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">Sustainable</Badge>
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-slate-800 py-3.5 px-4">
                                        Long-term interest coverage and debt obligations relative to cash generation.
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Operating Profitability</TableCell>
                                      <TableCell className="text-sm font-bold text-amber-800 py-3.5 px-4">{safeStr(r?.profitability) || "Strong"}</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">Robust</Badge>
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-slate-800 py-3.5 px-4">
                                        Net earnings retention and margin preservation against competitive pressures.
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Working Capital & Liquidity</TableCell>
                                      <TableCell className="text-sm font-bold text-amber-800 py-3.5 px-4">{safeStr(r?.liquidity) || "Adequate"}</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">Secure</Badge>
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-slate-800 py-3.5 px-4">
                                        Ability to meet short-term obligations comfortably without dilution.
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Overall Valuation Stance</TableCell>
                                      <TableCell className="text-sm font-bold text-indigo-800 py-3.5 px-4">{safeStr(r?.valuation) || "Fair"}</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className="bg-indigo-50 text-indigo-800 border-indigo-300 font-bold">Consensus</Badge>
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-slate-800 py-3.5 px-4">
                                        Synthesized intrinsic value compared to current trading market price.
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            {/* Complete Corporate / SEC Filings Full Report Viewer */}
                            <div className="space-y-3 pt-2">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                  <BookOpen className="h-4 w-4 text-indigo-600" />
                                  Full Corporate & SEC Filings Report ({data.ticker})
                                </h3>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(data.reports_data || c.reports_summary || "")}
                                    className="h-8 text-xs font-bold border-slate-300 bg-white hover:bg-slate-100 text-slate-800 shadow-sm"
                                  >
                                    {copiedReport ? <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                                    {copiedReport ? "Copied" : "Copy Full Report"}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowFullReport(!showFullReport)}
                                    className="h-8 text-xs font-bold text-slate-700 hover:text-slate-950 hover:bg-slate-100"
                                  >
                                    {showFullReport ? <ChevronUp className="h-3.5 w-3.5 mr-1.5" /> : <ChevronDown className="h-3.5 w-3.5 mr-1.5" />}
                                    {showFullReport ? "Collapse" : "Expand"}
                                  </Button>
                                </div>
                              </div>

                              {showFullReport && (
                                <div className="p-6 rounded-2xl bg-slate-50 border-2 border-slate-200 text-sm text-slate-900 font-mono leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto shadow-inner selection:bg-indigo-100 selection:text-indigo-900">
                                  {data.reports_data || c.reports_summary || (
                                    <div className="text-slate-500 font-semibold italic">
                                      Corporate fundamentals report is being processed. Complete quarterly filings data will appear here.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* ================= TECHNICAL TAB ================= */}
                  {activeAgentTab === "technical" && (
                    <div className="space-y-8">
                      {(() => {
                        const r = getAgentResult(data.technical_analysis);
                        const ind = data.technical_indicators || r?.key_indicators || {};
                        return (
                          <>
                            {/* Summary Callout Banner */}
                            <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 flex flex-col md:flex-row md:items-center justify-between gap-5">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-3">
                                  <BarChart3 className="h-5 w-5 text-purple-700" />
                                  <span className="font-extrabold text-slate-950 text-base">Technical Stance:</span>
                                  <Badge className={
                                    r?.signal === "BUY" ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold text-xs" :
                                    r?.signal === "SELL" ? "bg-rose-100 text-rose-900 border-rose-300 font-extrabold text-xs" :
                                    "bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-xs"
                                  }>
                                    {r?.signal || "HOLD"}
                                  </Badge>
                                  <span className="text-sm font-bold text-slate-700">
                                    Trend: <strong className="text-slate-950">{safeStr(r?.trend) || "Neutral"}</strong> ({safeStr(r?.strength) || "Moderate"} Momentum)
                                  </span>
                                </div>
                                <p className="text-sm font-semibold text-slate-800 leading-relaxed max-w-4xl">
                                  Support floor at <strong className="text-emerald-700 font-black">{curr}{safeStr(r?.support) || "N/A"}</strong> · Resistance ceiling at <strong className="text-rose-700 font-black">{curr}{safeStr(r?.resistance) || "N/A"}</strong>
                                </p>
                              </div>

                              <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-purple-200 shadow-sm">
                                <div className="text-right">
                                  <span className="text-xs font-bold text-slate-500 uppercase block">RSI (14)</span>
                                  <span className="text-base font-black text-slate-950">{ind.rsi !== undefined ? ind.rsi : "N/A"}</span>
                                </div>
                                <div className="text-right border-l border-slate-200 pl-4">
                                  <span className="text-xs font-bold text-slate-500 uppercase block">MACD Line</span>
                                  <span className="text-base font-black text-slate-950">{ind.macd !== undefined ? ind.macd : "N/A"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Standard Column Table: Calculated Technical Indicators */}
                            <div className="space-y-3">
                              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <TableProperties className="h-4 w-4 text-purple-600" />
                                Calculated Technical Indicators (Standard Columns)
                              </h3>
                              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <Table>
                                  <TableHeader className="bg-slate-100 border-b-2 border-slate-200">
                                    <TableRow className="border-slate-200">
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Indicator Name</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Category</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Calculated Value</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Standard Threshold</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Signal & Interpretation</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">RSI (14-Period)</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Momentum Oscillator</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-purple-950 py-3.5 px-4">{ind.rsi !== undefined ? ind.rsi : "N/A"}</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">Oversold &lt;30 | Overbought &gt;70</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className={
                                          ind.rsi < 35 ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" :
                                          ind.rsi > 70 ? "bg-rose-50 text-rose-800 border-rose-300 font-bold" :
                                          "bg-slate-100 text-slate-800 border-slate-300 font-bold"
                                        }>
                                          {ind.rsi < 35 ? "Oversold / Bullish Reversal" : ind.rsi > 70 ? "Overbought / Caution" : "Neutral Range (30-70)"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">MACD Line & Signal</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Trend & Momentum</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-purple-950 py-3.5 px-4">
                                        {ind.macd !== undefined ? `MACD: ${ind.macd} | Signal: ${ind.macd_signal || "N/A"}` : "N/A"}
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">Zero line & Signal Crossover</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className={
                                          ind.macd > (ind.macd_signal || 0) ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" : "bg-rose-50 text-rose-800 border-rose-300 font-bold"
                                        }>
                                          {ind.macd > (ind.macd_signal || 0) ? "Bullish Crossover" : "Bearish Crossover"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">MACD Histogram</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Momentum Acceleration</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-purple-950 py-3.5 px-4">
                                        {ind.macd_hist !== undefined ? ind.macd_hist : (ind.macd && ind.macd_signal ? (ind.macd - ind.macd_signal).toFixed(4) : "N/A")}
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">&gt; 0 Expanding Bullish</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-800 py-3.5 px-4">
                                        {ind.macd > (ind.macd_signal || 0) ? "Accelerating positive momentum" : "Decelerating / negative momentum"}
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Bollinger Bands (Upper / Middle / Lower)</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Volatility Bands</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-purple-950 py-3.5 px-4">
                                        {ind.bollinger_upper ? `${curr}${ind.bollinger_upper} / ${curr}${ind.bollinger_middle || ""} / ${curr}${ind.bollinger_lower}` : "N/A"}
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">±2 Standard Deviations</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-800 py-3.5 px-4">
                                        Price inside band envelope; volatility normalized.
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Exponential Moving Averages (EMA 20 & 50)</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Trend Filters</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-purple-950 py-3.5 px-4">
                                        EMA 20: {curr}{ind.ema_20 || "N/A"} | EMA 50: {curr}{ind.ema_50 || "N/A"}
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">EMA 20 &gt; EMA 50 Golden Trend</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className={
                                          ind.ema_20 && ind.ema_50 && ind.ema_20 > ind.ema_50 ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" : "bg-slate-100 text-slate-800 border-slate-300 font-bold"
                                        }>
                                          {ind.ema_20 && ind.ema_50 && ind.ema_20 > ind.ema_50 ? "Short-term Bullish Trend" : "Consolidation / Neutral"}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Average True Range (ATR)</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Historical Daily Volatility</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-purple-950 py-3.5 px-4">{curr}{ind.atr || data.volatility || "N/A"}</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">Daily Trading Span</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-800 py-3.5 px-4">
                                        Used for dynamic trailing stop loss and position sizing.
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Key Pivot Levels (Support & Resistance)</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Demand & Supply Pivots</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-purple-950 py-3.5 px-4">
                                        Support: {curr}{safeStr(r?.support) || "N/A"} | Resistance: {curr}{safeStr(r?.resistance) || "N/A"}
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-slate-600 py-3.5 px-4">Breakout & Breakdown Thresholds</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-800 py-3.5 px-4">
                                        Target entry near support; take-profit target near resistance.
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* ================= NEWS TAB ================= */}
                  {activeAgentTab === "news" && (
                    <div className="space-y-8">
                      {(() => {
                        const r = getAgentResult(data.news_analysis);
                        const raw = data.raw_news || [];
                        return (
                          <>
                            {/* Summary Callout Banner */}
                            <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-5">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-3">
                                  <Newspaper className="h-5 w-5 text-blue-700" />
                                  <span className="font-extrabold text-slate-950 text-base">Media Sentiment:</span>
                                  <Badge className={
                                    r?.sentiment === "Positive" ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold text-xs" :
                                    r?.sentiment === "Negative" ? "bg-rose-100 text-rose-900 border-rose-300 font-extrabold text-xs" :
                                    "bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-xs"
                                  }>
                                    {r?.sentiment || "Neutral"}
                                  </Badge>
                                  {r?.confidence && (
                                    <span className="text-sm font-semibold text-slate-600">({(r.confidence * 100).toFixed(0)}% Confidence)</span>
                                  )}
                                </div>
                                <p className="text-sm font-medium text-slate-800 leading-relaxed max-w-4xl">
                                  {safeStr(r?.summary) || "Analyzed real-time headlines and corporate news releases across major financial publications."}
                                </p>
                              </div>

                              <div className="text-right bg-white p-3 rounded-xl border border-blue-200 shadow-sm">
                                <span className="text-xs font-bold text-slate-500 uppercase block">Articles Scanned</span>
                                <span className="text-base font-black text-slate-950">{raw.length} Live Items</span>
                              </div>
                            </div>

                            {/* Standard Column Table 1: News Sentiment & Strategic Impact */}
                            <div className="space-y-3">
                              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <TableProperties className="h-4 w-4 text-blue-600" />
                                News Sentiment & Intelligence Overview (Standard Columns)
                              </h3>
                              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <Table>
                                  <TableHeader className="bg-slate-100 border-b-2 border-slate-200">
                                    <TableRow className="border-slate-200">
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Intelligence Factor</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Evaluation Score</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Classification</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Market Implication</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Synthesized Sentiment</TableCell>
                                      <TableCell className="text-sm font-bold text-blue-900 py-3.5 px-4">{safeStr(r?.sentiment) || "Neutral"}</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className={
                                          r?.sentiment === "Positive" ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" :
                                          r?.sentiment === "Negative" ? "bg-rose-50 text-rose-800 border-rose-300 font-bold" :
                                          "bg-amber-50 text-amber-800 border-amber-300 font-bold"
                                        }>
                                          {safeStr(r?.sentiment) || "Neutral"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-sm font-medium text-slate-800 py-3.5 px-4">
                                        Determines short-term narrative momentum and investor sentiment pressure.
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Market Impact Potential</TableCell>
                                      <TableCell className="text-sm font-bold text-blue-900 py-3.5 px-4">{safeStr(r?.market_impact) || "Moderate"}</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">High / Medium / Low</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-800 py-3.5 px-4">
                                        Magnitude of price volatility expected upon headline dissemination.
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Model Confidence</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-blue-900 py-3.5 px-4">{r?.confidence ? `${(r.confidence * 100).toFixed(1)}%` : "N/A"}</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Algorithmic Conviction</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-800 py-3.5 px-4">
                                        Cross-source consistency across Google News and Yahoo Finance feeds.
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            {/* Standard Column Table 2: Real-time Live Articles Stream */}
                            <div className="space-y-3">
                              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <Newspaper className="h-4 w-4 text-blue-600" />
                                Real-Time Live Articles Stream (Standard Columns)
                              </h3>
                              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <Table>
                                  <TableHeader className="bg-slate-100 border-b-2 border-slate-200">
                                    <TableRow className="border-slate-200">
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4 w-40">Publisher / Source</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Headline & Summary</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4 w-48">Published Timestamp</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4 w-32 text-right">Action</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {raw.length > 0 ? (
                                      raw.map((item: any, i: number) => (
                                        <TableRow key={i} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                          <TableCell className="text-sm font-bold text-blue-700 py-3.5 px-4">
                                            <Badge className="border-blue-300 bg-blue-50 text-blue-800 text-xs font-bold">
                                              {item.source || "Financial Media"}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-sm font-bold text-slate-900 py-3.5 px-4 leading-snug">
                                            {item.title || item.headline}
                                          </TableCell>
                                          <TableCell className="text-sm font-semibold text-slate-600 py-3.5 px-4">
                                            {item.published || "Recent"}
                                          </TableCell>
                                          <TableCell className="text-sm text-right py-3.5 px-4">
                                            {item.url ? (
                                              <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800"
                                              >
                                                Source <ExternalLink className="h-3.5 w-3.5" />
                                              </a>
                                            ) : (
                                              <span className="text-slate-400">—</span>
                                            )}
                                          </TableCell>
                                        </TableRow>
                                      ))
                                    ) : (
                                      <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-sm font-medium text-slate-500">
                                          No live news articles found for this ticker.
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* ================= RISK TAB ================= */}
                  {activeAgentTab === "risk" && (
                    <div className="space-y-8">
                      {(() => {
                        const r = getAgentResult(data.risk_assessment);
                        return (
                          <>
                            {/* Summary Callout Banner */}
                            <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-5">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-3">
                                  <Shield className="h-5 w-5 text-rose-700" />
                                  <span className="font-extrabold text-slate-950 text-base">Risk Stance:</span>
                                  <Badge className={
                                    r?.risk === "Low" ? "bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold text-xs" :
                                    r?.risk === "High" || r?.risk === "Critical" ? "bg-rose-100 text-rose-900 border-rose-300 font-extrabold text-xs" :
                                    "bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-xs"
                                  }>
                                    {r?.risk || "Moderate"}
                                  </Badge>
                                  <span className="text-sm font-bold text-slate-700">
                                    Recommended Position Size: <strong className="text-slate-950">{safeStr(r?.position_size) || "5%"}</strong>
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-slate-800 leading-relaxed max-w-4xl">
                                  {safeStr(r?.recommendation) || "Risk manager evaluates volatility limits, drawdown containment, and portfolio exposure."}
                                </p>
                              </div>

                              <div className="text-right bg-white p-3 rounded-xl border border-rose-200 shadow-sm">
                                <span className="text-xs font-bold text-slate-500 uppercase block">Investor Profile</span>
                                <span className="text-base font-black text-slate-950">{riskProfile} Profile</span>
                              </div>
                            </div>

                            {/* Standard Column Table 1: Risk Dimensions & Position Sizing Matrix */}
                            <div className="space-y-3">
                              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <TableProperties className="h-4 w-4 text-rose-600" />
                                Risk Parameters & Position Sizing Matrix (Standard Columns)
                              </h3>
                              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                <Table>
                                  <TableHeader className="bg-slate-100 border-b-2 border-slate-200">
                                    <TableRow className="border-slate-200">
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Risk Parameter</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Evaluated Level</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Benchmark / Rule</TableHead>
                                      <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Portfolio Management Action</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Overall Portfolio Risk</TableCell>
                                      <TableCell className="text-sm font-bold text-rose-900 py-3.5 px-4">{safeStr(r?.risk) || "Moderate"}</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Risk Profile: {riskProfile}</TableCell>
                                      <TableCell className="text-sm py-3.5 px-4">
                                        <Badge className="bg-rose-50 text-rose-800 border-rose-300 font-bold">
                                          Controlled Exposure
                                        </Badge>
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Recommended Position Sizing</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-rose-900 py-3.5 px-4">{safeStr(r?.position_size) || "5%"}</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Maximum Single Asset Cap: 10%</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-800 py-3.5 px-4">
                                        Prevents concentration risk while capturing upside potential.
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Volatility Exposure (ATR)</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-rose-900 py-3.5 px-4">{curr}{data.volatility || "Normal"}</TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Historical Daily Range</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-800 py-3.5 px-4">
                                        Set dynamic trailing stop-loss 1.5x - 2.0x ATR below purchase price.
                                      </TableCell>
                                    </TableRow>

                                    <TableRow className="hover:bg-slate-50 transition-colors">
                                      <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4">Confidence Adjustment</TableCell>
                                      <TableCell className="text-sm font-mono font-bold text-rose-900 py-3.5 px-4">
                                        {r?.confidence_adjustment !== undefined ? `${(r.confidence_adjustment * 100).toFixed(0)}%` : "0%"}
                                      </TableCell>
                                      <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Cross-Agent Agreement</TableCell>
                                      <TableCell className="text-sm font-medium text-slate-800 py-3.5 px-4">
                                        Applies discount factor if technical and fundamental signals conflict.
                                      </TableCell>
                                    </TableRow>
                                  </TableBody>
                                </Table>
                              </div>
                            </div>

                            {/* Standard Column Table 2: Identified Risk Factors */}
                            {r?.risk_factors && r.risk_factors.length > 0 && (
                              <div className="space-y-3">
                                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                                  Identified Risk Factors & Mitigation Actions (Standard Columns)
                                </h3>
                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                                  <Table>
                                    <TableHeader className="bg-slate-100 border-b-2 border-slate-200">
                                      <TableRow className="border-slate-200">
                                        <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4 w-16">#</TableHead>
                                        <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Identified Risk Factor</TableHead>
                                        <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4 w-36">Severity</TableHead>
                                        <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Recommended Mitigation Action</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {r.risk_factors.map((factor: any, i: number) => (
                                        <TableRow key={i} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                          <TableCell className="text-sm font-mono font-bold text-slate-500 py-3.5 px-4">{i + 1}</TableCell>
                                          <TableCell className="text-sm font-bold text-slate-900 py-3.5 px-4">{safeStr(factor)}</TableCell>
                                          <TableCell className="text-sm py-3.5 px-4">
                                            <Badge className="bg-rose-50 text-rose-800 border-rose-300 font-bold">
                                              Moderate Risk
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-sm font-medium text-slate-800 py-3.5 px-4">
                                            Enforce strict stop-loss rules and monitor earnings releases closely.
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}

                  {/* ================= ALL AGENTS MATRIX TAB ================= */}
                  {activeAgentTab === "all" && (
                    <div className="space-y-4">
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <Table>
                          <TableHeader className="bg-slate-100 border-b-2 border-slate-200">
                            <TableRow className="border-slate-200">
                              <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Specialist Agent</TableHead>
                              <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Core Domain</TableHead>
                              <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Stance / Recommendation</TableHead>
                              <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4">Key Assessment Summary</TableHead>
                              <TableHead className="text-slate-900 font-extrabold text-sm py-3.5 px-4 text-right">Confidence</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* News Agent */}
                            {(() => {
                              const r = getAgentResult(data.news_analysis);
                              return (
                                <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                  <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4 flex items-center gap-2">
                                    <Newspaper className="h-4 w-4 text-blue-600" />
                                    News Agent
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Media & Live Sentiment</TableCell>
                                  <TableCell className="text-sm py-3.5 px-4">
                                    <Badge className={
                                      r?.sentiment === "Positive" ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" :
                                      r?.sentiment === "Negative" ? "bg-rose-50 text-rose-800 border-rose-300 font-bold" :
                                      "bg-amber-50 text-amber-800 border-amber-300 font-bold"
                                    }>
                                      {r?.sentiment || "Neutral"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm font-medium text-slate-800 max-w-md py-3.5 px-4">
                                    {safeStr(r?.summary) || "No news summary available."}
                                  </TableCell>
                                  <TableCell className="text-sm text-right font-mono font-bold text-blue-900 py-3.5 px-4">
                                    {r?.confidence ? `${(r.confidence * 100).toFixed(0)}%` : "N/A"}
                                  </TableCell>
                                </TableRow>
                              );
                            })()}

                            {/* Technical Agent */}
                            {(() => {
                              const r = getAgentResult(data.technical_analysis);
                              return (
                                <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                  <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4 flex items-center gap-2">
                                    <BarChart3 className="h-4 w-4 text-purple-600" />
                                    Technical Agent
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Price Chart & Technicals</TableCell>
                                  <TableCell className="text-sm py-3.5 px-4">
                                    <Badge className={
                                      r?.signal === "BUY" ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" :
                                      r?.signal === "SELL" ? "bg-rose-50 text-rose-800 border-rose-300 font-bold" :
                                      "bg-amber-50 text-amber-800 border-amber-300 font-bold"
                                    }>
                                      {r?.signal || "HOLD"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm font-medium text-slate-800 max-w-md py-3.5 px-4">
                                    Trend: {safeStr(r?.trend) || "?"} ({safeStr(r?.strength) || "?"}) · Support: {curr}{safeStr(r?.support) || "?"}
                                  </TableCell>
                                  <TableCell className="text-sm text-right font-mono font-bold text-purple-900 py-3.5 px-4">
                                    {r?.confidence ? `${(r.confidence * 100).toFixed(0)}%` : "N/A"}
                                  </TableCell>
                                </TableRow>
                              );
                            })()}

                            {/* Fundamental Agent */}
                            {(() => {
                              const r = getAgentResult(data.fundamental_analysis);
                              return (
                                <TableRow className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                  <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-amber-600" />
                                    Fundamental Agent
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Corporate Reports & Multiples</TableCell>
                                  <TableCell className="text-sm py-3.5 px-4">
                                    <Badge className={
                                      r?.valuation === "Undervalued" ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" :
                                      r?.valuation === "Overvalued" ? "bg-rose-50 text-rose-800 border-rose-300 font-bold" :
                                      "bg-amber-50 text-amber-800 border-amber-300 font-bold"
                                    }>
                                      {r?.valuation || "Fair Value"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm font-medium text-slate-800 max-w-md py-3.5 px-4">
                                    Growth: {safeStr(r?.growth) || "?"} · Debt: {safeStr(r?.debt) || "?"} · {safeStr(r?.summary)}
                                  </TableCell>
                                  <TableCell className="text-sm text-right font-mono font-bold text-amber-900 py-3.5 px-4">
                                    {r?.confidence ? `${(r.confidence * 100).toFixed(0)}%` : "N/A"}
                                  </TableCell>
                                </TableRow>
                              );
                            })()}

                            {/* Risk Agent */}
                            {(() => {
                              const r = getAgentResult(data.risk_assessment);
                              return (
                                <TableRow className="hover:bg-slate-50 transition-colors">
                                  <TableCell className="font-bold text-slate-950 text-sm py-3.5 px-4 flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-rose-600" />
                                    Risk Agent
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold text-slate-700 py-3.5 px-4">Portfolio Protection & Sizing</TableCell>
                                  <TableCell className="text-sm py-3.5 px-4">
                                    <Badge className={
                                      r?.risk === "Low" ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold" :
                                      r?.risk === "High" || r?.risk === "Critical" ? "bg-rose-50 text-rose-800 border-rose-300 font-bold" :
                                      "bg-amber-50 text-amber-800 border-amber-300 font-bold"
                                    }>
                                      {r?.risk || "Moderate"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm font-medium text-slate-800 max-w-md py-3.5 px-4">
                                    Position Sizing: {safeStr(r?.position_size) || "5%"} · {safeStr(r?.recommendation)}
                                  </TableCell>
                                  <TableCell className="text-sm text-right font-mono font-bold text-rose-900 py-3.5 px-4">
                                    Risk Level: {safeStr(r?.risk) || "Moderate"}
                                  </TableCell>
                                </TableRow>
                              );
                            })()}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Search className="h-14 w-14 mb-4 text-slate-300" />
              <p className="text-lg font-bold text-slate-700">Enter a stock ticker above to start the Multi-Agent analysis</p>
              <p className="text-sm text-slate-500 mt-1">Try quick picks like RELIANCE, TCS, or AAPL, NVDA</p>
            </div>
          )}
        </TabsContent>

        {/* ============ PORTFOLIO TAB ============ */}
        <TabsContent value="portfolio" className="space-y-6">
          <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <CardHeader className="p-0 pb-6 border-b border-slate-200">
              <CardTitle className="text-2xl font-black text-slate-950 flex items-center gap-2">
                <Wallet className="h-6 w-6 text-indigo-600" />
                Live Paper Trading Portfolio
              </CardTitle>
              <CardDescription className="text-sm font-medium text-slate-600">
                Track your algorithmic AI-executed paper positions and balance.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-6 space-y-6">
              {portfolio ? (
                <div className="space-y-6">
                  {/* Top Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Portfolio Value</p>
                      <p className="text-3xl font-black text-slate-950">${portfolio.total_value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cash Balance</p>
                      <p className="text-3xl font-black text-slate-950">${portfolio.cash_balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Overall Return</p>
                      <p className={`text-3xl font-black ${portfolio.performance?.total_return >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {portfolio.performance?.total_return > 0 ? '+' : ''}{portfolio.performance?.total_return.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Add Pre-Existing Holding Form */}
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h3 className="text-base font-bold mb-3 text-slate-900">Add Pre-Existing Holding</h3>
                    <form onSubmit={handleAddHolding} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase">Ticker Symbol</label>
                        <input type="text" value={newHoldingTicker} onChange={e => setNewHoldingTicker(e.target.value.toUpperCase())} className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600" placeholder="e.g. AAPL" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase">Quantity</label>
                        <input type="number" min="1" value={newHoldingQty} onChange={e => setNewHoldingQty(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600" placeholder="e.g. 50" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase">Average Cost ($)</label>
                        <input type="number" min="0" step="0.01" value={newHoldingPrice} onChange={e => setNewHoldingPrice(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600" placeholder="e.g. 150.00" required />
                      </div>
                      <Button type="submit" disabled={addingHolding} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-[42px] rounded-lg shadow-sm">
                        {addingHolding ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : "Add Deposit"}
                      </Button>
                    </form>
                  </div>
                  
                  <h3 className="text-xl font-black mt-6 mb-4 border-b border-slate-200 pb-3 text-slate-950">Current Holdings</h3>
                  {portfolio.holdings && portfolio.holdings.length > 0 ? (
                    <div className="space-y-4">
                      {portfolio.holdings.map((h: any, i: number) => (
                        <div key={i} className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-black text-xl text-slate-950">{h.ticker}</span>
                            <div className="flex items-center gap-3">
                              <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200 font-bold text-xs">{h.quantity} Shares</Badge>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs font-bold border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                                onClick={() => handleAnalyzeHolding(h.ticker)} 
                                disabled={portfolioAnalyzing === h.ticker}
                              >
                                {portfolioAnalyzing === h.ticker ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Activity className="h-3.5 w-3.5 mr-1" />}
                                Analyze
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between text-sm font-semibold text-slate-600">
                            <span>Avg Cost: ${h.average_price.toFixed(2)}</span>
                            <span>Value: ${h.market_value.toFixed(2)}</span>
                          </div>
                          <div className={`text-base font-black mt-2 ${h.profit_loss >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            Unrealized P/L: {h.profit_loss >= 0 ? '+' : ''}${h.profit_loss.toFixed(2)}
                          </div>

                          {/* Inline Analysis Result for this Holding */}
                          {holdingAnalysis[h.ticker] && (
                            <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-slate-700 uppercase">AI Recommendation:</span>
                                <Badge className={`${holdingAnalysis[h.ticker].decision === 'BUY' ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold' : holdingAnalysis[h.ticker].decision === 'SELL' ? 'bg-rose-50 text-rose-800 border-rose-300 font-bold' : 'bg-amber-50 text-amber-800 border-amber-300 font-bold'}`}>
                                  {holdingAnalysis[h.ticker].decision} {holdingAnalysis[h.ticker].quantity > 0 ? `(Qty: ${holdingAnalysis[h.ticker].quantity})` : ""}
                                </Badge>
                                <span className="text-xs font-bold text-slate-600 ml-auto">Confidence: {((holdingAnalysis[h.ticker].confidence || 0) * 100).toFixed(0)}%</span>
                              </div>
                              {holdingAnalysis[h.ticker].reasoning && holdingAnalysis[h.ticker].reasoning.length > 0 && (
                                <ul className="text-sm font-medium text-slate-800 space-y-1">
                                  {holdingAnalysis[h.ticker].reasoning.map((r: any, j: number) => <li key={j}>• {safeStr(r)}</li>)}
                                </ul>
                              )}
                              {holdingAnalysis[h.ticker].explanation?.result?.summary && (
                                <p className="text-sm text-slate-700 italic border-l-2 border-indigo-500 pl-3 mt-2">
                                  {safeStr(holdingAnalysis[h.ticker].explanation.result.summary)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-slate-500">No active holdings. Add a pre-existing holding above to get started!</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* ============ SIGNALS TAB ============ */}
        <TabsContent value="signals" className="space-y-6">
          <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <CardHeader className="p-0 pb-6 border-b border-slate-200">
              <CardTitle className="text-2xl font-black text-slate-950 flex items-center gap-2">
                <Compass className="h-6 w-6 text-indigo-600" />
                Trading Signals Hub
              </CardTitle>
              <CardDescription className="text-sm font-medium text-slate-600">
                Detailed view of all generated multi-agent signals and confidence ratings.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 pt-6">
              {data ? (
                 <div className="flex items-center p-5 border border-slate-200 rounded-xl bg-slate-50 shadow-sm">
                    <div className="flex-1 space-y-1">
                      <p className="text-lg font-black text-slate-950">{data.ticker} - {data.decision || "HOLD"}</p>
                      <p className="text-sm font-medium text-slate-700">Confidence: {((data.confidence || 0) * 100).toFixed(0)}% | {safeStr(data.reasoning?.[0]) || "Analysis completed."}</p>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-800 border-indigo-200 font-bold text-xs py-1 px-3">Generated Now</Badge>
                  </div>
              ) : (
                <p className="text-sm font-medium text-slate-500">Run an analysis in the Overview tab to view active signals here.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ MEMORY TAB ============ */}
        <TabsContent value="memory" className="space-y-6">
          <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <CardHeader className="p-0 pb-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-black text-slate-950">
                  <Database className="h-6 w-6 text-indigo-600" />
                  Cognitive Memory Explorer (FAISS Vector Store)
                </CardTitle>
                <CardDescription className="text-sm font-medium text-slate-600">
                  Inspect memories, reflections, and past trade lessons stored across the 6 cognitive layers.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchMemories(memoryQuery, selectedLayer)}
                disabled={memoryLoading}
                className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold"
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${memoryLoading ? "animate-spin" : ""}`} />
                Refresh Database
              </Button>
            </CardHeader>
            <CardContent className="p-0 pt-6 space-y-6">
              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={memoryQuery}
                    onChange={(e) => setMemoryQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") fetchMemories(memoryQuery, selectedLayer); }}
                    placeholder="Search cognitive memories by ticker, lesson, or keyword (e.g. RELIANCE, RSI, earnings)..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <Button
                  onClick={() => fetchMemories(memoryQuery, selectedLayer)}
                  disabled={memoryLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 rounded-xl shadow-sm"
                >
                  {memoryLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Search className="h-4 w-4 mr-1.5" />}
                  Search FAISS
                </Button>
              </div>

              {/* Layer Filters */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-sm font-bold">
                <span className="text-slate-600 mr-1 flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-indigo-600" /> Filter Layer:
                </span>
                {["all", "short_term", "experience", "reflection", "knowledge"].map((lay) => (
                  <button
                    key={lay}
                    type="button"
                    onClick={() => { setSelectedLayer(lay); fetchMemories(memoryQuery, lay); }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedLayer === lay
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {lay === "all" ? "All Layers" : lay}
                  </button>
                ))}
              </div>

              {/* Memory List */}
              {memoryLoading ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                  <span className="text-sm font-bold text-slate-600">Searching vector database...</span>
                </div>
              ) : memoriesList && memoriesList.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {memoriesList.map((mem: any, i: number) => {
                    const layer = mem.layer || "general";
                    const layerColor = 
                      layer === "reflection" ? "bg-emerald-50 text-emerald-800 border-emerald-300" :
                      layer === "experience" ? "bg-purple-50 text-purple-800 border-purple-300" :
                      layer === "knowledge" ? "bg-amber-50 text-amber-800 border-amber-300" :
                      "bg-blue-50 text-blue-800 border-blue-300";

                    return (
                      <div key={i} className="p-5 bg-white border border-slate-200 rounded-xl space-y-2.5 hover:border-slate-300 shadow-sm transition-all">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2.5 py-1 rounded-md font-bold border ${layerColor}`}>
                              {layer} layer
                            </span>
                            {mem.ticker && (
                              <Badge className="text-xs bg-slate-100 text-slate-800 border-slate-300 font-bold">
                                {mem.ticker}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                            {mem.score && <span>Relevance: {(mem.score * 100).toFixed(0)}%</span>}
                            {mem.importance && <span>Importance: {mem.importance}</span>}
                            {mem.source && <span className="opacity-75">via {mem.source}</span>}
                          </div>
                        </div>
                        <p className="text-sm text-slate-900 leading-relaxed font-mono whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-200">
                          {mem.content || mem.summary}
                        </p>
                        {mem.timestamp && (
                          <div className="text-xs font-medium text-slate-500">
                            Saved: {new Date(mem.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 rounded-2xl bg-slate-50 border border-slate-200">
                  <Database className="h-10 w-10 text-slate-400 mx-auto mb-3 opacity-60" />
                  <p className="text-base font-bold text-slate-800">No memories matched your query.</p>
                  <p className="text-sm font-medium text-slate-500 mt-1">Run an analysis above to generate new cognitive trade memories!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ BACKTEST TAB ============ */}
        <TabsContent value="backtest" className="space-y-6">
          <Card className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <CardHeader className="p-0 pb-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl font-black text-slate-950">
                  <LineChart className="h-6 w-6 text-indigo-600" />
                  Dual-SMA Algorithmic Backtesting Simulator
                </CardTitle>
                <CardDescription className="text-sm font-medium text-slate-600">
                  Replays historical data using 20-day vs 50-day moving average crossover against benchmark buy-and-hold.
                </CardDescription>
              </div>
              
              {/* Period Selector Buttons */}
              <div className="flex items-center bg-slate-100 border border-slate-300 rounded-xl p-1 text-sm font-bold">
                {["6mo", "1y", "2y", "5y"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setBacktestPeriod(p)}
                    className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                      backtestPeriod === p
                        ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                        : "text-slate-600 hover:text-slate-950"
                    }`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0 pt-6 space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <Button 
                  onClick={handleBacktest} 
                  disabled={backtestLoading || !ticker} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md"
                >
                  {backtestLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LineChart className="h-4 w-4 mr-2" />}
                  Run {backtestPeriod.toUpperCase()} Backtest for {ticker || "Selected Stock"}
                </Button>
                {!ticker && <p className="text-sm font-medium text-slate-500">Select a stock ticker in the header above to begin.</p>}
              </div>
              
              {backtestData && (
                <div className="space-y-6 pt-4 border-t border-slate-200">
                  {/* Performance Metrics Cards */}
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Strategy Return</p>
                      <p className={`text-2xl font-black ${backtestData.total_return >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {backtestData.total_return > 0 ? '+' : ''}{backtestData.total_return}%
                      </p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Market Benchmark</p>
                      <p className={`text-2xl font-black ${backtestData.market_return >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                        {backtestData.market_return > 0 ? '+' : ''}{backtestData.market_return}%
                      </p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sharpe Ratio</p>
                      <p className="text-2xl font-black text-amber-700">{backtestData.sharpe_ratio}</p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Win Rate</p>
                      <p className="text-2xl font-black text-indigo-700">{backtestData.win_rate}%</p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Max Drawdown</p>
                      <p className="text-2xl font-black text-rose-700">{backtestData.max_drawdown}%</p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Trades Simulated</p>
                      <p className="text-2xl font-black text-slate-900">{backtestData.total_trades || 0}</p>
                    </div>
                  </div>

                  {/* Equity Curve Sample Table */}
                  {backtestData.chart_data && backtestData.chart_data.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-base font-extrabold text-slate-900">Equity Curve Timeline (Strategy vs Benchmark)</h4>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100 text-slate-900 border-b-2 border-slate-200">
                            <tr>
                              <th className="py-3 px-4 font-bold">Date</th>
                              <th className="py-3 px-4 font-bold">Strategy Return</th>
                              <th className="py-3 px-4 font-bold">Market Return</th>
                              <th className="py-3 px-4 font-bold">Alpha Spread</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 font-mono">
                            {backtestData.chart_data.slice(-12).map((row: any, idx: number) => {
                              const alpha = (Number(row.strategy || 0) - Number(row.market || 0)).toFixed(2);
                              const isPositiveAlpha = Number(alpha) >= 0;
                              return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                  <td className="py-3 px-4 text-slate-900 font-semibold">{row.date}</td>
                                  <td className={`py-3 px-4 font-black ${Number(row.strategy) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {Number(row.strategy) > 0 ? '+' : ''}{row.strategy}%
                                  </td>
                                  <td className={`py-3 px-4 font-semibold ${Number(row.market) >= 0 ? 'text-blue-700' : 'text-slate-700'}`}>
                                    {Number(row.market) > 0 ? '+' : ''}{row.market}%
                                  </td>
                                  <td className={`py-3 px-4 font-black ${isPositiveAlpha ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {isPositiveAlpha ? '+' : ''}{alpha}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
