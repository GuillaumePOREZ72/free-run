import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { User, Barbell, Ruler, FloppyDisk } from '@phosphor-icons/react';

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [weight, setWeight] = useState(user?.weight || 70);
  const [height, setHeight] = useState(user?.height || 175);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await axios.put(`${API}/api/profile`, { name, weight: parseFloat(weight), height: parseFloat(height) }, { withCredentials: true });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="profile-page" className="max-w-2xl mx-auto px-4 md:px-8 py-6">
      <h1 className="text-4xl md:text-5xl mb-6" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>Profile</h1>

      <div className="p-6 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 flex items-center justify-center" style={{ background: 'rgba(0,163,255,0.1)', borderRadius: '4px' }}>
            <User size={32} weight="bold" style={{ color: '#00A3FF' }} />
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: '#fff' }}>{user?.name}</p>
            <p className="text-sm" style={{ color: '#A1A1AA' }}>{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#A1A1AA' }}>
                <User size={14} /> Name
              </label>
              <input
                data-testid="profile-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border outline-none focus:border-[#00A3FF]"
                style={{ background: '#0A0A0A', borderColor: '#27272A', color: '#fff', borderRadius: '4px' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#A1A1AA' }}>
                  <Barbell size={14} /> Weight (kg)
                </label>
                <input
                  data-testid="profile-weight-input"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border outline-none focus:border-[#00A3FF]"
                  style={{ background: '#0A0A0A', borderColor: '#27272A', color: '#fff', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#A1A1AA' }}>
                  <Ruler size={14} /> Height (cm)
                </label>
                <input
                  data-testid="profile-height-input"
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border outline-none focus:border-[#00A3FF]"
                  style={{ background: '#0A0A0A', borderColor: '#27272A', color: '#fff', borderRadius: '4px' }}
                />
              </div>
            </div>

            <p className="text-xs" style={{ color: '#A1A1AA' }}>
              Weight is used to calculate calorie burn during runs.
            </p>
          </div>

          <button
            data-testid="save-profile-btn"
            type="submit"
            disabled={saving}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider border-none cursor-pointer transition-colors"
            style={{ background: saved ? '#00FF88' : '#00A3FF', color: '#0A0A0A', borderRadius: '4px' }}
          >
            <FloppyDisk size={16} weight="bold" />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
