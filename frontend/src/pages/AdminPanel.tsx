import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Calendar, Mail, Ban, Unlock, Trash2, TrendingUp, TrendingDown, X, AlertTriangle } from 'lucide-react';
import { API_URL } from '../config';
import './AdminPanel.css';

interface PortfolioItem {
  id: number;
  symbol: string;
  lots: number;
  buyPrice: number;
  buyDate: string;
  currentPrice: number;
}

interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  isBanned: boolean;
  banReason: string | null;
  createdAt: string;
  portfolios: PortfolioItem[];
  totalValue: number;
  totalProfit: number;
  profitPercent: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value);
};

export default function AdminPanel() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [banModal, setBanModal] = useState<{ isOpen: boolean, userId: number | null }>({ isOpen: false, userId: null });
  const [banReason, setBanReason] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, action: 'unban' | 'delete' | null, userId: number | null, title: string, description: string }>({ isOpen: false, action: null, userId: null, title: '', description: '' });
  const [actionError, setActionError] = useState('');
  const { token, user } = useAuth();

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setError('Yetkisiz erişim veya sunucu hatası.');
      }
    } catch (err) {
      setError('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [fetchUsers, user]);

  const openBanModal = (id: number) => {
    setBanModal({ isOpen: true, userId: id });
    setBanReason('');
  };

  const confirmBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banReason.trim()) {
      alert('Geçerli bir sebep girmelisiniz.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/admin/users/${banModal.userId}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: banReason })
      });
      if (res.ok) {
        setBanModal({ isOpen: false, userId: null });
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'İşlem başarısız.');
      }
    } catch (err) {
      alert('Sunucu hatası.');
    }
  };

  const openConfirmModal = (action: 'unban' | 'delete', userId: number, title: string, description: string) => {
    setConfirmModal({ isOpen: true, action, userId, title, description });
    setActionError('');
  };

  const handleUnban = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}/unban`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setConfirmModal({ isOpen: false, action: null, userId: null, title: '', description: '' });
        fetchUsers();
      } else {
        const data = await res.json();
        setActionError(data.error || 'İşlem başarısız.');
      }
    } catch (err) {
      setActionError('Sunucu hatası.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setConfirmModal({ isOpen: false, action: null, userId: null, title: '', description: '' });
        fetchUsers();
      } else {
        const data = await res.json();
        setActionError(data.error || 'İşlem başarısız.');
      }
    } catch (err) {
      setActionError('Sunucu hatası.');
    }
  };

  const confirmAction = () => {
    if (!confirmModal.userId) return;
    if (confirmModal.action === 'unban') handleUnban(confirmModal.userId);
    if (confirmModal.action === 'delete') handleDelete(confirmModal.userId);
  };

  if (user?.role !== 'ADMIN') {
    return <div className="admin-container"><div className="auth-error">Yetkisiz Erişim!</div></div>;
  }

  if (loading) {
    return <div className="admin-container"><div className="text-secondary">Yükleniyor...</div></div>;
  }

  return (
    <div className="admin-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1><Shield size={28} className="text-warning" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '8px' }} /> Admin Paneli</h1>
          <p className="text-secondary">Tüm kullanıcıları, yasakları ve yatırımları yönetin</p>
        </div>
      </div>
      
      {error && <div className="auth-error">{error}</div>}

      <div className="users-grid">
        {users.map(u => (
          <div key={u.id} className={`user-card glass-panel ${u.isBanned ? 'banned-card' : ''}`}>
            <div className="user-card-header">
              <div className="user-info">
                <div className={`user-avatar ${u.isBanned ? 'banned-avatar' : ''}`}>
                  {u.isBanned ? <Ban size={24} /> : <Users size={24} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: u.isBanned ? '#ef4444' : 'var(--text-primary)' }}>
                    {u.name} 
                    {u.role === 'ADMIN' && <span className="badge-admin">Admin</span>}
                    {u.isBanned && <span className="badge-banned">Yasaklı</span>}
                  </h3>
                  <div className="user-meta">
                    <span><Mail size={14} /> {u.email}</span>
                    <span><Calendar size={14} /> {new Date(u.createdAt).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="user-stats">
              <div className="stat-box">
                <span className="stat-label">Toplam Varlık</span>
                <span className="stat-value">{formatCurrency(u.totalValue)}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Toplam Kâr / Zarar</span>
                <span className={`stat-value ${u.totalProfit >= 0 ? 'text-success' : 'text-danger'}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {u.totalProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {formatCurrency(u.totalProfit)} 
                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>({u.profitPercent.toFixed(2)}%)</span>
                </span>
              </div>
            </div>
            
            <div className="user-portfolio">
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>Portföy ({u.portfolios.length} Hisse)</h4>
              {u.portfolios.length > 0 ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Hisse</th>
                        <th>Lot</th>
                        <th>Maliyet</th>
                        <th>Güncel Değer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {u.portfolios.map(item => (
                        <tr key={item.id}>
                          <td><strong>{item.symbol}</strong></td>
                          <td>{item.lots}</td>
                          <td>{formatCurrency(item.buyPrice * item.lots)}</td>
                          <td>{formatCurrency(item.currentPrice * item.lots)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '10px' }}>Henüz hisse eklenmemiş.</p>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="user-actions">
              {u.role !== 'ADMIN' && (
                <>
                  {u.isBanned ? (
                    <button className="btn btn-outline" style={{ borderColor: '#10b981', color: '#10b981', flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={() => openConfirmModal('unban', u.id, 'Yasağı Kaldır', 'Bu kullanıcının yasağını kaldırmak istediğinize emin misiniz? Kullanıcı tekrar sisteme giriş yapabilecektir.')}>
                      <Unlock size={16} /> Ban Kaldır
                    </button>
                  ) : (
                    <button className="btn btn-outline" style={{ borderColor: '#ef4444', color: '#ef4444', flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={() => openBanModal(u.id)}>
                      <Ban size={16} /> Banla
                    </button>
                  )}
                  <button className="btn btn-danger" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={() => openConfirmModal('delete', u.id, 'Kullanıcıyı Sil', 'DİKKAT: Bu kullanıcıyı ve tüm yatırımlarını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')}>
                    <Trash2 size={16} /> Sil
                  </button>
                </>
              )}
              {u.role === 'ADMIN' && (
                <div className="text-secondary" style={{ fontSize: '0.85rem', width: '100%', textAlign: 'center', padding: '8px' }}>
                  Admin hesapları yönetilemez.
                </div>
              )}
            </div>

          </div>
        ))}
      </div>

      {banModal.isOpen && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Kullanıcıyı Yasakla</h3>
              <button className="close-btn" onClick={() => setBanModal({ isOpen: false, userId: null })}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={confirmBan} className="modal-form">
              <div className="form-group">
                <label>Yasaklama Sebebi</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  required 
                  placeholder="Örn: Küfürlü kullanım"
                  autoFocus
                />
              </div>
              <div className="modal-actions" style={{ marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setBanModal({ isOpen: false, userId: null })}>İptal</button>
                <button type="submit" className="btn btn-danger">Yasakla</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 100 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px' }}>
            <div style={{ color: confirmModal.action === 'delete' ? '#ef4444' : '#10b981', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <AlertTriangle size={48} />
            </div>
            <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>{confirmModal.title}</h3>
            <p className="text-secondary" style={{ marginBottom: '24px' }}>
              {confirmModal.description}
            </p>
            {actionError && <div className="auth-error" style={{ marginBottom: '16px' }}>{actionError}</div>}
            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmModal({ isOpen: false, action: null, userId: null, title: '', description: '' })}>İptal</button>
              <button className={confirmModal.action === 'delete' ? 'btn btn-danger' : 'btn'} style={confirmModal.action !== 'delete' ? { background: '#10b981', borderColor: '#10b981' } : {}} onClick={confirmAction}>Onayla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
