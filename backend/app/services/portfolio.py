import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.models.user import User
from app.models.portfolio import Portfolio, Holding, Trade
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)

class PortfolioService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_or_create_default_user(self) -> User:
        result = await self.session.execute(select(User).where(User.email == "default@finmem-x.com"))
        user = result.scalars().first()
        if not user:
            user = User(
                email="default@finmem-x.com",
                name="Default Trader",
                password_hash="placeholder"
            )
            self.session.add(user)
            await self.session.flush()
        return user

    async def get_default_portfolio(self) -> Portfolio:
        user = await self.get_or_create_default_user()
        result = await self.session.execute(
            select(Portfolio)
            .options(selectinload(Portfolio.holdings), selectinload(Portfolio.trades))
            .where(Portfolio.user_id == user.id)
        )
        portfolio = result.scalars().first()
        if not portfolio:
            portfolio = Portfolio(
                user_id=user.id,
                name="Paper Trading Account",
                cash_balance=100000.0,
                total_value=100000.0
            )
            self.session.add(portfolio)
            await self.session.commit()
            
            # Re-fetch with relationships
            result = await self.session.execute(
                select(Portfolio)
                .options(selectinload(Portfolio.holdings), selectinload(Portfolio.trades))
                .where(Portfolio.user_id == user.id)
            )
            portfolio = result.scalars().first()
            
        return portfolio

    async def get_portfolio_state(self) -> Dict[str, Any]:
        portfolio = await self.get_default_portfolio()
        
        # Import adapter locally to avoid circular dependency if any
        from app.adapters.yahoo import YahooFinanceAdapter
        adapter = YahooFinanceAdapter()
        
        holdings_list = []
        total_holdings_value = 0.0
        
        for h in portfolio.holdings:
            # Dynamically fetch current price to calculate real P/L
            try:
                market_data = adapter.fetch_stock_data(h.ticker, days=5)
                if market_data:
                    current_price = market_data[-1]["close"]
                    h.market_value = h.quantity * current_price
                    total_cost = h.quantity * h.average_price
                    h.profit_loss = h.market_value - total_cost
            except Exception as e:
                logger.warning(f"Failed to fetch live price for {h.ticker}: {e}")
                
            holdings_list.append({
                "ticker": h.ticker,
                "quantity": h.quantity,
                "average_price": h.average_price,
                "market_value": h.market_value,
                "profit_loss": h.profit_loss
            })
            total_holdings_value += h.market_value
            
        # Commit updated market values
        await self.session.commit()
            
        return {
            "id": str(portfolio.id),
            "cash_balance": portfolio.cash_balance,
            "total_value": portfolio.cash_balance + total_holdings_value,
            "holdings": holdings_list,
            "performance": {"total_return": ((portfolio.cash_balance + total_holdings_value - 100000.0) / 100000.0) * 100}
        }

    async def add_initial_holding(self, ticker: str, quantity: int, average_price: float) -> Dict[str, Any]:
        portfolio = await self.get_default_portfolio()
        ticker = ticker.upper()
        
        holding = next((h for h in portfolio.holdings if h.ticker == ticker), None)
        if holding:
            # Update existing holding cost basis
            total_cost = (holding.quantity * holding.average_price) + (quantity * average_price)
            holding.quantity += quantity
            holding.average_price = total_cost / holding.quantity
        else:
            holding = Holding(
                portfolio_id=portfolio.id, 
                ticker=ticker, 
                quantity=quantity, 
                average_price=average_price, 
                market_value=quantity * average_price,
                profit_loss=0.0
            )
            self.session.add(holding)
            
        await self.session.commit()
        return {"success": True, "message": f"Successfully added {quantity} shares of {ticker} as an initial holding."}

    async def execute_trade(self, ticker: str, action: str, quantity: int, current_price: float, reason: str = "") -> Dict[str, Any]:
        portfolio = await self.get_default_portfolio()
        total_value = quantity * current_price
        
        if action.upper() == "BUY":
            if portfolio.cash_balance < total_value:
                return {"success": False, "message": "Insufficient cash balance."}
                
            portfolio.cash_balance -= total_value
            
            # Find existing holding
            holding = next((h for h in portfolio.holdings if h.ticker == ticker), None)
            if holding:
                # Update average price
                total_cost = (holding.quantity * holding.average_price) + total_value
                holding.quantity += quantity
                holding.average_price = total_cost / holding.quantity
            else:
                holding = Holding(portfolio_id=portfolio.id, ticker=ticker, quantity=quantity, average_price=current_price, market_value=total_value)
                self.session.add(holding)
                
        elif action.upper() == "SELL":
            holding = next((h for h in portfolio.holdings if h.ticker == ticker), None)
            if not holding or holding.quantity < quantity:
                return {"success": False, "message": "Insufficient shares to sell."}
                
            portfolio.cash_balance += total_value
            holding.quantity -= quantity
            
            if holding.quantity == 0:
                self.session.delete(holding)
        else:
            return {"success": False, "message": "Invalid action."}
            
        trade = Trade(portfolio_id=portfolio.id, ticker=ticker, action=action.upper(), shares=quantity, price=current_price, total_value=total_value, reason=reason)
        self.session.add(trade)
        await self.session.commit()
        return {"success": True, "message": f"Successfully executed {action} of {quantity} {ticker} at ${current_price}"}
