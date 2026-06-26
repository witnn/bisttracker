import { Router } from 'express';
import { prisma } from '../db';
import { authMiddleware, isAdminMiddleware } from '../middleware/auth';
import { priceProvider } from '../services/PriceProvider';

const router = Router();

router.get('/users', authMiddleware, isAdminMiddleware, async (req: any, res: any) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        banReason: true,
        createdAt: true,
        portfolios: true
      }
    });

    const usersWithStats = await Promise.all(users.map(async (u) => {
      let totalValue = 0;
      let totalCost = 0;

      const portfoliosWithPrices = await Promise.all(u.portfolios.map(async (item) => {
        const priceData = await priceProvider.getCurrentPrice(item.symbol);
        const currentPrice = priceData?.price || item.buyPrice;
        const value = currentPrice * item.lots;
        const cost = item.buyPrice * item.lots;
        totalValue += value;
        totalCost += cost;
        return { ...item, currentPrice };
      }));

      const totalProfit = totalValue - totalCost;
      const profitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

      return {
        ...u,
        totalValue,
        totalProfit,
        profitPercent,
        portfolios: portfoliosWithPrices
      };
    }));

    res.json(usersWithStats);
  } catch (error) {
    res.status(500).json({ error: 'Veri çekilemedi.' });
  }
});

router.put('/users/:id/ban', authMiddleware, isAdminMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    // Prevent self-banning
    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'Kendinizi banlayamazsınız.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { isBanned: true, banReason: reason || 'Kural ihlali.' }
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'İşlem başarısız.' });
  }
});

router.put('/users/:id/unban', authMiddleware, isAdminMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { isBanned: false, banReason: null }
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'İşlem başarısız.' });
  }
});

router.delete('/users/:id', authMiddleware, isAdminMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz.' });
    }

    await prisma.user.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Silme işlemi başarısız.' });
  }
});

export default router;
