import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { Play, Pause, Stop, Timer, Path, Lightning, Mountains, Fire, Trophy } from '@phosphor-icons/react';
import 'leaflet/dist/leaflet.css';

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

const currentIcon = L.divIcon({
  html: '<div style="width:16px;height:16px;background:#00A3FF;border:3px solid #fff;border-radius:50%;box-shadow:0 0 12px #00A3FF;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  className: '',
});

function haversineDistance(p1, p2) {
  const R = 6371;
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((p1[0] * Math.PI) / 180) * Math.cos((p2[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatPace(pace) {
  if (!pace || pace === 0 || !isFinite(pace)) return '--:--';
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function MapFollower({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom());
  }, [position, map]);
  return null;
}

export default function LiveTracking() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle, running, paused
  const [points, setPoints] = useState([]);
  const [currentPos, setCurrentPos] = useState(null);
  const [center, setCenter] = useState([48.8566, 2.3522]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [elevationGain, setElevationGain] = useState(0);
  const [elevationLoss, setElevationLoss] = useState(0);
  const [splits, setSplits] = useState([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [newRecords, setNewRecords] = useState([]);
  const [locating, setLocating] = useState(true);
  const [geoError, setGeoError] = useState(null); // 1=PERMISSION_DENIED 2=UNAVAILABLE 3=TIMEOUT

  const watchRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedDurationRef = useRef(0);
  const lastSplitDistRef = useRef(0);
  const lastSplitTimeRef = useRef(0);
  const pointsRef = useRef([]);

  // Get initial location
  const requestLocation = () => {
    setLocating(true);
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError(2);
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = [pos.coords.latitude, pos.coords.longitude];
        setCenter(c);
        setCurrentPos(c);
        setLocating(false);
      },
      (err) => {
        setGeoError(err.code);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const startTracking = () => {
    if (!navigator.geolocation) return;
    setStatus('running');
    startTimeRef.current = Date.now();
    lastSplitDistRef.current = 0;
    lastSplitTimeRef.current = 0;

    timerRef.current = setInterval(() => {
      setDuration(((Date.now() - startTimeRef.current) / 1000) + pausedDurationRef.current);
    }, 1000);

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          alt: pos.coords.altitude || 0,
          timestamp: Date.now(),
        };
        setCurrentPos([newPoint.lat, newPoint.lng]);

        setPoints(prev => {
          const updated = [...prev, newPoint];
          pointsRef.current = updated;

          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const d = haversineDistance([last.lat, last.lng], [newPoint.lat, newPoint.lng]);
            setDistance(prevDist => {
              const newDist = prevDist + d;

              // Elevation tracking
              if (newPoint.alt && last.alt) {
                const elDiff = newPoint.alt - last.alt;
                if (elDiff > 0) setElevationGain(g => g + elDiff);
                else setElevationLoss(l => l + Math.abs(elDiff));
              }

              // Splits per km
              const currentKm = Math.floor(newDist);
              const lastKm = Math.floor(lastSplitDistRef.current);
              if (currentKm > lastKm && currentKm > 0) {
                const currentTime = ((Date.now() - startTimeRef.current) / 1000) + pausedDurationRef.current;
                const splitTime = currentTime - lastSplitTimeRef.current;
                const splitDist = newDist - lastSplitDistRef.current;
                const splitPace = (splitTime / 60) / splitDist;
                setSplits(s => [...s, { km: currentKm, time: splitTime, pace: splitPace }]);
                lastSplitDistRef.current = newDist;
                lastSplitTimeRef.current = currentTime;
              }
              return newDist;
            });
          }
          return updated;
        });
      },
      (err) => {
        console.error('Geo watch error:', err.code, err.message);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  };

  const pauseTracking = () => {
    setStatus('paused');
    clearInterval(timerRef.current);
    pausedDurationRef.current = duration;
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
  };

  const resumeTracking = () => {
    setStatus('running');
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      setDuration(((Date.now() - startTimeRef.current) / 1000) + pausedDurationRef.current);
    }, 1000);

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          alt: pos.coords.altitude || 0,
          timestamp: Date.now(),
        };
        setCurrentPos([newPoint.lat, newPoint.lng]);
        setPoints(prev => {
          const updated = [...prev, newPoint];
          pointsRef.current = updated;
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const d = haversineDistance([last.lat, last.lng], [newPoint.lat, newPoint.lng]);
            setDistance(prevDist => prevDist + d);
          }
          return updated;
        });
      },
      (err) => {
        console.error('Geo watch error:', err.code, err.message);
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
  };

  const stopTracking = () => {
    setStatus('idle');
    clearInterval(timerRef.current);
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
  };

  const saveRun = async () => {
    if (points.length < 2 || !name.trim()) return;
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/runs`, {
        name: name.trim(),
        points,
        distance: parseFloat(distance.toFixed(3)),
        duration: Math.round(duration),
        elevation_gain: elevationGain,
        elevation_loss: elevationLoss,
        splits,
      }, { withCredentials: true });
      if (res.data.new_records && res.data.new_records.length > 0) {
        setNewRecords(res.data.new_records);
        // Auto-navigate after showing records
        setTimeout(() => navigate('/dashboard'), 4000);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Failed to save run', err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  const pace = distance > 0 ? (duration / 60) / distance : 0;
  const speed = duration > 0 ? distance / (duration / 3600) : 0;
  const polyline = points.map(p => [p.lat, p.lng]);

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

  if (geoError) {
    const messages = {
      1: {
        title: 'Location access denied',
        detail: 'Open the padlock icon in your browser address bar, set Location to "Allow", then retry.',
      },
      2: {
        title: 'Location unavailable',
        detail: 'Your device could not determine your position. Check that location services are enabled.',
      },
      3: {
        title: 'Location request timed out',
        detail: 'It took too long to get your position. Make sure you have a GPS or network signal.',
      },
    };
    const msg = messages[geoError] || { title: 'Location error', detail: 'An unknown error occurred.' };
    return (
      <div className="flex items-center justify-center py-20 px-4">
        <div className="text-center max-w-sm w-full p-6 border" style={{ background: '#141414', borderColor: '#FF3B30', borderRadius: '4px' }}>
          <p className="text-3xl mb-1" style={{ fontFamily: 'Bebas Neue', color: '#FF3B30' }}>{msg.title}</p>
          <p className="text-sm mb-6" style={{ color: '#A1A1AA' }}>{msg.detail}</p>
          <button
            onClick={requestLocation}
            className="w-full px-4 py-3 text-sm font-bold uppercase tracking-wider border-none cursor-pointer"
            style={{ background: '#00A3FF', color: '#0A0A0A', borderRadius: '4px' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="tracking-page" className="w-full px-4 py-6">
      {/* New Record Celebration Overlay */}
      {newRecords.length > 0 && (
        <div
          data-testid="new-record-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div className="text-center p-8 max-w-md" style={{ animation: 'fadeInScale 0.5s ease-out' }}>
            <Trophy size={80} weight="fill" style={{ color: '#FFD700' }} className="mx-auto mb-4" />
            <h2 className="text-5xl mb-2" style={{ fontFamily: 'Bebas Neue', color: '#FFD700' }}>
              New Record{newRecords.length > 1 ? 's' : ''}!
            </h2>
            <div className="space-y-3 mt-6">
              {newRecords.map((rec, i) => {
                const labelMap = { '1km': '1 KM', '5km': '5 KM', '10km': '10 KM', 'semi': 'Semi-Marathon', 'marathon': 'Marathon' };
                return (
                  <div key={i} className="p-4 border" style={{ background: '#141414', borderColor: '#FFD700', borderRadius: '4px' }}>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#FFD700' }}>
                      {labelMap[rec.category] || rec.category}
                    </p>
                    <p className="text-3xl font-black tracking-tighter" style={{ color: '#fff' }}>
                      {formatDuration(rec.time)}
                    </p>
                    <p className="text-sm" style={{ color: '#00FF88' }}>
                      {formatPace(rec.pace)} min/km
                    </p>
                    {rec.improvement && (
                      <p className="text-sm mt-1" style={{ color: '#00FF88' }}>
                        -{rec.improvement}s improvement!
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              data-testid="dismiss-records-btn"
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-8 py-3 text-sm font-bold uppercase tracking-wider border-none cursor-pointer"
              style={{ background: '#FFD700', color: '#0A0A0A', borderRadius: '4px' }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <h1 className="text-4xl md:text-5xl mb-6" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>
        {status === 'running' ? 'Running...' : status === 'paused' ? 'Paused' : 'Live Tracking'}
      </h1>

      <div className="grid grid-cols-1  gap-4">
        {/* Metrics Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Big metrics */}
          <div className="p-5 border text-center" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#A1A1AA' }}>Distance</p>
            <p data-testid="live-distance" className="text-5xl font-black tracking-tighter" style={{ color: '#00A3FF' }}>
              {distance.toFixed(2)}
            </p>
            <p className="text-sm" style={{ color: '#A1A1AA' }}>km</p>
          </div>

          <div className="p-5 border text-center" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#A1A1AA' }}>Duration</p>
            <p data-testid="live-duration" className="text-5xl font-black tracking-tighter" style={{ color: '#fff' }}>
              {formatDuration(duration)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border text-center" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#A1A1AA' }}>Pace</p>
              <p data-testid="live-pace" className="text-2xl font-bold" style={{ color: '#00FF88' }}>{formatPace(pace)}</p>
              <p className="text-xs" style={{ color: '#A1A1AA' }}>min/km</p>
            </div>
            <div className="p-3 border text-center" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#A1A1AA' }}>Speed</p>
              <p data-testid="live-speed" className="text-2xl font-bold" style={{ color: '#fff' }}>{speed.toFixed(1)}</p>
              <p className="text-xs" style={{ color: '#A1A1AA' }}>km/h</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border text-center" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#A1A1AA' }}>Elev +</p>
              <p className="text-lg font-bold" style={{ color: '#00FF88' }}>{elevationGain.toFixed(0)} m</p>
            </div>
            <div className="p-3 border text-center" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#A1A1AA' }}>Elev -</p>
              <p className="text-lg font-bold" style={{ color: '#FF3B30' }}>{elevationLoss.toFixed(0)} m</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {status === 'idle' && (
              <button
                data-testid="start-tracking-btn"
                onClick={startTracking}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold uppercase tracking-wider border-none cursor-pointer"
                style={{ background: '#00FF88', color: '#0A0A0A', borderRadius: '4px' }}
              >
                <Play size={20} weight="fill" /> Start
              </button>
            )}
            {status === 'running' && (
              <>
                <button
                  data-testid="pause-tracking-btn"
                  onClick={pauseTracking}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold uppercase tracking-wider border-none cursor-pointer"
                  style={{ background: '#FF9500', color: '#0A0A0A', borderRadius: '4px' }}
                >
                  <Pause size={20} weight="fill" /> Pause
                </button>
                <button
                  data-testid="stop-tracking-btn"
                  onClick={stopTracking}
                  className="flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold uppercase tracking-wider border-none cursor-pointer"
                  style={{ background: '#FF3B30', color: '#fff', borderRadius: '4px' }}
                >
                  <Stop size={20} weight="fill" />
                </button>
              </>
            )}
            {status === 'paused' && (
              <>
                <button
                  data-testid="resume-tracking-btn"
                  onClick={resumeTracking}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold uppercase tracking-wider border-none cursor-pointer"
                  style={{ background: '#00FF88', color: '#0A0A0A', borderRadius: '4px' }}
                >
                  <Play size={20} weight="fill" /> Resume
                </button>
                <button
                  data-testid="stop-tracking-btn-paused"
                  onClick={stopTracking}
                  className="flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold uppercase tracking-wider border-none cursor-pointer"
                  style={{ background: '#FF3B30', color: '#fff', borderRadius: '4px' }}
                >
                  <Stop size={20} weight="fill" />
                </button>
              </>
            )}
          </div>

          {/* Save section - shown when stopped with data */}
          {status === 'idle' && points.length > 1 && (
            <div className="p-4 border space-y-3" style={{ background: '#141414', borderColor: '#00A3FF', borderRadius: '4px' }}>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#00A3FF' }}>Save Your Run</p>
              <input
                data-testid="run-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border outline-none focus:border-[#00A3FF]"
                style={{ background: '#0A0A0A', borderColor: '#27272A', color: '#fff', borderRadius: '4px' }}
                placeholder="Name your run"
              />
              <button
                data-testid="save-run-btn"
                onClick={saveRun}
                disabled={!name.trim() || saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider border-none cursor-pointer disabled:opacity-30"
                style={{ background: '#00A3FF', color: '#0A0A0A', borderRadius: '4px' }}
              >
                {saving ? 'Saving...' : 'Save Run'}
              </button>
            </div>
          )}
        </div>

        {/* Map */}
        <div className="lg:col-span-3 border overflow-hidden" style={{ borderColor: '#27272A', borderRadius: '4px', height: '450px' }}>
          <MapContainer center={center} zoom={16} style={{ width: '100%', height: '100%' }}>
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            />
            {currentPos && <MapFollower position={currentPos} />}
            {polyline.length >= 2 && (
              <Polyline positions={polyline} color="#00A3FF" weight={4} opacity={0.9} />
            )}
            {currentPos && <Marker position={currentPos} icon={currentIcon} />}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
