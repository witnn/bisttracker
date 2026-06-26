import { Router } from 'express';
import { prisma } from '../db';
import { priceProvider } from '../services/PriceProvider';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// GET /api/portfolio
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const items = await prisma.portfolioItem.findMany({
      where: { userId: req.user.id }
    });
    
    // Fiyatları çek
    const itemsWithPrices = await Promise.all(items.map(async (item) => {
      const priceData = await priceProvider.getCurrentPrice(item.symbol);
      const currentPrice = priceData?.price || item.buyPrice; // fallback to buyPrice if fetch fails
      const currentValue = currentPrice * item.lots;
      const totalCost = item.buyPrice * item.lots;
      const profitLoss = currentValue - totalCost;
      const profitLossPercent = ((currentPrice - item.buyPrice) / item.buyPrice) * 100;

      return {
        ...item,
        currentPrice,
        currentValue,
        totalCost,
        profitLoss,
        profitLossPercent,
        regularMarketChangePercent: priceData?.regularMarketChangePercent,
        name: priceData?.name
      };
    }));

    res.json(itemsWithPrices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// GET /api/portfolio/summary
router.get('/summary', authMiddleware, async (req: any, res: any) => {
  try {
    const items = await prisma.portfolioItem.findMany({
      where: { userId: req.user.id }
    });
    let totalInvestment = 0;
    let currentTotalValue = 0;

    const itemsWithPrices = await Promise.all(items.map(async (item) => {
      const priceData = await priceProvider.getCurrentPrice(item.symbol);
      const currentPrice = priceData?.price || item.buyPrice;
      
      totalInvestment += item.buyPrice * item.lots;
      currentTotalValue += currentPrice * item.lots;

      return {
        symbol: item.symbol,
        currentPrice,
        profitLoss: (currentPrice - item.buyPrice) * item.lots,
        profitLossPercent: ((currentPrice - item.buyPrice) / item.buyPrice) * 100
      };
    }));

    const totalProfitLoss = currentTotalValue - totalInvestment;
    const totalProfitLossPercent = totalInvestment > 0 ? (totalProfitLoss / totalInvestment) * 100 : 0;

    let bestPerformer = null;
    let worstPerformer = null;

    if (itemsWithPrices.length > 0) {
      bestPerformer = itemsWithPrices.reduce((prev, current) => (prev.profitLossPercent > current.profitLossPercent) ? prev : current);
      worstPerformer = itemsWithPrices.reduce((prev, current) => (prev.profitLossPercent < current.profitLossPercent) ? prev : current);
    }

    res.json({
      totalInvestment,
      currentTotalValue,
      totalProfitLoss,
      totalProfitLossPercent,
      bestPerformer,
      worstPerformer
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch portfolio summary' });
  }
});

// POST /api/portfolio
router.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { symbol, assetType, lots, buyPrice, buyDate } = req.body;
    const item = await prisma.portfolioItem.create({
      data: {
        symbol: symbol.toUpperCase(),
        assetType: assetType || 'STOCK',
        lots: Number(lots),
        buyPrice: Number(buyPrice),
        buyDate: new Date(buyDate),
        userId: req.user.id
      }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add portfolio item' });
  }
});

// GET /api/portfolio/history
router.get('/history', authMiddleware, async (req: any, res: any) => {
  try {
    const items = await prisma.portfolioItem.findMany({ where: { userId: req.user.id } });
    if (items.length === 0) return res.json([]);
    
    const earliestDate = new Date(Math.min(...items.map(i => i.buyDate.getTime())));
    earliestDate.setDate(earliestDate.getDate() - 1);
    const today = new Date();
    
    const symbols = [...new Set(items.map(i => i.symbol))];
    const pricesBySymbol: Record<string, any[]> = {};
    
    for (const symbol of symbols) {
      pricesBySymbol[symbol] = await priceProvider.getHistoricalPricesSince(symbol, earliestDate);
    }
    
    const lastKnownPrices: Record<string, number> = {};
    for (const symbol of symbols) {
      lastKnownPrices[symbol] = items.find(i => i.symbol === symbol)?.buyPrice || 0;
    }
    
    const pricesByDate: Record<string, Record<string, number>> = {};
    for (const symbol of symbols) {
      for (const p of pricesBySymbol[symbol]) {
        const dateStr = new Date(p.date).toISOString().split('T')[0];
        if (!pricesByDate[dateStr]) pricesByDate[dateStr] = {};
        pricesByDate[dateStr][symbol] = p.close;
      }
    }

    const history = [];
    let currentDate = new Date(earliestDate);
    
    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (pricesByDate[dateStr]) {
        for (const symbol of symbols) {
          if (pricesByDate[dateStr][symbol]) {
            lastKnownPrices[symbol] = pricesByDate[dateStr][symbol];
          }
        }
      }
      
      let totalValue = 0;
      let totalCost = 0;
      for (const item of items) {
        // We compare midnight to midnight roughly, or simply buyDate string comparison
        const itemDateStr = item.buyDate.toISOString().split('T')[0];
        if (itemDateStr <= dateStr) {
          totalValue += item.lots * (lastKnownPrices[item.symbol] || item.buyPrice);
          totalCost += item.lots * item.buyPrice;
        }
      }
      
      history.push({
        date: dateStr,
        value: Number(totalValue.toFixed(2)),
        cost: Number(totalCost.toFixed(2))
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.json(history);
  } catch (error) {
    console.error('History API error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// PUT /api/portfolio/:id
router.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { symbol, assetType, lots, buyPrice, buyDate } = req.body;
    
    // Güvenlik kontrolü: bu hisse kullanıcının mı?
    const existing = await prisma.portfolioItem.findFirst({
      where: { id: Number(id), userId: req.user.id }
    });
    if (!existing) return res.status(403).json({ error: 'Yetkisiz işlem' });

    const item = await prisma.portfolioItem.update({
      where: { id: Number(id) },
      data: {
        symbol: symbol.toUpperCase(),
        assetType: assetType || 'STOCK',
        lots: Number(lots),
        buyPrice: Number(buyPrice),
        buyDate: new Date(buyDate)
      }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update portfolio item' });
  }
});

// DELETE /api/portfolio/:id
router.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const existing = await prisma.portfolioItem.findFirst({
      where: { id: Number(id), userId: req.user.id }
    });
    if (!existing) return res.status(403).json({ error: 'Yetkisiz işlem' });

    await prisma.portfolioItem.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete portfolio item' });
  }
});

export default router;
