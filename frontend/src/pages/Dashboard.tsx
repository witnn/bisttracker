import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown, Trash2, Edit2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import AddAssetModal from '../components/AddAssetModal';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './Dashboard.css';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#6366f1', '#14b8a6', '#f43f5e'];

interface PortfolioItem {
  id: number;
  symbol: string;
  assetType: 'STOCK' | 'METAL';
  lots: number;
  buyPrice: number;
  buyDate: string;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  profitLoss: number;
  profitLossPercent: number;
  name?: string;
}

interface Summary {
  totalInvestment: number;
  currentTotalValue: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  bestPerformer: any;
  worstPerformer: any;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

export default function Dashboard() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<PortfolioItem | null>(null);
  const [stockViewMode, setStockViewMode] = useState<'detailed' | 'simplified'>('simplified');
  const [metalViewMode, setMetalViewMode] = useState<'detailed' | 'simplified'>('simplified');
  const [stockSortConfig, setStockSortConfig] = useState<{ key: keyof PortfolioItem, direction: 'ascending' | 'descending' } | null>(null);
  const [metalSortConfig, setMetalSortConfig] = useState<{ key: keyof PortfolioItem, direction: 'ascending' | 'descending' } | null>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  const groupedItems = Object.values(items.reduce((acc, item) => {
    if (!acc[item.symbol]) {
      acc[item.symbol] = {
        id: item.symbol,
        symbol: item.symbol,
        assetType: item.assetType,
        name: item.name,
        lots: 0,
        totalCost: 0,
        currentValue: 0,
        currentPrice: item.currentPrice,
      };
    }
    acc[item.symbol].lots += item.lots;
    acc[item.symbol].totalCost += item.totalCost;
    acc[item.symbol].currentValue += item.currentValue;
    return acc;
  }, {} as Record<string, any>)).map((group: any) => {
    group.profitLoss = group.currentValue - group.totalCost;
    group.profitLossPercent = group.totalCost > 0 ? (group.profitLoss / group.totalCost) * 100 : 0;
    return group as PortfolioItem;
  });

  const getSortFunction = (config: { key: keyof PortfolioItem, direction: 'ascending' | 'descending' } | null) => (a: PortfolioItem, b: PortfolioItem) => {
    if (config !== null) {
      let aVal = a[config.key];
      let bVal = b[config.key];
      
      if (config.key === 'buyDate') {
        aVal = new Date(aVal as string).getTime() as never;
        bVal = new Date(bVal as string).getTime() as never;
      }
      
      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      
      if (aVal < bVal) {
        return config.direction === 'ascending' ? -1 : 1;
      }
      if (aVal > bVal) {
        return config.direction === 'ascending' ? 1 : -1;
      }
    }
    return 0;
  };

  const stockItemsToDisplay = stockViewMode === 'simplified' 
    ? groupedItems.filter(item => item.assetType === 'STOCK' || !item.assetType) 
    : items.filter(item => item.assetType === 'STOCK' || !item.assetType);
  const sortedStocks = [...stockItemsToDisplay].sort(getSortFunction(stockSortConfig));

  const metalItemsToDisplay = metalViewMode === 'simplified' 
    ? groupedItems.filter(item => item.assetType === 'METAL') 
    : items.filter(item => item.assetType === 'METAL');
  const sortedMetals = [...metalItemsToDisplay].sort(getSortFunction(metalSortConfig));

