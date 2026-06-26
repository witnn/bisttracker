import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot } from 'recharts';
import { API_URL } from '../config';

export default function PortfolioHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'1H' | '1A' | '3A' | '6A' | 'Tümü'>('Tümü');
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, historyRes] = await Promise.all([
          fetch(`${API_URL}/api/portfolio`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/portfolio/history`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (itemsRes.ok) setItems(await itemsRes.json());
        if (historyRes.ok) setHistory(await historyRes.json());
      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    };
    fetchData();
  }, [token]);

  const filteredHistory = history.filter(item => {
    if (timeRange === 'Tümü') return true;
    const itemDate = new Date(item.date).getTime();
    const now = new Date().getTime();
    const day = 24 * 60 * 60 * 1000;
    
    if (timeRange === '1H') return now - itemDate <= 7 * day;
    if (timeRange === '1A') return now - itemDate <= 30 * day;
    if (timeRange === '3A') return now - itemDate <= 90 * day;
    if (timeRange === '6A') return now - itemDate <= 180 * day;
    return true;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
  };

  const timeRanges: ('1H' | '1A' | '3A' | '6A' | 'Tümü')[] = ['1H', '1A', '3A', '6A', 'Tümü'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const labelDateStr = new Date(label).toISOString().split('T')[0];
      const dayItems = items.filter(i => {
        try { return new Date(i.buyDate).toISOString().split('T')[0] === labelDateStr; } catch { return false; }
      });

      return (
        <div style={{ backgroundColor: 'var(--glass-surface)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-primary)', minWidth: '150px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{new Date(label).toLocaleDateString('tr-TR')}</p>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#3b82f6', fontSize: '1.1rem' }}>{formatCurrency(payload[0].value)}</p>
          
          {dayItems.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>Bu Tarihteki İşlemler</p>
              {dayItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    <strong>{item.symbol}</strong>: {item.lots} {item.assetType === 'METAL' ? 'Gr' : 'Lot'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="portfolio-history-page animate-fade-in" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <button 
          onClick={() => navigate('/')} 
          className="btn btn-outline" 
          style={{ padding: '8px', border: '1px solid var(--glass-border)', background: 'var(--glass-surface)', color: 'var(--text-primary)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>Portföy Gelişimi</h2>
          <p className="text-secondary" style={{ fontSize: '0.9rem', margin: '4px 0 0 0' }}>Zaman içindeki varlık değişimi</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '65vh' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', background: 'var(--input-bg)', borderRadius: '8px', padding: '4px', border: '1px solid var(--glass-border)' }}>
            {timeRanges.map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  background: timeRange === range ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                  color: timeRange === range ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: timeRange === range ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid transparent',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        <div style={{ height: '70vh', minHeight: '500px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredHistory} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <defs>
                <linearGradient id="colorValueFull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => new Date(val).toLocaleDateString('tr-TR')} 
                stroke="var(--text-secondary)" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                minTickGap={30}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                tickFormatter={(val) => `₺${(val/1000).toFixed(1)}k`} 
                stroke="var(--text-secondary)" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {Array.from(new Set(items.map(item => new Date(item.buyDate as string).toISOString().split('T')[0])))
                .filter(dateStr => {
                  if (timeRange === 'Tümü') return true;
                  const evDate = new Date(dateStr).getTime();
                  const now = new Date().getTime();
                  const day = 24 * 60 * 60 * 1000;
                  if (timeRange === '1H') return now - evDate <= 7 * day;
                  if (timeRange === '1A') return now - evDate <= 30 * day;
                  if (timeRange === '3A') return now - evDate <= 90 * day;
                  if (timeRange === '6A') return now - evDate <= 180 * day;
                  return true;
                })
                .flatMap((dateStr, idx) => {
                  const historyPoint = filteredHistory.find(h => {
                    try { return new Date(h.date).toISOString().split('T')[0] === dateStr; } catch { return false; }
                  });
                  const elements = [
                    <ReferenceLine 
                      key={`line-${idx}`} 
                      x={dateStr} 
                      stroke="rgba(59, 130, 246, 0.4)" 
                      strokeDasharray="3 3" 
                    />
                  ];
                  if (historyPoint) {
                    elements.push(
                      <ReferenceDot 
                        key={`dot-${idx}`}
                        x={dateStr} 
                        y={historyPoint.value} 
                        r={5} 
                        fill="#0f172a" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                      />
                    );
                  }
                  return elements;
                })
              }

              <Area type="monotone" dataKey="value" name="Varlık" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValueFull)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
