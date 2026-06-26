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
      const result: any = await yahooFinance.quote(formattedSymbol);
      if (!result || result.regularMarketPrice === undefined) {
        return null;
      }

      let price = result.regularMarketPrice;
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
          price = price / 31.1034768;
        }
      }

      const priceData: StockPrice = {
        symbol: originalSymbol,
        price: price,
        currency: result.currency,
        regularMarketChangePercent: result.regularMarketChangePercent,
        name: originalSymbol === 'GRAMALTIN' ? 'Altın (Gram)' : originalSymbol === 'GRAMGUMUS' ? 'Gümüş (Gram)' : (result.shortName || result.longName || originalSymbol),
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
