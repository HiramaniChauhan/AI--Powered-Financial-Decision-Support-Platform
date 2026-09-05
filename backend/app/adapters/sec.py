import requests
from bs4 import BeautifulSoup
from app.config.settings import settings
import logging

logger = logging.getLogger(__name__)

class SECEdgarAdapter:
    HEADERS = {"User-Agent": settings.SEC_EDGAR_USER_AGENT}
    
    def fetch_filings(self, ticker: str, count: int = 5) -> list:
        try:
            url = f"https://www.sec.gov/cgi-bin/browse-edgar?CIK={ticker}&owner=exclude&action=getcompany"
            response = requests.get(url, headers=self.HEADERS, timeout=10)
            if response.status_code != 200:
                return []
            soup = BeautifulSoup(response.content, "html.parser")
            table = soup.find("table", class_="tableFile2")
            if not table:
                return []
            rows = table.find_all("tr")[1:count+1]
            filings = []
            for row in rows:
                cols = row.find_all("td")
                if len(cols) >= 4:
                    filings.append({"type": cols[0].text.strip(), "description": cols[2].text.strip().replace('\n', ' '), "date": cols[3].text.strip()})
            return filings
        except Exception as e:
            logger.error(f"SEC EDGAR error for {ticker}: {e}")
            return []
    
    def get_filings_summary(self, ticker: str) -> str:
        filings = self.fetch_filings(ticker)
        if not filings:
            return "No recent SEC filings found."
        return "\n".join(f"Type: {f['type']} | Date: {f['date']} | Desc: {f['description']}" for f in filings)
