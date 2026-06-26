import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import StockDetail from './pages/StockDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import PortfolioHistory from './pages/PortfolioHistory';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LayoutDashboard, TrendingUp, Sun, Moon, LogOut, Shield } from 'lucide-react';
import AdminPanel from './pages/AdminPanel';
import './App.css';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--text-secondary)' }}>Yükleniyor...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

function AppContent() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const { user, logout } = useAuth();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="layout-wrapper">
      <header className="top-navbar glass-panel">
        <div className="logo">
          <TrendingUp size={28} color="#3b82f6" />
          <h2>BIST Tracker</h2>
        </div>
        <nav className="nav-links">
          {user && (
            <Link to="/" className="nav-link">
              <LayoutDashboard size={20} />
              Dashboard
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="nav-link text-warning">
              <Shield size={20} />
              Admin Paneli
            </Link>
          )}
        </nav>
        
        <div className="theme-switch-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user.name}</span>
              <button onClick={logout} className="action-btn text-danger" title="Çıkış Yap" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <LogOut size={18} />
              </button>
            </div>
          )}
          <div className="theme-switch" onClick={toggleTheme} title="Tema Değiştir">
            <div className="switch-handle">
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            </div>
          </div>
        </div>
      </header>
      
      <div className="app-container">
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><PortfolioHistory /></ProtectedRoute>} />
            <Route path="/stock/:symbol" element={<ProtectedRoute><StockDetail /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
