import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Path, Timer, MapPin, User, SignOut, List } from '@phosphor-icons/react';
import { useState } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: Path },
    { to: '/planner', label: 'Planner', icon: MapPin },
    { to: '/tracking', label: 'Tracking', icon: Timer },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <header data-testid="app-header" className="sticky top-0 z-50 border-b" style={{ background: '#0A0A0A', borderColor: '#27272A' }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2 no-underline" data-testid="logo-link">
          <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: '#00A3FF' }}>
            <Path size={20} weight="bold" color="#0A0A0A" />
          </div>
          <span className="text-xl tracking-tight uppercase" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>
            RunTracker
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" data-testid="desktop-nav">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              data-testid={`nav-${label.toLowerCase()}`}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium no-underline transition-colors"
              style={{
                color: isActive(to) ? '#00A3FF' : '#A1A1AA',
                background: isActive(to) ? 'rgba(0,163,255,0.08)' : 'transparent',
                borderRadius: '4px',
              }}
            >
              <Icon size={18} weight={isActive(to) ? 'fill' : 'regular'} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <span className="text-sm" style={{ color: '#A1A1AA' }}>{user?.name || user?.email}</span>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium border transition-colors cursor-pointer"
            style={{ color: '#FF3B30', borderColor: '#27272A', background: 'transparent', borderRadius: '4px' }}
          >
            <SignOut size={16} />
            Logout
          </button>
        </div>

        <button
          className="md:hidden p-2 cursor-pointer"
          style={{ background: 'transparent', border: 'none', color: '#fff' }}
          onClick={() => setMenuOpen(!menuOpen)}
          data-testid="mobile-menu-toggle"
        >
          <List size={24} />
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t px-4 py-3" style={{ background: '#141414', borderColor: '#27272A' }}>
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 text-sm font-medium no-underline"
              style={{ color: isActive(to) ? '#00A3FF' : '#A1A1AA' }}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 text-sm font-medium cursor-pointer w-full"
            style={{ color: '#FF3B30', background: 'transparent', border: 'none' }}
          >
            <SignOut size={18} />
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
