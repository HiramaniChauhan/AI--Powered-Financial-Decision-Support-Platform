import requests
from bs4 import BeautifulSoup
import logging

logger = logging.getLogger(__name__)

# SEC requires a descriptive User-Agent
HEADERS = {
    "User-Agent": "FINMEM-X Research Bot (contact@finmem-x.com)"
}

def fetch_sec_filings_summary(ticker: str) -> str:
    """
    Scrapes the SEC EDGAR database for recent company filings (10-K, 10-Q) 
    and returns a summary of the most recent document titles/links.
    """
    try:
        url = f"https://www.sec.gov/cgi-bin/browse-edgar?CIK={ticker}&owner=exclude&action=getcompany"
        response = requests.get(url, headers=HEADERS, timeout=10)
        
        if response.status_code != 200:
            logger.warning(f"Failed to fetch SEC data for {ticker}. Status: {response.status_code}")
            return "No recent SEC filings found."
            
        soup = BeautifulSoup(response.content, "html.parser")
        
        # The filings are in a table with class 'tableFile2'
        table = soup.find("table", class_="tableFile2")
        if not table:
            return "No SEC filings available for this ticker."
            
        rows = table.find_all("tr")[1:6] # Get top 5 recent filings
        
        filings = []
        for row in rows:
            cols = row.find_all("td")
            if len(cols) >= 4:
                filing_type = cols[0].text.strip()
                description = cols[2].text.strip().replace('\n', ' ')
                date_filed = cols[3].text.strip()
                filings.append(f"Type: {filing_type} | Date: {date_filed} | Desc: {description}")
                
        if filings:
            return "\n".join(filings)
        return "No recent SEC filings found."
        
    except Exception as e:
        logger.error(f"Error scraping SEC for {ticker}: {e}")
        return "Error fetching company reports."
