import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { MapPin, Trash, FloppyDisk, ArrowCounterClockwise, Path } from '@phosphor-icons/react';
import 'leaflet/dist/leaflet.css';

const API = import.meta.env.VITE_BACKEND_URL;

const startIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;background:#00FF88;border:2px solid #0A0A0A;border-radius:50%;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  className: '',
});
const endIcon = L.divIcon({
  html: '<div style="width:14px;height:14px;background:#FF3B30;border:2px solid #0A0A0A;border-radius:50%;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  className: '',
});

function haversineDistance(p1, p2) {
  const R = 6371;
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((p1[0] * Math.PI) / 180) * Math.cos((p2[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcTotalDistance(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance([points[i - 1].lat, points[i - 1].lng], [points[i].lat, points[i].lng]);
  }
  return total;
}

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

export default function RoutePlanner() {
  const navigate = useNavigate();
  const [points, setPoints] = useState([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [center, setCenter] = useState([48.8566, 2.3522]);
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCenter([pos.coords.latitude, pos.coords.longitude]);
          setLocating(false);
        },
        () => setLocating(false),
        { enableHighAccuracy: true }
      );
    } else {
      setLocating(false);
    }
  }, []);

  const handleMapClick = useCallback((latlng) => {
    setPoints(prev => [...prev, { lat: latlng.lat, lng: latlng.lng }]);
  }, []);

  const removeLastPoint = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  const clearAll = () => {
    setPoints([]);
  };

  const distance = calcTotalDistance(points);

  const saveRoute = async () => {
    if (points.length < 2 || !name.trim()) return;
    setSaving(true);
    try {
      await axios.post(`${API}/api/routes`, {
        name: name.trim(),
        points,
        distance: parseFloat(distance.toFixed(3)),
        estimated_duration: (distance / 10) * 3600,
      }, { withCredentials: true });
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to save route', err);
    } finally {
      setSaving(false);
    }
  };

  const polylinePositions = points.map(p => [p.lat, p.lng]);

  if (locating) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-[#00A3FF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: '#A1A1AA' }}>Getting your location...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="planner-page" className="max-w-7xl mx-auto px-4 md:px-8 py-6">
      <h1 className="text-4xl md:text-5xl mb-6" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>Route Planner</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Route Name</label>
            <input
              data-testid="route-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border outline-none focus:border-[#00A3FF]"
              style={{ background: '#0A0A0A', borderColor: '#27272A', color: '#fff', borderRadius: '4px' }}
              placeholder="Morning loop"
            />
          </div>

          <div className="p-4 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
            <p className="text-xs font-semibold mb-3 uppercase tracking-widest" style={{ color: '#A1A1AA' }}>Route Info</p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: '#A1A1AA' }}>Points</span>
                <span className="text-sm font-bold" style={{ color: '#fff' }}>{points.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: '#A1A1AA' }}>Distance</span>
                <span className="text-sm font-bold" style={{ color: '#00A3FF' }}>{distance.toFixed(2)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: '#A1A1AA' }}>Est. Time (10 km/h)</span>
                <span className="text-sm font-bold" style={{ color: '#fff' }}>{Math.round((distance / 10) * 60)} min</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              data-testid="undo-point-btn"
              onClick={removeLastPoint}
              disabled={points.length === 0}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-semibold border cursor-pointer transition-colors disabled:opacity-30"
              style={{ background: 'transparent', borderColor: '#27272A', color: '#A1A1AA', borderRadius: '4px' }}
            >
              <ArrowCounterClockwise size={16} /> Undo
            </button>
            <button
              data-testid="clear-points-btn"
              onClick={clearAll}
              disabled={points.length === 0}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 text-sm font-semibold border cursor-pointer transition-colors disabled:opacity-30"
              style={{ background: 'transparent', borderColor: '#27272A', color: '#FF3B30', borderRadius: '4px' }}
            >
              <Trash size={16} /> Clear
            </button>
          </div>

          <button
            data-testid="save-route-btn"
            onClick={saveRoute}
            disabled={points.length < 2 || !name.trim() || saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider border-none cursor-pointer transition-colors disabled:opacity-30"
            style={{ background: '#00A3FF', color: '#0A0A0A', borderRadius: '4px' }}
          >
            <FloppyDisk size={16} weight="bold" /> {saving ? 'Saving...' : 'Save Route'}
          </button>

          <p className="text-xs text-center" style={{ color: '#A1A1AA' }}>
            Click on the map to add waypoints
          </p>
        </div>

        {/* Map */}
        <div className="lg:col-span-3 border overflow-hidden" style={{ borderColor: '#27272A', borderRadius: '4px', height: '600px' }}>
          <MapContainer center={center} zoom={15} style={{ width: '100%', height: '100%' }} zoomControl={true}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            <ClickHandler onMapClick={handleMapClick} />
            {polylinePositions.length >= 2 && (
              <Polyline positions={polylinePositions} color="#00A3FF" weight={4} opacity={0.9} />
            )}
            {points.length > 0 && <Marker position={[points[0].lat, points[0].lng]} icon={startIcon} />}
            {points.length > 1 && <Marker position={[points[points.length - 1].lat, points[points.length - 1].lng]} icon={endIcon} />}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
