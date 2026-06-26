import { Router } from 'express';
import { priceProvider } from '../services/PriceProvider';

const router = Router();

// GET /api/stocks/:symbol
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await priceProvider.getCurrentPrice(symbol);
    if (!data) {
      return res.status(404).json({ error: 'Stock not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock info' });
  }
});

// GET /api/stocks/:symbol/history
router.get('/:symbol/history', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { range } = req.query; // '1d', '7d', '1mo', '1y'
    
    const validRanges = ['1d', '7d', '1mo', '1y'];
    const period = validRanges.includes(range as string) ? (range as '1d' | '7d' | '1mo' | '1y') : '1mo';

    const history = await priceProvider.getHistoricalPrices(symbol, period);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

export default router;
