import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Path, Timer, Lightning, Mountains, Fire, TrendUp, Trash } from '@phosphor-icons/react';
import 'leaflet/dist/leaflet.css';

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const startIcon = L.divIcon({
  html: '<div style="width:12px;height:12px;background:#00FF88;border:2px solid #0A0A0A;border-radius:50%;"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  className: '',
});
const endIcon = L.divIcon({
  html: '<div style="width:12px;height:12px;background:#FF3B30;border:2px solid #0A0A0A;border-radius:50%;"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  className: '',
});

function formatPace(pace) {
  if (!pace || pace === 0) return '--:--';
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDuration(seconds) {
  if (!seconds) return '0:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function RunDetail() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRun = async () => {
      try {
        const res = await axios.get(`${API}/api/runs/${runId}`, { withCredentials: true });
        setRun(res.data);
      } catch (err) {
        console.error('Failed to load run', err);
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchRun();
  }, [runId, navigate]);

  const deleteRun = async () => {
    if (!confirm('Delete this run?')) return;
    try {
      await axios.delete(`${API}/api/runs/${runId}`, { withCredentials: true });
      navigate('/dashboard');
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

  if (!run) return null;

  const polyline = run.points.map(p => [p.lat, p.lng]);
  const center = polyline.length > 0 ? polyline[Math.floor(polyline.length / 2)] : [48.8566, 2.3522];

  // Elevation data for chart
  const elevationData = run.points
    .filter(p => p.alt !== undefined && p.alt !== null && p.alt !== 0)
    .map((p, i) => ({ index: i, elevation: Math.round(p.alt) }));

  return (
    <div data-testid="run-detail-page" className="max-w-7xl mx-auto px-4 md:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard"
            data-testid="back-to-dashboard"
            className="p-2 border no-underline transition-colors"
            style={{ borderColor: '#27272A', borderRadius: '4px', color: '#A1A1AA' }}
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>{run.name}</h1>
            <p className="text-sm mt-1" style={{ color: '#A1A1AA' }}>{formatDate(run.created_at)}</p>
          </div>
        </div>
        <button
          data-testid="delete-run-detail-btn"
          onClick={deleteRun}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold border cursor-pointer transition-colors"
          style={{ background: 'transparent', borderColor: '#27272A', color: '#FF3B30', borderRadius: '4px' }}
        >
          <Trash size={16} /> Delete
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
          <div className="flex items-center gap-2 mb-2">
            <Path size={16} weight="bold" style={{ color: '#00A3FF' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Distance</span>
          </div>
          <p className="text-4xl font-black tracking-tighter" style={{ color: '#fff' }}>{run.distance.toFixed(2)} <span className="text-sm font-normal" style={{ color: '#A1A1AA' }}>km</span></p>
        </div>
        <div className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
          <div className="flex items-center gap-2 mb-2">
            <Timer size={16} weight="bold" style={{ color: '#00FF88' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Duration</span>
          </div>
          <p className="text-4xl font-black tracking-tighter" style={{ color: '#fff' }}>{formatDuration(run.duration)}</p>
        </div>
        <div className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendUp size={16} weight="bold" style={{ color: '#00A3FF' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Avg Pace</span>
          </div>
          <p className="text-4xl font-black tracking-tighter" style={{ color: '#00FF88' }}>{formatPace(run.avg_pace)} <span className="text-sm font-normal" style={{ color: '#A1A1AA' }}>min/km</span></p>
        </div>
        <div className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
          <div className="flex items-center gap-2 mb-2">
            <Lightning size={16} weight="bold" style={{ color: '#FF3B30' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Speed</span>
          </div>
          <p className="text-4xl font-black tracking-tighter" style={{ color: '#fff' }}>{run.avg_speed.toFixed(1)} <span className="text-sm font-normal" style={{ color: '#A1A1AA' }}>km/h</span></p>
        </div>
        <div className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
          <div className="flex items-center gap-2 mb-2">
            <Mountains size={16} weight="bold" style={{ color: '#00FF88' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Elev Gain</span>
          </div>
          <p className="text-4xl font-black tracking-tighter" style={{ color: '#fff' }}>{run.elevation_gain.toFixed(0)} <span className="text-sm font-normal" style={{ color: '#A1A1AA' }}>m</span></p>
        </div>
        <div className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
          <div className="flex items-center gap-2 mb-2">
            <Mountains size={16} weight="bold" style={{ color: '#FF3B30' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Elev Loss</span>
          </div>
          <p className="text-4xl font-black tracking-tighter" style={{ color: '#fff' }}>{run.elevation_loss.toFixed(0)} <span className="text-sm font-normal" style={{ color: '#A1A1AA' }}>m</span></p>
        </div>
        <div className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
          <div className="flex items-center gap-2 mb-2">
            <Fire size={16} weight="bold" style={{ color: '#FF3B30' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Calories</span>
          </div>
          <p className="text-4xl font-black tracking-tighter" style={{ color: '#fff' }}>{Math.round(run.calories)} <span className="text-sm font-normal" style={{ color: '#A1A1AA' }}>kcal</span></p>
        </div>
        <div className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
          <div className="flex items-center gap-2 mb-2">
            <Path size={16} weight="bold" style={{ color: '#00A3FF' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Points</span>
          </div>
          <p className="text-4xl font-black tracking-tighter" style={{ color: '#fff' }}>{run.points.length}</p>
        </div>
      </div>

      {/* Map */}
      <div className="border overflow-hidden mb-6" style={{ borderColor: '#27272A', borderRadius: '4px', height: '400px' }}>
        {polyline.length > 0 && (
          <MapContainer center={center} zoom={15} style={{ width: '100%', height: '100%' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            <Polyline positions={polyline} color="#00A3FF" weight={4} opacity={0.9} />
            {polyline.length > 0 && <Marker position={polyline[0]} icon={startIcon} />}
            {polyline.length > 1 && <Marker position={polyline[polyline.length - 1]} icon={endIcon} />}
          </MapContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Elevation Chart */}
        {elevationData.length > 0 && (
          <div className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
            <h3 className="text-xl mb-4" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>Elevation Profile</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={elevationData}>
                <defs>
                  <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00A3FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00A3FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="index" hide />
                <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{ background: '#1F1F1F', border: '1px solid #27272A', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value) => [`${value} m`, 'Elevation']}
                />
                <Area type="monotone" dataKey="elevation" stroke="#00A3FF" fill="url(#elevGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Splits Table */}
        {run.splits && run.splits.length > 0 && (
          <div className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
            <h3 className="text-xl mb-4" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>Splits</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid #27272A' }}>
                    <th className="text-left py-2 px-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>KM</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Time</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Pace</th>
                  </tr>
                </thead>
                <tbody>
                  {run.splits.map((split, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #27272A' }}>
                      <td className="py-2 px-2 font-medium" style={{ color: '#fff' }}>{split.km}</td>
                      <td className="py-2 px-2 text-right" style={{ color: '#A1A1AA' }}>{Math.round(split.time)}s</td>
                      <td className="py-2 px-2 text-right font-bold" style={{ color: '#00FF88' }}>{formatPace(split.pace)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
