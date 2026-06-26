const yahooFinancePkg = require('yahoo-finance2');
const YahooFinance = yahooFinancePkg.default || yahooFinancePkg;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

export interface StockPrice {
  symbol: string;
  price: number;
  currency?: string;
  regularMarketChangePercent?: number;
  name?: string;
}

export interface HistoricalPrice {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IPriceProvider {
  getCurrentPrice(symbol: string): Promise<StockPrice | null>;
  getHistoricalPrices(symbol: string, period: '1d' | '7d' | '1mo' | '1y'): Promise<HistoricalPrice[]>;
  getHistoricalPricesSince(symbol: string, startDate: Date): Promise<HistoricalPrice[]>;
}

export class YahooFinanceProvider implements IPriceProvider {
  private cache: Map<string, { data: StockPrice; timestamp: number }> = new Map();
  private CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Yardımcı: Yahoo Finance için BIST sembolünü formatla (örn: THYAO -> THYAO.IS)
  private formatSymbol(symbol: string): string {
    const s = symbol.toUpperCase().trim();
    if (s === 'GRAMALTIN') return 'GC=F';
    if (s === 'GRAMGUMUS') return 'SI=F';
    
    if (!s.endsWith('.IS') && !s.includes('=')) {
      return `${s}.IS`;
    }
    return s;
  }

  async getCurrentPrice(symbol: string): Promise<StockPrice | null> {
    const formattedSymbol = this.formatSymbol(symbol);

    // Cache kontrolü
    const cached = this.cache.get(formattedSymbol);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      let result: any = null;
      let price: number | undefined;
      let currency: string | undefined;
      let changePercent: number | undefined;
      let shortName: string | undefined;
      let longName: string | undefined;

      try {
        result = await yahooFinance.quote(formattedSymbol);
        price = result?.regularMarketPrice;
        currency = result?.currency;
        changePercent = result?.regularMarketChangePercent;
        shortName = result?.shortName;
        longName = result?.longName;
      } catch (e) {
        console.warn(`YahooFinance library failed for ${formattedSymbol}, trying raw fetch...`);
      }

      const fetchOptions = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      };

      if (price === undefined) {
        try {
          const originalSymbol = symbol.toUpperCase().trim();
          const bpSymbol = originalSymbol.replace('.IS', '');
          // Bigpara only for BIST stocks (not metals)
          if (bpSymbol !== 'GRAMALTIN' && bpSymbol !== 'GRAMGUMUS') {
            const bpRes = await fetch(`https://bigpara.hurriyet.com.tr/api/v1/borsa/hisseyuzeysel/${bpSymbol}`, fetchOptions);
            const bpData = await bpRes.json();
            if (bpData && bpData.data && bpData.data.hisseYuzeysel) {
              const h = bpData.data.hisseYuzeysel;
              price = h.kapanis || h.alis || h.satis;
              currency = 'TRY';
              changePercent = h.yuzdedegisim;
              shortName = h.aciklama || originalSymbol;
            }
          }
        } catch (e) {
          console.warn('Bigpara fetch failed');
        }
      }

