# Routes Gallery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ajouter une page `/routes` permettant de visualiser et supprimer les parcours sauvegardés, avec un modal Leaflet slide-up.

**Architecture:** Nouveau composant `Routes.jsx` avec liste de cartes et modal inline. Les données viennent du `GET /api/routes` existant. La suppression utilise `DELETE /api/routes/:id` avec confirmation inline.

**Tech Stack:** React, react-leaflet, axios, Phosphor Icons, Tailwind CSS v4

---

### Task 1 : Créer la page Routes.jsx

**Files:**
- Create: `frontend/src/pages/Routes.jsx`

**Step 1 : Créer le fichier avec les états et le fetch initial**

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { BookOpen, MapPin, Plus, Trash, X } from '@phosphor-icons/react';
import 'leaflet/dist/leaflet.css';

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const startIcon = L.divIcon({
  html: '<div style="width:12px;height:12px;background:#00FF88;border:2px solid #0A0A0A;border-radius:50%;"></div>',
  iconSize: [12, 12], iconAnchor: [6, 6], className: '',
});
const endIcon = L.divIcon({
  html: '<div style="width:12px;height:12px;background:#FF3B30;border:2px solid #0A0A0A;border-radius:50%;"></div>',
  iconSize: [12, 12], iconAnchor: [6, 6], className: '',
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [map, points]);
  return null;
}

