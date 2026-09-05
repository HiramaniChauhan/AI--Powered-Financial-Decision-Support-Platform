import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)

class IndicatorCalculator:
    @staticmethod
    def calculate_all(price_data: list) -> dict:
        if not price_data or len(price_data) < 20:
            return {"error": "Insufficient price data (need at least 20 data points)"}
        df = pd.DataFrame(price_data)
        result = {}
        try:
            delta = df['close'].diff()
            gain = delta.where(delta > 0, 0).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss.replace(0, np.nan)
            df['rsi'] = 100 - (100 / (1 + rs))
            result['rsi'] = round(df['rsi'].iloc[-1], 2) if not pd.isna(df['rsi'].iloc[-1]) else None
            df['ema_20'] = df['close'].ewm(span=20, adjust=False).mean()
            df['ema_50'] = df['close'].ewm(span=50, adjust=False).mean()
            result['ema_20'] = round(df['ema_20'].iloc[-1], 2)
            result['ema_50'] = round(df['ema_50'].iloc[-1], 2) if len(df) >= 50 else None
            ema_12 = df['close'].ewm(span=12, adjust=False).mean()
            ema_26 = df['close'].ewm(span=26, adjust=False).mean()
            df['macd'] = ema_12 - ema_26
            df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
            result['macd'] = round(df['macd'].iloc[-1], 4)
            result['macd_signal'] = round(df['macd_signal'].iloc[-1], 4)
            high_low = df['high'] - df['low']
            high_close = (df['high'] - df['close'].shift()).abs()
            low_close = (df['low'] - df['close'].shift()).abs()
            tr = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
            df['atr'] = tr.rolling(window=14).mean()
            result['atr'] = round(df['atr'].iloc[-1], 2) if not pd.isna(df['atr'].iloc[-1]) else None
            sma_20 = df['close'].rolling(window=20).mean()
            std_20 = df['close'].rolling(window=20).std()
            result['bollinger_upper'] = round((sma_20 + 2 * std_20).iloc[-1], 2)
            result['bollinger_lower'] = round((sma_20 - 2 * std_20).iloc[-1], 2)
            result['current_price'] = round(df['close'].iloc[-1], 2)
            result['volume'] = int(df['volume'].iloc[-1]) if 'volume' in df.columns else None
        except Exception as e:
            logger.error(f"Indicator calculation error: {e}")
            result['error'] = str(e)
        return result