      if (price === undefined) {
        try {
          const fallbackRes = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${formattedSymbol}`, fetchOptions);
          const fallbackData = await fallbackRes.json();
          const meta = fallbackData?.chart?.result?.[0]?.meta;
          if (meta && meta.regularMarketPrice !== undefined) {
            price = meta.regularMarketPrice;
            currency = meta.currency;
            changePercent = meta.regularMarketPrice > 0 ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100 : 0;
          }
        } catch (e) {
           console.warn('Yahoo raw fetch failed');
        }
      }

      if (price === undefined) {
        return null;
      }

      const originalSymbol = symbol.toUpperCase().trim();
      if (originalSymbol === 'GRAMALTIN' || originalSymbol === 'GRAMGUMUS') {
        try {
          const tryResult: any = await yahooFinance.quote('TRY=X');
          if (tryResult && tryResult.regularMarketPrice) {
            price = (price / 31.1034768) * tryResult.regularMarketPrice;
          } else {
            price = price / 31.1034768; // fallback
          }
        } catch (e) {
          try {
            const tryFallback = await fetch('https://query2.finance.yahoo.com/v8/finance/chart/TRY=X', fetchOptions);
            const tryFallbackData = await tryFallback.json();
            const tryPrice = tryFallbackData?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (tryPrice) {
               price = (price / 31.1034768) * tryPrice;
            } else {
               price = price / 31.1034768;
            }
          } catch(e2) {
            price = price / 31.1034768;
          }
        }
      }

      const priceData: StockPrice = {
        symbol: originalSymbol,
        price: price,
        currency: currency,
        regularMarketChangePercent: changePercent,
        name: originalSymbol === 'GRAMALTIN' ? 'Altın (Gram)' : originalSymbol === 'GRAMGUMUS' ? 'Gümüş (Gram)' : (shortName || longName || originalSymbol),
      };

      // Cache'e yaz
      this.cache.set(formattedSymbol, { data: priceData, timestamp: Date.now() });

      return priceData;
    } catch (error) {
      console.error(`Error fetching price for ${formattedSymbol}:`, error);
      return null;
    }
  }

  async getHistoricalPrices(symbol: string, period: '1d' | '7d' | '1mo' | '1y'): Promise<HistoricalPrice[]> {
    const formattedSymbol = this.formatSymbol(symbol);
    
    // Determine period1 (start date) based on period
    const now = new Date();
    const startDate = new Date();
    let interval: any = '1d';

    switch (period) {
      case '1d':
        startDate.setDate(now.getDate() - 3); // a few days to get data due to weekends
        interval = '1d';
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        interval = '1d'; 
        break;
      case '1mo':
        startDate.setMonth(now.getMonth() - 1);
        interval = '1d';
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        interval = '1wk';
        break;
    }

    try {
      const queryOptions = {
        period1: startDate,
        period2: now,
        interval: interval
      };
      
      const chartResult: any = await yahooFinance.chart(formattedSymbol, queryOptions);
      const result = chartResult.quotes || [];
      
      const originalSymbol = symbol.toUpperCase().trim();
      let tryResult: any[] = [];
      if (originalSymbol === 'GRAMALTIN' || originalSymbol === 'GRAMGUMUS') {
        try {
          const tryChart: any = await yahooFinance.chart('TRY=X', queryOptions);
          tryResult = tryChart.quotes || [];
        } catch (e) {
          console.error('Failed to fetch TRY=X history', e);
        }
      }

      return (result as any[]).map((item: any) => {
        let tryRate = 1;
        if (originalSymbol === 'GRAMALTIN' || originalSymbol === 'GRAMGUMUS') {
          const tryItem = tryResult.find(t => t.date.getTime() === item.date.getTime());
          if (tryItem) {
            tryRate = tryItem.close;
          } else if (tryResult.length > 0) {
            tryRate = tryResult[tryResult.length - 1].close; 
          } else {
             tryRate = 35; // fallback
          }
        }
        
        const divider = (originalSymbol === 'GRAMALTIN' || originalSymbol === 'GRAMGUMUS') ? (31.1034768 / tryRate) : 1;

        return {
          date: item.date,
          open: item.open / divider,
          high: item.high / divider,
          low: item.low / divider,
          close: item.close / divider,
          volume: item.volume
        };
      });
    } catch (error) {
      console.error(`Error fetching historical prices for ${formattedSymbol}:`, error);
      return [];
    }
  }

  async getHistoricalPricesSince(symbol: string, startDate: Date): Promise<HistoricalPrice[]> {
    const formattedSymbol = this.formatSymbol(symbol);
    const now = new Date();
    
    // Ensure startDate is before now
    if (startDate >= now) {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 1);
    }

    try {
      const queryOptions = {
        period1: startDate,
        period2: now,
        interval: '1d'
      };
      
      const chartResult: any = await yahooFinance.chart(formattedSymbol, queryOptions);
      const result = chartResult.quotes || [];
      
      const originalSymbol = symbol.toUpperCase().trim();
      let tryResult: any[] = [];
      if (originalSymbol === 'GRAMALTIN' || originalSymbol === 'GRAMGUMUS') {
        try {
          const tryChart: any = await yahooFinance.chart('TRY=X', queryOptions);
          tryResult = tryChart.quotes || [];
        } catch (e) {
          console.error('Failed to fetch TRY=X history', e);
        }
      }

      return (result as any[]).map((item: any) => {
        let tryRate = 1;
        if (originalSymbol === 'GRAMALTIN' || originalSymbol === 'GRAMGUMUS') {
          const tryItem = tryResult.find(t => t.date.getTime() === item.date.getTime());
          if (tryItem) {
            tryRate = tryItem.close;
          } else if (tryResult.length > 0) {
            tryRate = tryResult[tryResult.length - 1].close; 
          } else {
             tryRate = 35; // fallback
          }
        }
        
        const divider = (originalSymbol === 'GRAMALTIN' || originalSymbol === 'GRAMGUMUS') ? (31.1034768 / tryRate) : 1;

        return {
          date: item.date,
          open: item.open / divider,
          high: item.high / divider,
          low: item.low / divider,
          close: item.close / divider,
          volume: item.volume
        };
      });
    } catch (error) {
      console.error(`Error fetching historical prices since ${startDate} for ${formattedSymbol}:`, error);
      return [];
    }
  }
}

export const priceProvider = new YahooFinanceProvider();