export default function Routes() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);       // route ouverte dans le modal
  const [deleteState, setDeleteState] = useState('idle'); // 'idle' | 'confirming' | 'deleting'

  useEffect(() => {
    axios.get(`${API}/api/routes`, { withCredentials: true })
      .then(res => setRoutes(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openModal = (route) => {
    setSelected(route);
    setDeleteState('idle');
  };

  const closeModal = () => {
    setSelected(null);
    setDeleteState('idle');
  };

  const handleDelete = async () => {
    if (deleteState === 'idle') { setDeleteState('confirming'); return; }
    setDeleteState('deleting');
    try {
      await axios.delete(`${API}/api/routes/${selected.route_id}`, { withCredentials: true });
      setRoutes(prev => prev.filter(r => r.route_id !== selected.route_id));
      closeModal();
    } catch (err) {
      console.error('Delete failed', err);
      setDeleteState('idle');
    }
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (secs) => {
    const m = Math.round(secs / 60);
    return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#00A3FF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl" style={{ fontFamily: 'Bebas Neue', color: '#fff' }}>My Routes</h1>
        <button
          onClick={() => navigate('/planner')}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold uppercase tracking-wider border-none cursor-pointer"
          style={{ background: '#00A3FF', color: '#0A0A0A', borderRadius: '4px' }}
        >
          <Plus size={16} weight="bold" /> New
        </button>
      </div>

      {routes.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen size={48} style={{ color: '#27272A' }} className="mx-auto mb-4" />
          <p className="text-sm mb-4" style={{ color: '#A1A1AA' }}>No saved routes yet.</p>
          <button
            onClick={() => navigate('/planner')}
            className="px-6 py-2.5 text-sm font-bold uppercase tracking-wider border-none cursor-pointer"
            style={{ background: '#00A3FF', color: '#0A0A0A', borderRadius: '4px' }}
          >
            Plan your first route
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map(route => (
            <button
              key={route.route_id}
              onClick={() => openModal(route)}
              className="w-full text-left p-4 border transition-colors cursor-pointer"
              style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold truncate" style={{ color: '#fff' }}>{route.name}</p>
                  <p className="text-xs mt-1" style={{ color: '#A1A1AA' }}>{formatDate(route.created_at)}</p>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <p className="text-lg font-black tracking-tighter" style={{ color: '#00A3FF' }}>
                    {route.distance.toFixed(2)} km
                  </p>
                  <p className="text-xs" style={{ color: '#A1A1AA' }}>
                    ~{formatTime(route.estimated_duration)}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modal slide-up */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md mx-auto pb-safe"
            style={{
              background: '#141414',
              borderRadius: '12px 12px 0 0',
              borderTop: '1px solid #27272A',
              animation: 'slideUp 0.25s ease-out',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: '#27272A' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#27272A' }}>
              <p className="text-xl font-black tracking-tight truncate pr-4" style={{ color: '#fff', fontFamily: 'Bebas Neue', fontSize: '1.6rem' }}>
                {selected.name}
              </p>
              <button
                onClick={closeModal}
                className="p-1.5 cursor-pointer flex-shrink-0"
                style={{ background: 'transparent', border: 'none', color: '#A1A1AA' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Map */}
            <div style={{ height: '260px' }}>
              <MapContainer
                center={[selected.points[0].lat, selected.points[0].lng]}
                zoom={14}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                touchZoom={false}
              >
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                <FitBounds points={selected.points} />
                <Polyline
                  positions={selected.points.map(p => [p.lat, p.lng])}
                  color="#00A3FF"
                  weight={4}
                  opacity={0.9}
                />
                <Marker position={[selected.points[0].lat, selected.points[0].lng]} icon={startIcon} />
                {selected.points.length > 1 && (
                  <Marker
                    position={[selected.points[selected.points.length - 1].lat, selected.points[selected.points.length - 1].lng]}
                    icon={endIcon}
                  />
                )}
              </MapContainer>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 px-4 py-4 border-b" style={{ borderColor: '#27272A' }}>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#A1A1AA' }}>Distance</p>
                <p className="text-xl font-black" style={{ color: '#00A3FF' }}>{selected.distance.toFixed(2)}</p>
                <p className="text-xs" style={{ color: '#A1A1AA' }}>km</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#A1A1AA' }}>Est. Time</p>
                <p className="text-xl font-black" style={{ color: '#fff' }}>{formatTime(selected.estimated_duration)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: '#A1A1AA' }}>Waypoints</p>
                <p className="text-xl font-black" style={{ color: '#fff' }}>{selected.points.length}</p>
              </div>
            </div>

            {/* Delete */}
            <div className="px-4 py-4">
              {deleteState === 'idle' && (
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold uppercase tracking-wider cursor-pointer border"
                  style={{ background: 'transparent', borderColor: '#FF3B30', color: '#FF3B30', borderRadius: '4px' }}
                >
                  <Trash size={16} weight="bold" /> Delete Route
                </button>
              )}
              {deleteState === 'confirming' && (
                <div className="space-y-2">
                  <p className="text-sm text-center mb-3" style={{ color: '#A1A1AA' }}>Delete this route? This cannot be undone.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteState('idle')}
                      className="flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wider cursor-pointer border"
                      style={{ background: 'transparent', borderColor: '#27272A', color: '#A1A1AA', borderRadius: '4px' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex-1 px-4 py-3 text-sm font-bold uppercase tracking-wider border-none cursor-pointer"
                      style={{ background: '#FF3B30', color: '#fff', borderRadius: '4px' }}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
              {deleteState === 'deleting' && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <div className="w-4 h-4 border-2 border-[#FF3B30] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm" style={{ color: '#A1A1AA' }}>Deleting...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2 : Vérifier que le fichier est syntaxiquement valide**

```bash
cd frontend && node --input-type=module --eval "import './src/pages/Routes.jsx'" 2>&1 || true
```

(Erreurs d'import sont normales hors contexte Vite — chercher uniquement des erreurs de syntaxe JS)

**Step 3 : Ajouter l'animation slideUp dans index.css**

Dans `frontend/src/index.css`, ajouter après `@keyframes fadeInScale` :

```css
@keyframes slideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
```

---

### Task 2 : Ajouter la route dans App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1 : Importer Routes et ajouter la route**

```jsx
import Routes from './pages/Routes';
```

Ajouter dans `<Routes>` (composant React Router) :

```jsx
<Route path="/routes" element={<ProtectedRoute><Routes /></ProtectedRoute>} />
```

---

### Task 3 : Ajouter "Routes" dans la navigation

**Files:**
- Modify: `frontend/src/components/Header.jsx`

**Step 1 : Ajouter l'import BookOpen**

```jsx
import { Path, Timer, MapPin, User, SignOut, List, BookOpen } from '@phosphor-icons/react';
```

**Step 2 : Ajouter l'entrée dans navLinks**

```js
{ to: '/routes', label: 'Routes', icon: BookOpen },
```

Insérer après l'entrée `/planner` et avant `/tracking`.

---

### Task 4 : Vérifier le build

**Step 1 : Build de production**

```bash
cd frontend && npm run build
```

Expected : `✓ built in X.XXs` sans erreurs (l'avertissement de chunk size est OK).

**Step 2 : Vérifier que la route est accessible en dev**

```bash
cd frontend && npm run dev
```

Naviguer vers `http://localhost:3000/routes` → page "My Routes" doit s'afficher.

---

### Task 5 : Corriger le même bug de géolocalisation silencieuse dans RoutePlanner

**Files:**
- Modify: `frontend/src/pages/RoutePlanner.jsx`

Le même bug que LiveTracking existait dans RoutePlanner (erreur avalée silencieusement).
Appliquer le même correctif.

**Step 1 : Remplacer le useEffect de géolocalisation**

```jsx
const [locating, setLocating] = useState(true);
const [geoError, setGeoError] = useState(null);

useEffect(() => {
  if (!navigator.geolocation) { setLocating(false); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setCenter([pos.coords.latitude, pos.coords.longitude]);
      setLocating(false);
    },
    (err) => {
      setGeoError(err.code);
      setLocating(false);
    },
    { enableHighAccuracy: false, timeout: 10000 }
  );
}, []);
```

**Step 2 : Ajouter l'affichage d'erreur après le spinner**

```jsx
if (geoError) {
  return (
    <div className="flex items-center justify-center py-20 px-4">
      <div className="text-center max-w-sm w-full p-6 border" style={{ background: '#141414', borderColor: '#27272A', borderRadius: '4px' }}>
        <p className="text-sm mb-2" style={{ color: '#A1A1AA' }}>
          {geoError === 1 ? 'Location access denied — the map will start at a default position.' : 'Location unavailable.'}
        </p>
        <button
          onClick={() => { setGeoError(null); setLocating(false); }}
          className="px-6 py-2 text-sm font-bold uppercase tracking-wider border-none cursor-pointer"
          style={{ background: '#00A3FF', color: '#0A0A0A', borderRadius: '4px' }}
        >
          Continue anyway
        </button>
      </div>
    </div>
  );
}
```

> Note : pour le RoutePlanner, on offre un "Continue anyway" plutôt que bloquer l'accès,
> car la carte reste utilisable même sans position initiale.
