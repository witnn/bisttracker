import { useState, useEffect } from 'react';
import { X, TrendingUp, Gem } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './AddAssetModal.css';

interface AddAssetModalProps {
  onClose: () => void;
  onSuccess: () => void;
  editItem?: any;
}

export default function AddAssetModal({ onClose, onSuccess, editItem }: AddAssetModalProps) {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'METAL'>('STOCK');
  const [symbol, setSymbol] = useState('');
  const [metalSymbol, setMetalSymbol] = useState('GRAMALTIN');
  const [lots, setLots] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [buyDate, setBuyDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    if (editItem) {
      setActiveTab(editItem.assetType || 'STOCK');
      if (editItem.assetType === 'METAL') {
        setMetalSymbol(editItem.symbol);
      } else {
        setSymbol(editItem.symbol);
      }
      setLots(editItem.lots.toString());
      setBuyPrice(editItem.buyPrice.toString());
      setBuyDate(new Date(editItem.buyDate).toISOString().split('T')[0]);
    } else {
      setBuyDate(new Date().toISOString().split('T')[0]);
    }
  }, [editItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const finalSymbol = activeTab === 'METAL' ? metalSymbol : symbol.toUpperCase();

    const payload = {
      symbol: finalSymbol,
      assetType: activeTab,
      lots: Number(lots),
      buyPrice: Number(buyPrice),
      buyDate: new Date(buyDate).toISOString()
    };

    try {
      const url = editItem 
        ? `${API_URL}/api/portfolio/${editItem.id}` 
        : `${API_URL}/api/portfolio`;
        
      const method = editItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        alert('İşlem başarısız oldu.');
      }
    } catch (error) {
      console.error(error);
      alert('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <h3>{editItem ? 'Yatırım Düzenle' : 'Yeni Yatırım Ekle'}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {!editItem && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)',
                background: activeTab === 'STOCK' ? 'rgba(59, 130, 246, 0.2)' : 'var(--input-bg)',
                color: activeTab === 'STOCK' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveTab('STOCK')}
            >
              <TrendingUp size={16} /> Hisse Senedi
            </button>
            <button
              type="button"
              style={{
                flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--glass-border)',
                background: activeTab === 'METAL' ? 'rgba(59, 130, 246, 0.2)' : 'var(--input-bg)',
                color: activeTab === 'METAL' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s'
              }}
              onClick={() => setActiveTab('METAL')}
            >
              <Gem size={16} /> Değerli Maden
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {activeTab === 'STOCK' ? (
            <div className="form-group">
              <label>Hisse Sembolü (Örn: THYAO)</label>
              <input 
                type="text" 
                className="input-field" 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required 
                placeholder="Sembol giriniz..."
                disabled={!!editItem}
              />
            </div>
          ) : (
            <div className="form-group">
              <label>Maden Türü</label>
              <select 
                className="input-field"
                value={metalSymbol}
                onChange={(e) => setMetalSymbol(e.target.value)}
                required
                disabled={!!editItem}
                style={{ appearance: 'none' }}
              >
                <option value="GRAMALTIN">Altın (Gram)</option>
                <option value="GRAMGUMUS">Gümüş (Gram)</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label>{activeTab === 'STOCK' ? 'Adet (Lot)' : 'Miktar (Gram)'}</label>
            <input 
              type="number" 
              className="input-field" 
              value={lots}
              onChange={(e) => setLots(e.target.value)}
              required 
              min="0.01"
              step={activeTab === 'STOCK' ? "1" : "0.01"}
            />
          </div>
          <div className="form-group">
            <label>Alış Fiyatı (TL)</label>
            <input 
              type="number" 
              className="input-field" 
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              required 
              min="0.01"
              step="0.01"
            />
          </div>
          <div className="form-group">
            <label>Alış Tarihi</label>
            <input 
              type="date" 
              className="input-field" 
              value={buyDate}
              onChange={(e) => setBuyDate(e.target.value)}
              required 
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
