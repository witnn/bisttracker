import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { API_URL } from '../config';
import './StockDetail.css';

interface StockData {
  symbol: string;
  price: number;
  regularMarketChangePercent: number;
  currency: string;
  name?: string;
}

interface HistoryData {
  date: string;
  close: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

export default function StockDetail() {
  const { symbol } = useParams();
  const [data, setData] = useState<StockData | null>(null);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [range, setRange] = useState<'1d' | '7d' | '1mo' | '1y'>('1mo');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStockData = async () => {
      setLoading(true);
      try {
        const [infoRes, historyRes] = await Promise.all([
          fetch(`${API_URL}/api/stocks/${symbol}`),
          fetch(`${API_URL}/api/stocks/${symbol}/history?range=${range}`)
        ]);
        
        if (infoRes.ok) {
          setData(await infoRes.json());
        }
        
        if (historyRes.ok) {
          const hist = await historyRes.json();
          const formattedHist = hist.map((item: any) => ({
            date: new Date(item.date).toLocaleDateString('tr-TR', {
              month: 'short', day: 'numeric', hour: range === '1d' || range === '7d' ? '2-digit' : undefined, minute: range === '1d' || range === '7d' ? '2-digit' : undefined
            }),
            close: Number(item.close.toFixed(2))
          }));
          setHistory(formattedHist);
        }
      } catch (error) {
        console.error('Error fetching stock details', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStockData();
  }, [symbol, range]);

  if (loading && !data) {
    return <div className="loading">Yükleniyor...</div>;
  }

  if (!data) {
    return <div className="error">Hisse verisi bulunamadı.</div>;
  }

  // Calculate stats from history if available
  let minPrice = 0, maxPrice = 0, firstPrice = 0, lastPrice = 0, periodChangePercent = 0;
  if (history.length > 0) {
    const prices = history.map(h => h.close).filter(p => !isNaN(p));
    minPrice = Math.min(...prices);
    maxPrice = Math.max(...prices);
    firstPrice = history[0].close;
    lastPrice = history[history.length - 1].close;
    periodChangePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
  }

  return (
    <div className="stock-detail animate-fade-in">
      <div className="header-nav">
        <Link to="/" className="back-link">
          <ArrowLeft size={20} />
          Geri Dön
        </Link>
      </div>

      <div className="detail-header glass-panel">
        <div className="stock-info">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h1>{data.symbol}</h1>
            {data.name && data.name !== data.symbol && (
              <span className="text-secondary" style={{ fontSize: '1.2rem', opacity: 0.8 }}>
                {data.name}
              </span>
            )}
          </div>
          <div className="price-info">
            <span className="current-price">{formatCurrency(data.price)}</span>
            {data.regularMarketChangePercent && (
              <span className={`change ${data.regularMarketChangePercent >= 0 ? 'text-success' : 'text-danger'}`}>
                {data.regularMarketChangePercent >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                %{data.regularMarketChangePercent.toFixed(2)} Günlük
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="chart-section glass-panel mt-24">
        <div className="chart-header">
          <h2>Fiyat Grafiği</h2>
          <div className="range-selector">
            <button className={`range-btn ${range === '1d' ? 'active' : ''}`} onClick={() => setRange('1d')}>1G</button>
            <button className={`range-btn ${range === '7d' ? 'active' : ''}`} onClick={() => setRange('7d')}>7G</button>
            <button className={`range-btn ${range === '1mo' ? 'active' : ''}`} onClick={() => setRange('1mo')}>1A</button>
            <button className={`range-btn ${range === '1y' ? 'active' : ''}`} onClick={() => setRange('1y')}>1Y</button>
          </div>
        </div>
        
        {loading && <div className="chart-loading">Grafik güncelleniyor...</div>}
        
        <div className="chart-container">
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" />
                <XAxis dataKey="date" stroke="var(--text-secondary)" />
                <YAxis domain={['auto', 'auto']} stroke="var(--text-secondary)" tickFormatter={(value) => value.toFixed(2)} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  itemStyle={{ color: 'var(--primary-color)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="close" 
                  stroke="var(--primary-color)" 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">Seçili dönem için veri bulunamadı.</div>
          )}
        </div>

        {history.length > 0 && (
          <div className="period-stats mt-24">
            <div className="stat-box">
              <span className="stat-label">Dönem Değişimi</span>
              <span className={`stat-value ${periodChangePercent >= 0 ? 'text-success' : 'text-danger'}`}>
                {periodChangePercent > 0 ? '+' : ''}{periodChangePercent.toFixed(2)}%
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">En Yüksek</span>
              <span className="stat-value">{formatCurrency(maxPrice)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">En Düşük</span>
              <span className="stat-value">{formatCurrency(minPrice)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
