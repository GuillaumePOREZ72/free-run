import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { EnvelopeSimple, Lock, Eye, EyeSlash, UserCircle, Path, GoogleLogo } from '@phosphor-icons/react';

function formatApiErrorDetail(detail) {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).filter(Boolean).join(' ');
  if (detail?.msg) return detail.msg;
  return String(detail);
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4" style={{ background: '#0A0A0A' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-sm flex items-center justify-center" style={{ background: '#00A3FF' }}>
              <Path size={24} weight="bold" color="#0A0A0A" />
            </div>
          </div>
          <h1 className="text-5xl mb-2" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>RunTracker</h1>
          <p className="text-sm" style={{ color: '#A1A1AA' }}>Start tracking your runs today.</p>
        </div>

        <div className="p-6 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '6px' }}>
          <h2 className="text-2xl mb-6" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>Create Account</h2>

          {error && (
            <div data-testid="register-error" className="mb-4 p-3 text-sm" style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', color: '#FF3B30', borderRadius: '4px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Name</label>
              <div className="relative">
                <UserCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#A1A1AA' }} />
                <input
                  data-testid="register-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-14 pr-4 py-3 text-sm border outline-none focus:border-[#00A3FF] transition-colors"
                  style={{ background: '#0A0A0A', borderColor: '#27272A', color: '#fff', borderRadius: '4px' }}
                  placeholder="Your name"
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Email</label>
              <div className="relative">
                <EnvelopeSimple size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#A1A1AA' }} />
                <input
                  data-testid="register-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-14 pr-4 py-3 text-sm border outline-none focus:border-[#00A3FF] transition-colors"
                  style={{ background: '#0A0A0A', borderColor: '#27272A', color: '#fff', borderRadius: '4px' }}
                  placeholder="you@email.com"
                  required
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#A1A1AA' }} />
                <input
                  data-testid="register-password-input"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-14 pr-14 py-3 text-sm border outline-none focus:border-[#00A3FF] transition-colors"
                  style={{ background: '#0A0A0A', borderColor: '#27272A', color: '#fff', borderRadius: '4px' }}
                  placeholder="Min 6 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ background: 'none', border: 'none', color: '#A1A1AA' }}
                >
                  {showPw ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              data-testid="register-submit-button"
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-bold uppercase tracking-widest border-none cursor-pointer transition-all"
              style={{
                background: loading ? '#1a6eb5' : '#00A3FF',
                color: '#0A0A0A',
                borderRadius: '4px',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>



          <p className="text-center mt-6 text-sm" style={{ color: '#A1A1AA' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold no-underline" style={{ color: '#00A3FF' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
