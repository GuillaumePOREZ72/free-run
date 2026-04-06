import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Path, Timer, Lightning, Mountains, Fire, TrendUp, MapPin, Trash, Calendar, Trophy, Medal } from '@phosphor-icons/react';

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

function formatPace(pace) {
  if (!pace || pace === 0) return '--:--';
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function MetricCard({ icon: Icon, label, value, unit, color = '#00A3FF' }) {
  return (
    <div data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`} className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} weight="bold" style={{ color }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-black tracking-tighter" style={{ fontFamily: 'Manrope', color: '#fff' }}>{value}</span>
        {unit && <span className="text-sm" style={{ color: '#A1A1AA' }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState(null);
  const [records, setRecords] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [runsRes, statsRes, recordsRes] = await Promise.all([
          axios.get(`${API}/api/runs`, { withCredentials: true }),
          axios.get(`${API}/api/runs/stats`, { withCredentials: true }),
          axios.get(`${API}/api/records`, { withCredentials: true }),
        ]);
        setRuns(runsRes.data);
        setStats(statsRes.data);
        setRecords(recordsRes.data);
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const deleteRun = async (runId) => {
    if (!confirm('Delete this run?')) return;
    try {
      await axios.delete(`${API}/api/runs/${runId}`, { withCredentials: true });
      setRuns(runs.filter(r => r.run_id !== runId));
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#00A3FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page" className="w-full px-4 py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1" style={{ color: '#A1A1AA' }}>Welcome back, {user?.name || 'Runner'}</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/planner"
            data-testid="new-route-btn"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-wider no-underline border transition-colors"
            style={{ background: 'transparent', borderColor: '#27272A', color: '#00A3FF', borderRadius: '4px' }}
          >
            <MapPin size={16} weight="bold" /> New Route
          </Link>
          <Link
            to="/tracking"
            data-testid="start-run-btn"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold uppercase tracking-wider no-underline border-none transition-colors"
            style={{ background: '#00A3FF', color: '#0A0A0A', borderRadius: '4px' }}
          >
            <Lightning size={16} weight="bold" /> Start Run
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2  gap-3 md:gap-4 mb-8">
          <MetricCard icon={Path} label="Total Distance" value={stats.total_distance.toFixed(1)} unit="km" />
          <MetricCard icon={Timer} label="Total Time" value={formatDuration(stats.total_duration)} color="#00FF88" />
          <MetricCard icon={Lightning} label="Total Runs" value={stats.total_runs} color="#00A3FF" />
          <MetricCard icon={Fire} label="Calories" value={Math.round(stats.total_calories)} unit="kcal" color="#FF3B30" />
          <MetricCard icon={TrendUp} label="Best Pace" value={formatPace(stats.best_pace)} unit="min/km" color="#00FF88" />
          <MetricCard icon={Mountains} label="Elevation" value={stats.total_elevation.toFixed(0)} unit="m" color="#A1A1AA" />
          <MetricCard icon={Path} label="Longest Run" value={stats.longest_run.toFixed(1)} unit="km" />
          <MetricCard icon={Path} label="Avg Distance" value={stats.avg_distance.toFixed(1)} unit="km" color="#00FF88" />
        </div>
      )}

      {/* Personal Records */}
      {records && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy size={28} weight="fill" style={{ color: '#FFD700' }} />
            <h2 className="text-3xl" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>Personal Records</h2>
          </div>
          <div className="grid grid-cols-2  gap-3">
            {Object.entries(records).map(([key, rec]) => {
              const hasRecord = rec.time !== null;
              const labelMap = { '1km': '1 KM', '5km': '5 KM', '10km': '10 KM', 'semi': 'Semi', 'marathon': 'Marathon' };
              return (
                <div
                  key={key}
                  data-testid={`record-${key}`}
                  className="p-4 border relative overflow-hidden transition-all"
                  style={{
                    background: hasRecord ? '#141414' : '#0f0f0f',
                    borderColor: hasRecord ? '#FFD700' : '#27272A',
                    borderRadius: '4px',
                    borderWidth: hasRecord ? '1px' : '1px',
                  }}
                >
                  {hasRecord && (
                    <div className="absolute top-0 right-0 w-16 h-16 opacity-5">
                      <Trophy size={64} weight="fill" style={{ color: '#FFD700' }} />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Medal size={16} weight={hasRecord ? 'fill' : 'regular'} style={{ color: hasRecord ? '#FFD700' : '#27272A' }} />
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>
                      {labelMap[key] || key}
                    </span>
                  </div>
                  {hasRecord ? (
                    <>
                      <p className="text-3xl font-black tracking-tighter" style={{ color: '#fff' }}>
                        {formatDuration(rec.time)}
                      </p>
                      <p className="text-sm mt-1" style={{ color: '#00FF88' }}>
                        {formatPace(rec.pace)} min/km
                      </p>
                      {rec.run_name && (
                        <p className="text-xs mt-2 truncate" style={{ color: '#A1A1AA' }}>{rec.run_name}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-2xl font-black tracking-tighter" style={{ color: '#27272A' }}>--:--</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Runs */}
      <div>
        <h2 className="text-3xl mb-4" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>Recent Runs</h2>
        {runs.length === 0 ? (
          <div className="text-center py-16 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
            <Path size={48} style={{ color: '#27272A' }} className="mx-auto mb-4" />
            <p className="text-lg mb-2" style={{ color: '#A1A1AA' }}>No runs yet</p>
            <p className="text-sm mb-4" style={{ color: '#A1A1AA' }}>Start tracking your first run!</p>
            <Link
              to="/tracking"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold uppercase tracking-wider no-underline"
              style={{ background: '#00A3FF', color: '#0A0A0A', borderRadius: '4px' }}
            >
              <Lightning size={16} weight="bold" /> Start Running
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {runs.map(run => (
              <div
                key={run.run_id}
                data-testid={`run-item-${run.run_id}`}
                className="flex items-center justify-between p-4 border transition-colors hover:border-[#00A3FF]/30"
                style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}
              >
                <Link to={`/runs/${run.run_id}`} className="flex-1 no-underline flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,163,255,0.1)', borderRadius: '4px' }}>
                    <Path size={20} weight="bold" style={{ color: '#00A3FF' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: '#fff' }}>{run.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Calendar size={12} style={{ color: '#A1A1AA' }} />
                      <span className="text-xs" style={{ color: '#A1A1AA' }}>{formatDate(run.created_at)}</span>
                      <span className="text-xs ml-2 font-bold" style={{ color: '#fff' }}>{run.distance.toFixed(2)} km</span>
                      <span className="text-xs ml-2" style={{ color: '#00FF88' }}>{formatDuration(run.duration)}</span>
                    </div>
                  </div>
                  
                </Link>
                <button
                  data-testid={`delete-run-${run.run_id}`}
                  onClick={() => deleteRun(run.run_id)}
                  className="ml-4 p-2 cursor-pointer transition-colors"
                  style={{ background: 'transparent', border: 'none', color: '#A1A1AA' }}
                >
                  <Trash size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
