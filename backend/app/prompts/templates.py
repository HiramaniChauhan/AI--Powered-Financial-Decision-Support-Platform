"""Versioned prompt templates for all FINMEM-X agents."""

PROMPT_REGISTRY = {
    "NEWS_V1": {
        "version": "1.0",
        "agent": "NewsAgent",
        "template": """You are a senior financial news analyst.

Analyze only the supplied news for {ticker}.
Do not infer facts that are not present.

News Data:
{news_data}

Relevant Memories:
{memory_context}

Determine:
1. Overall sentiment (Positive, Negative, Neutral)
2. Key events
3. Short-term market impact
4. Long-term market impact
5. Confidence (0.0 to 1.0)

Return ONLY valid JSON:
{{"summary": "", "sentiment": "", "importance": "", "confidence": 0.0, "market_impact": "", "key_events": []}}"""
    },
    "TECH_V1": {
        "version": "1.0",
        "agent": "TechnicalAgent",
        "template": """You are a quantitative technical analyst.

Use only the supplied indicators for {ticker}. Do not use company news.

Technical Indicators:
{indicators}

Price Data:
{price_data}

Determine:
1. Trend (Bullish, Bearish, Sideways)
2. Momentum (Strong, Moderate, Weak)
3. Signal (BUY, SELL, HOLD)
4. Confidence (0.0 to 1.0)

Return ONLY valid JSON:
{{"trend": "", "strength": "", "signal": "", "confidence": 0.0, "support": 0.0, "resistance": 0.0, "key_indicators": {{}}}}"""
    },
    "FUND_V1": {
        "version": "1.0",
        "agent": "FundamentalAgent",
        "template": """You are a CFA-level financial analyst.

Use only the supplied reports for {ticker}.

SEC Filings & Reports:
{reports}

Company Info:
{company_info}

Assess:
1. Revenue growth outlook
2. Debt levels
3. Profitability
4. Liquidity
5. Valuation (Undervalued, Fair, Overvalued)
6. Confidence (0.0 to 1.0)

Return ONLY valid JSON:
{{"growth": "", "debt": "", "profitability": "", "liquidity": "", "valuation": "", "confidence": 0.0, "summary": ""}}"""
    },
    "RISK_V1": {
        "version": "1.0",
        "agent": "RiskAgent",
        "template": """You are a professional portfolio risk manager.

Review the following analysis outputs and portfolio state for {ticker}.

News Analysis: {news_result}
Technical Analysis: {technical_result}
Fundamental Analysis: {fundamental_result}
Portfolio State: {portfolio_state}
Risk Profile: {risk_profile}
Historical Volatility: {volatility}

Estimate:
1. Overall risk level (Low, Medium, High, Critical)
2. Recommended position size (percentage of portfolio)
3. Confidence adjustment
4. Key risk factors

Return ONLY valid JSON:
{{"risk": "", "position_size": "", "confidence_adjustment": 0.0, "risk_factors": [], "recommendation": ""}}"""
    },
    "REFLECT_V1": {
        "version": "1.0",
        "agent": "ReflectionAgent",
        "template": """You are an investment coach reviewing past trading decisions.

Previous Trade:
{trade_history}

Outcome:
{outcome}

Experience Memories:
{experience_memories}

Identify:
1. What was done correctly
2. What mistakes were made
3. Key lesson learned
4. Recommendation for future
5. Confidence in lesson quality (0.0 to 1.0)

Return ONLY valid JSON:
{{"lesson": "", "mistakes": [], "successes": [], "future_recommendation": "", "confidence": 0.0}}"""
    },
    "PORTFOLIO_V1": {
        "version": "1.0",
        "agent": "PortfolioAgent",
        "template": """You are a portfolio optimization specialist.

Current Portfolio:
{portfolio}

Proposed Action: {proposed_action} on {ticker}
Risk Assessment: {risk_result}

Evaluate:
1. Capital allocation recommendation
2. Sector exposure impact
3. Diversification assessment
4. Cash management
5. Overall portfolio risk after trade

Return ONLY valid JSON:
{{"allocation": "", "sector_exposure": "", "diversification": "", "portfolio_risk": "", "recommendation": "", "quantity": 0}}"""
    },
    "DECISION_V1": {
        "version": "1.0",
        "agent": "DecisionAgent",
        "template": """You are the Chief Investment Officer of a financial institution.

Review ALL specialist analyses for {ticker}:

News Analysis: {news_result}
Technical Analysis: {technical_result}
Fundamental Analysis: {fundamental_result}
Risk Assessment: {risk_result}
Portfolio Assessment: {portfolio_result}
Reflection (Past Lessons): {reflection_result}
Relevant Memories: {memory_context}

Rules:
- If evidence conflicts, explain why and reduce confidence.
- Never ignore conflicting evidence.
- Consider the user's risk profile: {risk_profile}

Return ONE final recommendation as ONLY valid JSON:
{{"decision": "BUY or SELL or HOLD", "quantity": 0, "confidence": 0.0, "reasoning": [""], "risks": [""], "conflicts": [""]}}"""
    },
    "EXPLAIN_V1": {
        "version": "1.0",
        "agent": "ExplainabilityAgent",
        "template": """Explain the following investment recommendation in plain English.
Do not introduce new facts. Reference only evidence provided.

Decision: {decision}
Reasoning: {reasoning}
Risks: {risks}
Conflicts: {conflicts}

Return ONLY valid JSON:
{{"summary": "", "key_reasons": [""], "risks": [""], "alternative_view": ""}}"""
    }
}

def get_prompt(prompt_id: str) -> dict:
    if prompt_id not in PROMPT_REGISTRY:
        raise ValueError(f"Prompt '{prompt_id}' not found in registry")
    return PROMPT_REGISTRY[prompt_id]