  const fetchData = async () => {
    try {
      const [itemsRes, summaryRes, historyRes] = await Promise.all([
        fetch(`${API_URL}/api/portfolio`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/portfolio/summary`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/portfolio/history`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const itemsData = await itemsRes.json();
      const summaryData = await summaryRes.json();
      const historyData = await historyRes.json();
      setItems(itemsData);
      setSummary(summaryData);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleDelete = async (id: number) => {
    if (window.confirm('Bu hisseyi silmek istediğinize emin misiniz?')) {
      await fetch(`${API_URL}/api/portfolio/${id}`, { 
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    }
  };

  const handleEdit = (item: PortfolioItem) => {
    setEditItem(item);
    setIsModalOpen(true);
  };

  const requestStockSort = (key: keyof PortfolioItem) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (stockSortConfig && stockSortConfig.key === key && stockSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setStockSortConfig({ key, direction });
  };

  const requestMetalSort = (key: keyof PortfolioItem) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (metalSortConfig && metalSortConfig.key === key && metalSortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setMetalSortConfig({ key, direction });
  };

  return (
    <>
      <div className="animate-fade-in">
        <div className="page-header">
        <div>
          <h1>Portföy Özeti</h1>
          <p className="text-secondary">Güncel yatırımlarınızın durumu</p>
        </div>
        <button className="btn" onClick={() => { setEditItem(null); setIsModalOpen(true); }}>
          <Plus size={20} />
          Yatırım Ekle
        </button>
      </div>

      {summary && (
        <div className="dashboard-top-section mt-24">
          <div className="summary-cards-column">
            <div className="summary-card glass-panel">
              <span className="title">Toplam Yatırım</span>
              <span className="value">{formatCurrency(summary.totalInvestment)}</span>
            </div>
            <div className="summary-card glass-panel">
              <span className="title">Güncel Değer</span>
              <span className="value">{formatCurrency(summary.currentTotalValue)}</span>
            </div>
            <div className="summary-card glass-panel">
              <span className="title">Toplam Kâr/Zarar</span>
              <span className={`value ${summary.totalProfitLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                {summary.totalProfitLoss > 0 ? '+' : ''}{formatCurrency(summary.totalProfitLoss)}
              </span>
              <span className={`change ${summary.totalProfitLossPercent >= 0 ? 'text-success' : 'text-danger'}`}>
                {summary.totalProfitLossPercent >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                %{summary.totalProfitLossPercent.toFixed(2)}
              </span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="chart-container glass-panel">
              <h3 style={{ marginBottom: '8px', fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Portföy Dağılımı</h3>
              <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Güncel değere göre dağılım</p>
              <div style={{ flex: 1, minHeight: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={groupedItems}
                      dataKey="currentValue"
                      nameKey="symbol"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                    >
                      {groupedItems.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(Number(value))}
                      contentStyle={{ backgroundColor: 'var(--glass-surface)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                      itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="chart-container glass-panel clickable" onClick={() => navigate('/history')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Portföy Gelişimi</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary-color)', padding: '2px 8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px' }}>Genişlet</span>
              </div>
              <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '16px' }}>Zaman içindeki varlık değişimi</p>
              <div style={{ flex: 1, minHeight: '220px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getDate()}.${d.getMonth()+1}`;
                      }} 
                      stroke="var(--text-secondary)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                      minTickGap={20}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      tickFormatter={(val) => `₺${(val/1000).toFixed(1)}k`} 
                      stroke="var(--text-secondary)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      width={50}
                    />
                    <Tooltip 
                      formatter={(value: any) => formatCurrency(Number(value))}
                      labelFormatter={(label) => new Date(label as string).toLocaleDateString('tr-TR')}
                      contentStyle={{ backgroundColor: 'var(--glass-surface)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                      itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="value" name="Varlık" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="prices-column glass-panel">
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', padding: '24px' }}>
              <h3 style={{ marginBottom: '20px', fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 600 }}>Güncel Fiyatlar</h3>
              <div className="prices-scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '8px', flex: 1, minHeight: 0 }}>
                {groupedItems.map(item => (
                  <Link key={item.symbol} to={`/stock/${item.symbol}`} className="price-card" style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', marginRight: '16px' }}>
                       <span className="symbol-badge">{item.symbol}</span>
                       {item.name && item.name !== item.symbol && (
                         <span className="company-name">{item.name}</span>
                       )}
                    </div>
                    <span className="price-value">{formatCurrency(item.currentPrice)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="portfolio-section glass-panel mt-24">
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Hisselerim</h2>
          <div style={{ position: 'relative', display: 'flex', background: 'var(--input-bg)', borderRadius: '8px', padding: '4px', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>
            <div 
              style={{
                position: 'absolute',
                top: '4px',
                bottom: '4px',
                left: '4px',
                width: stockViewMode === 'simplified' ? '140px' : '80px',
                transform: stockViewMode === 'simplified' ? 'translateX(0)' : 'translateX(140px)',
                background: 'rgba(59, 130, 246, 0.25)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '6px',
                transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                zIndex: 1,
                boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.2)'
              }}
            ></div>
            <div 
              onClick={() => setStockViewMode('simplified')}
              style={{ width: '140px', textAlign: 'center', zIndex: 2, padding: '6px 0', fontSize: '0.85rem', fontWeight: 500, color: stockViewMode === 'simplified' ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'color 0.3s', userSelect: 'none' }}
            >
              Basitleştirilmiş
            </div>
            <div 
              onClick={() => setStockViewMode('detailed')}
              style={{ width: '80px', textAlign: 'center', zIndex: 2, padding: '6px 0', fontSize: '0.85rem', fontWeight: 500, color: stockViewMode === 'detailed' ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'color 0.3s', userSelect: 'none' }}
            >
              Detaylı
            </div>
          </div>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th onClick={() => requestStockSort('symbol')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Sembol {stockSortConfig?.key === 'symbol' ? (stockSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestStockSort('lots')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  {stockViewMode === 'simplified' ? 'Toplam Adet (Lot)' : 'Adet (Lot)'} {stockSortConfig?.key === 'lots' ? (stockSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                {stockViewMode === 'detailed' && (
                  <th onClick={() => requestStockSort('buyDate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Alım Tarihi {stockSortConfig?.key === 'buyDate' ? (stockSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                  </th>
                )}
                {stockViewMode === 'detailed' && (
                  <th onClick={() => requestStockSort('buyPrice')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Maliyet (Birim) {stockSortConfig?.key === 'buyPrice' ? (stockSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                  </th>
                )}
                <th onClick={() => requestStockSort('totalCost')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Toplam Maliyet {stockSortConfig?.key === 'totalCost' ? (stockSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestStockSort('currentPrice')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Güncel Fiyat {stockSortConfig?.key === 'currentPrice' ? (stockSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestStockSort('currentValue')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Güncel Değer {stockSortConfig?.key === 'currentValue' ? (stockSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestStockSort('profitLoss')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Kâr / Zarar {stockSortConfig?.key === 'profitLoss' ? (stockSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                {stockViewMode === 'detailed' && <th>İşlemler</th>}
              </tr>
            </thead>
            <tbody>
              {sortedStocks.map(item => (
                <tr key={item.id}>
                  <td>
                    <Link to={`/stock/${item.symbol}`} className="symbol-link" style={{ fontWeight: '600' }}>
                      {item.symbol}
                    </Link>
                    {item.name && item.name !== item.symbol && (
                      <div className="text-secondary" style={{ fontSize: '0.8rem', marginTop: '2px', opacity: 0.8 }}>
                        {item.name}
                      </div>
                    )}
                  </td>
                  <td>{item.lots}</td>
                  {stockViewMode === 'detailed' && <td>{item.buyDate ? new Date(item.buyDate).toLocaleDateString('tr-TR') : ''}</td>}
                  {stockViewMode === 'detailed' && <td>{formatCurrency(item.buyPrice)}</td>}
                  <td>{formatCurrency(item.totalCost)}</td>
                  <td>{formatCurrency(item.currentPrice)}</td>
                  <td>{formatCurrency(item.currentValue)}</td>
                  <td className={item.profitLoss >= 0 ? 'text-success' : 'text-danger'}>
                    <div className="flex-col">
                      <span>{item.profitLoss > 0 ? '+' : ''}{formatCurrency(item.profitLoss)}</span>
                      <span className="text-sm">({item.profitLossPercent > 0 ? '+' : ''}{item.profitLossPercent.toFixed(2)}%)</span>
                    </div>
                  </td>
                  {stockViewMode === 'detailed' && (
                    <td>
                      <div className="actions">
                        <button className="action-btn" onClick={() => handleEdit(item)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="action-btn text-danger" onClick={() => handleDelete(item.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {sortedStocks.length === 0 && (
                <tr>
                  <td colSpan={stockViewMode === 'simplified' ? 6 : 9} className="text-center py-24 text-secondary">
                    Portföyünüzde henüz hisse bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="portfolio-section glass-panel mt-24" style={{ marginBottom: '40px' }}>
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Değerli Madenlerim</h2>
          <div style={{ position: 'relative', display: 'flex', background: 'var(--input-bg)', borderRadius: '8px', padding: '4px', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>
            <div 
              style={{
                position: 'absolute',
                top: '4px',
                bottom: '4px',
                left: '4px',
                width: metalViewMode === 'simplified' ? '140px' : '80px',
                transform: metalViewMode === 'simplified' ? 'translateX(0)' : 'translateX(140px)',
                background: 'rgba(59, 130, 246, 0.25)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                borderRadius: '6px',
                transition: 'all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                zIndex: 1,
                boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.2)'
              }}
            ></div>
            <div 
              onClick={() => setMetalViewMode('simplified')}
              style={{ width: '140px', textAlign: 'center', zIndex: 2, padding: '6px 0', fontSize: '0.85rem', fontWeight: 500, color: metalViewMode === 'simplified' ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'color 0.3s', userSelect: 'none' }}
            >
              Basitleştirilmiş
            </div>
            <div 
              onClick={() => setMetalViewMode('detailed')}
              style={{ width: '80px', textAlign: 'center', zIndex: 2, padding: '6px 0', fontSize: '0.85rem', fontWeight: 500, color: metalViewMode === 'detailed' ? 'var(--text-primary)' : 'var(--text-secondary)', transition: 'color 0.3s', userSelect: 'none' }}
            >
              Detaylı
            </div>
          </div>
        </div>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th onClick={() => requestMetalSort('symbol')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Maden Türü {metalSortConfig?.key === 'symbol' ? (metalSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestMetalSort('lots')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  {metalViewMode === 'simplified' ? 'Toplam Miktar (Gram)' : 'Miktar (Gram)'} {metalSortConfig?.key === 'lots' ? (metalSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                {metalViewMode === 'detailed' && (
                  <th onClick={() => requestMetalSort('buyDate')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Alım Tarihi {metalSortConfig?.key === 'buyDate' ? (metalSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                  </th>
                )}
                {metalViewMode === 'detailed' && (
                  <th onClick={() => requestMetalSort('buyPrice')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Maliyet (Gram) {metalSortConfig?.key === 'buyPrice' ? (metalSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                  </th>
                )}
                <th onClick={() => requestMetalSort('totalCost')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Toplam Maliyet {metalSortConfig?.key === 'totalCost' ? (metalSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestMetalSort('currentPrice')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Güncel Fiyat (Gram) {metalSortConfig?.key === 'currentPrice' ? (metalSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestMetalSort('currentValue')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Güncel Değer {metalSortConfig?.key === 'currentValue' ? (metalSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                <th onClick={() => requestMetalSort('profitLoss')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Kâr / Zarar {metalSortConfig?.key === 'profitLoss' ? (metalSortConfig.direction === 'ascending' ? '↑' : '↓') : ''}
                </th>
                {metalViewMode === 'detailed' && <th>İşlemler</th>}
              </tr>
            </thead>
            <tbody>
              {sortedMetals.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--primary-color)' }}>
                      {item.name || item.symbol}
                    </div>
                  </td>
                  <td>{item.lots}</td>
                  {metalViewMode === 'detailed' && <td>{item.buyDate ? new Date(item.buyDate).toLocaleDateString('tr-TR') : ''}</td>}
                  {metalViewMode === 'detailed' && <td>{formatCurrency(item.buyPrice)}</td>}
                  <td>{formatCurrency(item.totalCost)}</td>
                  <td>{formatCurrency(item.currentPrice)}</td>
                  <td>{formatCurrency(item.currentValue)}</td>
                  <td className={item.profitLoss >= 0 ? 'text-success' : 'text-danger'}>
                    <div className="flex-col">
                      <span>{item.profitLoss > 0 ? '+' : ''}{formatCurrency(item.profitLoss)}</span>
                      <span className="text-sm">({item.profitLossPercent > 0 ? '+' : ''}{item.profitLossPercent.toFixed(2)}%)</span>
                    </div>
                  </td>
                  {metalViewMode === 'detailed' && (
                    <td>
                      <div className="actions">
                        <button className="action-btn" onClick={() => handleEdit(item)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="action-btn text-danger" onClick={() => handleDelete(item.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {sortedMetals.length === 0 && (
                <tr>
                  <td colSpan={metalViewMode === 'simplified' ? 6 : 9} className="text-center py-24 text-secondary">
                    Portföyünüzde henüz değerli maden bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {isModalOpen && (
        <AddAssetModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchData} 
          editItem={editItem} 
        />
      )}
    </>
  );
}
