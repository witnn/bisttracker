import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Lock, Mail, Ban } from 'lucide-react';
import { API_URL } from '../config';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [bannedMsg, setBannedMsg] = useState<{ isOpen: boolean, reason: string }>({ isOpen: false, reason: '' });
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        navigate('/');
      } else if (res.status === 403) {
        setBannedMsg({ isOpen: true, reason: data.error });
        setError('');
      } else {
        setError(data.error);
      }
    } catch {
      setError('Bağlantı hatası.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel animate-fade-in">
        <div className="auth-header">
          <TrendingUp size={40} color="#3b82f6" style={{ marginBottom: '16px' }} />
          <h2>Hoş Geldiniz</h2>
          <p className="text-secondary">Portföyünüze erişmek için giriş yapın</p>
        </div>
        
        {error && <div className="auth-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <Mail size={20} className="input-icon" />
            <input 
              type="email" 
              placeholder="E-posta" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className="input-group">
            <Lock size={20} className="input-icon" />
            <input 
              type="password" 
              placeholder="Şifre" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn auth-btn">Giriş Yap</button>
        </form>
        
        <div className="auth-footer">
          <p className="text-secondary">Hesabınız yok mu? <Link to="/register">Kayıt Ol</Link></p>
        </div>
      </div>

      {bannedMsg.isOpen && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 100 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '400px', textAlign: 'center', padding: '30px' }}>
            <div style={{ color: '#ef4444', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <Ban size={48} />
            </div>
            <h3 style={{ marginBottom: '12px', color: '#ef4444' }}>Erişim Engellendi</h3>
            <p className="text-secondary" style={{ marginBottom: '20px' }}>
              Bu hesap sistem yöneticileri tarafından erişime kapatılmıştır.
            </p>
            <div style={{ background: 'var(--input-bg)', padding: '16px', borderRadius: '8px', border: '1px dashed rgba(239, 68, 68, 0.3)', marginBottom: '24px', textAlign: 'left' }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Moderatör Mesajı:</strong>
              <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{bannedMsg.reason}"</span>
            </div>
            <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setBannedMsg({ isOpen: false, reason: '' })}>
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
