"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, BrainCircuit, LineChart, Wallet, Search, Loader2, ArrowRight, TrendingUp, TrendingDown, Minus, Shield, AlertTriangle, Newspaper, BarChart3, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [ticker, setTicker] = useState("");
  const [riskProfile, setRiskProfile] = useState("Moderate");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [backtestData, setBacktestData] = useState<any>(null);
  
  const [portfolio, setPortfolio] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  const [newHoldingTicker, setNewHoldingTicker] = useState("");
  const [newHoldingQty, setNewHoldingQty] = useState("");
  const [newHoldingPrice, setNewHoldingPrice] = useState("");
  const [addingHolding, setAddingHolding] = useState(false);

  // Portfolio analysis state
  const [portfolioAnalyzing, setPortfolioAnalyzing] = useState<string | null>(null);
  const [holdingAnalysis, setHoldingAnalysis] = useState<Record<string, any>>({});

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/portfolio`);
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
  }, []);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/analysis/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, risk_profile: riskProfile })
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
      const marketRes = await fetch(`http://localhost:8000/api/v1/market/${data.ticker}`);
      if (!marketRes.ok) throw new Error("Failed to fetch market price");
      const marketData = await marketRes.json();
      const currentPrice = marketData.data.close || 150.0;
      
      const quantity = data.quantity && data.quantity > 0 ? data.quantity : 10;
      
      const response = await fetch(`http://localhost:8000/api/v1/portfolio/trade`, {
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
      const response = await fetch(`http://localhost:8000/api/v1/portfolio/holdings/initial`, {
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
      const response = await fetch(`http://localhost:8000/api/v1/analysis/stock`, {
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
      const response = await fetch(`http://localhost:8000/api/v1/backtest/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, period: "1y" })
      });
      if (!response.ok) throw new Error("Failed to run backtest");
      const result = await response.json();
      setBacktestData(result.data);
    } catch (error) {
      console.error(error);
      alert("Failed to run backtest.");
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
    if (s === "BUY" || s === "BULLISH" || s === "POSITIVE") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
    if (s === "SELL" || s === "BEARISH" || s === "NEGATIVE") return <TrendingDown className="h-4 w-4 text-rose-400" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  const getSignalColor = (signal: string) => {
    const s = (signal || "").toUpperCase();
    if (s === "BUY" || s === "BULLISH" || s === "POSITIVE") return "text-emerald-400";
    if (s === "SELL" || s === "BEARISH" || s === "NEGATIVE") return "text-rose-400";
    return "text-amber-400";
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          FINMEM-X Intelligence
        </h2>
        
        <form onSubmit={handleAnalyze} className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="Enter Stock Ticker (e.g. AAPL)" 
              className="pl-8 pr-4 py-2 bg-transparent text-sm focus:outline-none text-slate-200 placeholder-slate-500 uppercase w-48"
            />
          </div>
          <div className="border-l border-slate-700 pl-2">
            <select 
              value={riskProfile} 
              onChange={(e) => setRiskProfile(e.target.value)}
              className="bg-transparent text-sm focus:outline-none text-slate-200 py-2 pr-4 cursor-pointer"
            >
              <option value="Conservative" className="bg-slate-900">Conservative</option>
              <option value="Moderate" className="bg-slate-900">Moderate</option>
              <option value="Aggressive" className="bg-slate-900">Aggressive</option>
            </select>
          </div>
          <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Analyze"}
          </Button>
        </form>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="signals">Trading Signals</TabsTrigger>
          <TabsTrigger value="memory">Memory Explorer</TabsTrigger>
          <TabsTrigger value="backtest">ML Backtesting</TabsTrigger>
        </TabsList>
        
        {/* ============ OVERVIEW TAB ============ */}
        <TabsContent value="overview" className="space-y-4">
          {data ? (
            <div className="space-y-4">
              {/* Agent Summary Cards Row */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* News Agent Card */}
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">News Agent</CardTitle>
                    <Newspaper className="h-4 w-4 text-blue-400" />
                  </CardHeader>
                  <CardContent>
                    {(() => { const r = getAgentResult(data.news_analysis); return r ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getSignalIcon(r.sentiment)}
                          <span className={`text-lg font-bold ${getSignalColor(r.sentiment)}`}>{r.sentiment || "N/A"}</span>
                        </div>
                        <p className="text-xs text-slate-400">Confidence: {((r.confidence || 0) * 100).toFixed(0)}%</p>
                        <p className="text-xs text-slate-400 mt-1">Impact: {r.market_impact || r.importance || "Unknown"}</p>
                      </div>
                    ) : <p className="text-sm text-slate-500">Pending...</p> })()}
                  </CardContent>
                </Card>

                {/* Technical Agent Card */}
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Technical Agent</CardTitle>
                    <BarChart3 className="h-4 w-4 text-purple-400" />
                  </CardHeader>
                  <CardContent>
                    {(() => { const r = getAgentResult(data.technical_analysis); return r ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getSignalIcon(r.signal)}
                          <span className={`text-lg font-bold ${getSignalColor(r.signal)}`}>{r.signal || "N/A"}</span>
                        </div>
                        <p className="text-xs text-slate-400">Trend: {r.trend || "?"} ({r.strength || "?"})</p>
                        <p className="text-xs text-slate-400 mt-1">Confidence: {((r.confidence || 0) * 100).toFixed(0)}%</p>
                      </div>
                    ) : <p className="text-sm text-slate-500">Pending...</p> })()}
                  </CardContent>
                </Card>

                {/* Fundamental Agent Card */}
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Fundamental Agent</CardTitle>
                    <FileText className="h-4 w-4 text-amber-400" />
                  </CardHeader>
                  <CardContent>
                    {(() => { const r = getAgentResult(data.fundamental_analysis); return r ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {getSignalIcon(r.valuation === "Undervalued" ? "BUY" : r.valuation === "Overvalued" ? "SELL" : "HOLD")}
                          <span className={`text-lg font-bold ${getSignalColor(r.valuation === "Undervalued" ? "BUY" : r.valuation === "Overvalued" ? "SELL" : "HOLD")}`}>{r.valuation || "N/A"}</span>
                        </div>
                        <p className="text-xs text-slate-400">Growth: {r.growth || "?"}</p>
                        <p className="text-xs text-slate-400 mt-1">Confidence: {((r.confidence || 0) * 100).toFixed(0)}%</p>
                      </div>
                    ) : <p className="text-sm text-slate-500">Pending...</p> })()}
                  </CardContent>
                </Card>

                {/* Risk Agent Card */}
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Risk Agent</CardTitle>
                    <Shield className="h-4 w-4 text-rose-400" />
                  </CardHeader>
                  <CardContent>
                    {(() => { const r = getAgentResult(data.risk_assessment); return r ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertTriangle className={`h-4 w-4 ${r.risk === "Low" ? "text-emerald-400" : r.risk === "High" || r.risk === "Critical" ? "text-rose-400" : "text-amber-400"}`} />
                          <span className={`text-lg font-bold ${r.risk === "Low" ? "text-emerald-400" : r.risk === "High" || r.risk === "Critical" ? "text-rose-400" : "text-amber-400"}`}>{r.risk || "N/A"}</span>
                        </div>
                        <p className="text-xs text-slate-400">Position: {r.position_size || "?"}</p>
                        <p className="text-xs text-slate-400 mt-1 truncate" title={r.recommendation}>{r.recommendation || "N/A"}</p>
                      </div>
                    ) : <p className="text-sm text-slate-500">Pending...</p> })()}
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Analysis + Decision */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Left: Detailed Agent Outputs */}
                <Card className="col-span-4 bg-slate-900/50 border-slate-800 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Agent Analysis Details ({data.ticker})</CardTitle>
                    <CardDescription className="text-slate-400">
                      Detailed outputs from each specialist agent.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* News Analysis Detail */}
                    <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800 text-sm leading-relaxed text-slate-300">
                      <div className="flex items-center gap-2 mb-2">
                        <Newspaper className="h-4 w-4 text-blue-400" />
                        <span className="font-semibold text-white">News Analysis</span>
                        {(() => { const r = getAgentResult(data.news_analysis); return r?.sentiment ? (
                          <Badge className={`ml-auto ${r.sentiment === "Positive" ? "bg-emerald-500/20 text-emerald-400" : r.sentiment === "Negative" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"}`}>{r.sentiment}</Badge>
                        ) : null })()}
                      </div>
                      {(() => { const r = getAgentResult(data.news_analysis); return r ? (
                        <div>
                          <p>{safeStr(r.summary) || "No summary available."}</p>
                          {r.key_events && r.key_events.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs font-semibold text-slate-500">Key Events:</span>
                              <ul className="list-disc list-inside text-xs text-slate-400 mt-1">
                                {r.key_events.map((evt: any, i: number) => <li key={i}>{safeStr(evt)}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : "No news analysis available." })()}
                    </div>

                    {/* Technical Analysis Detail */}
                    <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800 text-sm leading-relaxed text-slate-300">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-4 w-4 text-purple-400" />
                        <span className="font-semibold text-white">Technical Analysis</span>
                        {(() => { const r = getAgentResult(data.technical_analysis); return r?.signal ? (
                          <Badge className={`ml-auto ${r.signal === "BUY" ? "bg-emerald-500/20 text-emerald-400" : r.signal === "SELL" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"}`}>{r.signal}</Badge>
                        ) : null })()}
                      </div>
                      {(() => { const r = getAgentResult(data.technical_analysis); return r ? (
                        <div className="space-y-1">
                          <p><strong>Trend:</strong> {safeStr(r.trend) || "?"} ({safeStr(r.strength) || "?"})</p>
                          <p><strong>Signal:</strong> {safeStr(r.signal) || "?"}</p>
                          <p><strong>Support:</strong> ${safeStr(r.support) || "?"} | <strong>Resistance:</strong> ${safeStr(r.resistance) || "?"}</p>
                          {r.key_indicators && Object.keys(r.key_indicators).length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs font-semibold text-slate-500">Indicators:</span>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Object.entries(r.key_indicators).map(([k, v]: [string, any]) => (
                                  <Badge key={k} variant="outline" className="text-xs border-slate-700 text-slate-400">{k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : "No technical analysis available." })()}
                    </div>

                    {/* Fundamental Analysis Detail */}
                    <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800 text-sm leading-relaxed text-slate-300">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-amber-400" />
                        <span className="font-semibold text-white">Fundamental Analysis</span>
                        {(() => { const r = getAgentResult(data.fundamental_analysis); return r?.valuation ? (
                          <Badge className={`ml-auto ${r.valuation === "Undervalued" ? "bg-emerald-500/20 text-emerald-400" : r.valuation === "Overvalued" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"}`}>{r.valuation}</Badge>
                        ) : null })()}
                      </div>
                      {(() => { const r = getAgentResult(data.fundamental_analysis); return r ? (
                        <div className="space-y-1">
                          <p>{safeStr(r.summary) || "No summary available."}</p>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                            <span><strong>Growth:</strong> {safeStr(r.growth) || "?"}</span>
                            <span><strong>Debt:</strong> {safeStr(r.debt) || "?"}</span>
                            <span><strong>Profitability:</strong> {safeStr(r.profitability) || "?"}</span>
                            <span><strong>Liquidity:</strong> {safeStr(r.liquidity) || "?"}</span>
                          </div>
                        </div>
                      ) : "No fundamental analysis available." })()}
                    </div>

                    {/* Risk Assessment Detail */}
                    <div className="p-4 rounded-lg bg-slate-950/50 border border-slate-800 text-sm leading-relaxed text-slate-300">
                      <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-rose-400" />
                        <span className="font-semibold text-white">Risk Assessment</span>
                        {(() => { const r = getAgentResult(data.risk_assessment); return r?.risk ? (
                          <Badge className={`ml-auto ${r.risk === "Low" ? "bg-emerald-500/20 text-emerald-400" : r.risk === "High" || r.risk === "Critical" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"}`}>{r.risk}</Badge>
                        ) : null })()}
                      </div>
                      {(() => { const r = getAgentResult(data.risk_assessment); return r ? (
                        <div className="space-y-1">
                          <p><strong>Risk Level:</strong> {safeStr(r.risk) || "?"} | <strong>Position Size:</strong> {safeStr(r.position_size) || "?"}</p>
                          <p>{safeStr(r.recommendation) || "No recommendation."}</p>
                          {r.risk_factors && r.risk_factors.length > 0 && (
                            <div className="mt-2">
                              <span className="text-xs font-semibold text-slate-500">Risk Factors:</span>
                              <ul className="list-disc list-inside text-xs text-slate-400 mt-1">
                                {r.risk_factors.map((f: any, i: number) => <li key={i}>{safeStr(f)}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : "No risk assessment available." })()}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Right: Final Decision */}
                <Card className="col-span-3 bg-slate-900/50 border-slate-800 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Final Agent Decision</CardTitle>
                    <CardDescription className="text-slate-400">
                      CIO Decision Engine — synthesized from all agents.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`p-6 rounded-xl border flex flex-col items-center justify-center text-center space-y-4 ${
                      data.decision === 'BUY' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' :
                      data.decision === 'SELL' ? 'bg-rose-500/10 border-rose-500/50 text-rose-400' :
                      'bg-slate-800/30 border-slate-700 text-slate-300'
                    }`}>
                      <div className="text-4xl font-extrabold">{data.decision || "HOLD"}</div>
                      {data.decision !== 'HOLD' && <div className="text-lg font-bold">Qty: {data.quantity > 0 ? data.quantity : "TBD"}</div>}
                      <div className="text-sm opacity-80">Confidence: {((data.confidence || 0) * 100).toFixed(1)}%</div>
                    </div>

                    {/* Reasoning */}
                    {data.reasoning && data.reasoning.length > 0 && (
                      <div className="mt-4 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                        <span className="text-xs font-semibold text-slate-500 block mb-2">Reasoning</span>
                        <ul className="space-y-1">
                          {data.reasoning.map((r: any, i: number) => (
                            <li key={i} className="text-sm text-slate-400">• {safeStr(r)}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Risks */}
                    {data.risks && data.risks.length > 0 && (
                      <div className="mt-3 p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                        <span className="text-xs font-semibold text-rose-400 block mb-2">Risks</span>
                        <ul className="space-y-1">
                          {data.risks.map((r: any, i: number) => (
                            <li key={i} className="text-sm text-slate-400">⚠ {safeStr(r)}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Explanation */}
                    {data.explanation?.result?.summary && (
                      <p className="mt-4 text-sm text-slate-400 italic border-l-2 border-indigo-500 pl-3">
                        {safeStr(data.explanation.result.summary)}
                      </p>
                    )}
                    
                    {data.decision !== 'HOLD' && (
                      <Button 
                        onClick={handleExecuteTrade} 
                        disabled={executing}
                        className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {executing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                        Execute {data.decision} Trade
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Search className="h-12 w-12 mb-4 opacity-20" />
              <p>Search for a ticker above to run the Multi-Agent analysis</p>
            </div>
          )}
        </TabsContent>

        {/* ============ PORTFOLIO TAB ============ */}
        <TabsContent value="portfolio" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <CardTitle>Live Paper Trading Portfolio</CardTitle>
              <CardDescription className="text-slate-400">Track your AI-assisted algorithmic trades.</CardDescription>
            </CardHeader>
            <CardContent>
              {portfolio ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                      <p className="text-sm text-slate-400">Total Value</p>
                      <p className="text-2xl font-bold">${portfolio.total_value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                      <p className="text-sm text-slate-400">Cash Balance</p>
                      <p className="text-2xl font-bold">${portfolio.cash_balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                    </div>
                    <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                      <p className="text-sm text-slate-400">Return</p>
                      <p className={`text-2xl font-bold ${portfolio.performance?.total_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {portfolio.performance?.total_return > 0 ? '+' : ''}{portfolio.performance?.total_return.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Add Pre-Existing Holding Form */}
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <h3 className="text-sm font-semibold mb-3 text-slate-300">Add Pre-Existing Holding</h3>
                    <form onSubmit={handleAddHolding} className="flex gap-3 items-end">
                      <div className="space-y-1 flex-1">
                        <label className="text-xs text-slate-500">Ticker</label>
                        <input type="text" value={newHoldingTicker} onChange={e => setNewHoldingTicker(e.target.value.toUpperCase())} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. AAPL" required />
                      </div>
                      <div className="space-y-1 flex-1">
                        <label className="text-xs text-slate-500">Quantity</label>
                        <input type="number" min="1" value={newHoldingQty} onChange={e => setNewHoldingQty(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. 50" required />
                      </div>
                      <div className="space-y-1 flex-1">
                        <label className="text-xs text-slate-500">Average Cost ($)</label>
                        <input type="number" min="0" step="0.01" value={newHoldingPrice} onChange={e => setNewHoldingPrice(e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. 150.00" required />
                      </div>
                      <Button type="submit" disabled={addingHolding} className="bg-indigo-600 hover:bg-indigo-700 h-[38px]">
                        {addingHolding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Deposit"}
                      </Button>
                    </form>
                  </div>
                  
                  <h3 className="text-lg font-semibold mt-4 mb-4 border-b border-slate-800 pb-2">Current Holdings</h3>
                  {portfolio.holdings && portfolio.holdings.length > 0 ? (
                    <div className="space-y-4">
                      {portfolio.holdings.map((h: any, i: number) => (
                        <div key={i} className="p-4 bg-slate-800/30 rounded-lg border border-slate-700">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-lg">{h.ticker}</span>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-indigo-500/20 text-indigo-400">{h.quantity} Shares</Badge>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10"
                                onClick={() => handleAnalyzeHolding(h.ticker)} 
                                disabled={portfolioAnalyzing === h.ticker}
                              >
                                {portfolioAnalyzing === h.ticker ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Activity className="h-3 w-3 mr-1" />}
                                Analyze
                              </Button>
                            </div>
                          </div>
                          <div className="flex justify-between text-sm text-slate-400">
                            <span>Avg Cost: ${h.average_price.toFixed(2)}</span>
                            <span>Value: ${h.market_value.toFixed(2)}</span>
                          </div>
                          <div className={`text-sm font-bold mt-2 ${h.profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            P/L: {h.profit_loss >= 0 ? '+' : ''}${h.profit_loss.toFixed(2)}
                          </div>

                          {/* Inline Analysis Result for this Holding */}
                          {holdingAnalysis[h.ticker] && (
                            <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-400">AI Recommendation:</span>
                                <Badge className={`${holdingAnalysis[h.ticker].decision === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : holdingAnalysis[h.ticker].decision === 'SELL' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                  {holdingAnalysis[h.ticker].decision} {holdingAnalysis[h.ticker].quantity > 0 ? `(Qty: ${holdingAnalysis[h.ticker].quantity})` : ""}
                                </Badge>
                                <span className="text-xs text-slate-500 ml-auto">Confidence: {((holdingAnalysis[h.ticker].confidence || 0) * 100).toFixed(0)}%</span>
                              </div>
                              {holdingAnalysis[h.ticker].reasoning && holdingAnalysis[h.ticker].reasoning.length > 0 && (
                                <ul className="text-xs text-slate-400 space-y-0.5">
                                  {holdingAnalysis[h.ticker].reasoning.map((r: any, j: number) => <li key={j}>• {safeStr(r)}</li>)}
                                </ul>
                              )}
                              {holdingAnalysis[h.ticker].explanation?.result?.summary && (
                                <p className="text-xs text-slate-500 italic border-l-2 border-indigo-500 pl-2 mt-1">
                                  {safeStr(holdingAnalysis[h.ticker].explanation.result.summary)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400">No active holdings. Add a pre-existing holding above to get started!</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* ============ SIGNALS TAB ============ */}
        <TabsContent value="signals" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <CardTitle>Trading Signals Hub</CardTitle>
              <CardDescription className="text-slate-400">Detailed view of all generated multi-agent signals.</CardDescription>
            </CardHeader>
            <CardContent>
              {data ? (
                 <div className="flex items-center p-4 border border-slate-800 rounded-lg bg-slate-950/50">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{data.ticker} - {data.decision || "HOLD"}</p>
                      <p className="text-sm text-slate-400">Confidence: {((data.confidence || 0) * 100).toFixed(0)}% | {safeStr(data.reasoning?.[0]) || "Analysis completed."}</p>
                    </div>
                    <Badge variant="outline" className="text-indigo-400 border-indigo-500/50">Just Now</Badge>
                  </div>
              ) : (
                <p className="text-slate-400">Run an analysis to see signals here...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ MEMORY TAB ============ */}
        <TabsContent value="memory" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <CardTitle>Memory Database Explorer</CardTitle>
              <CardDescription className="text-slate-400">FAISS embeddings retrieved during the last analysis.</CardDescription>
            </CardHeader>
            <CardContent>
              {data && data.memories && data.memories.length > 0 ? (
                <div className="space-y-3">
                  {data.memories.map((mem: any, i: number) => (
                    <div key={i} className="p-3 bg-slate-800/30 border border-slate-800 rounded-md">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">{mem.layer || 'unknown'} layer</Badge>
                      </div>
                      <p className="text-sm text-slate-300">{mem.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">Search for a ticker to retrieve related memories...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ BACKTEST TAB ============ */}
        <TabsContent value="backtest" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
              <CardTitle>Machine Learning Workflows: Backtesting Simulator</CardTitle>
              <CardDescription className="text-slate-400">Evaluate algorithmic strategy historically against the market.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Button onClick={handleBacktest} disabled={backtestLoading || !ticker} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {backtestLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LineChart className="h-4 w-4 mr-2" />}
                  Run 1-Year Backtest for {ticker || "Ticker"}
                </Button>
                {!ticker && <p className="text-xs text-slate-500">Please search for a ticker first above.</p>}
              </div>
              
              {backtestData && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-4 border-t border-slate-800">
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-sm text-slate-400 mb-1">Strategy Return (1Y)</p>
                    <p className={`text-2xl font-bold ${backtestData.total_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {backtestData.total_return > 0 ? '+' : ''}{backtestData.total_return}%
                    </p>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-sm text-slate-400 mb-1">Market Return (1Y)</p>
                    <p className={`text-2xl font-bold ${backtestData.market_return >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                      {backtestData.market_return > 0 ? '+' : ''}{backtestData.market_return}%
                    </p>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-sm text-slate-400 mb-1">Sharpe Ratio</p>
                    <p className="text-2xl font-bold text-amber-400">{backtestData.sharpe_ratio}</p>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <p className="text-sm text-slate-400 mb-1">Win Rate</p>
                    <p className="text-2xl font-bold text-indigo-400">{backtestData.win_rate}%</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
